package br.com.suryah.recurringclass;

import br.com.suryah.booking.Booking;
import br.com.suryah.booking.BookingRepository;
import br.com.suryah.booking.BookingStatus;
import br.com.suryah.classsession.ClassSession;
import br.com.suryah.classsession.ClassSessionRepository;
import br.com.suryah.classtype.ClassTypeRepository;
import br.com.suryah.fixedenrollment.FixedEnrollmentRepository;
import br.com.suryah.student.Role;
import br.com.suryah.student.StudentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test for the session generation flow (Task 11.3).
 *
 * Covers:
 * - Sessions created on correct days (one per matching day-of-week in range)
 * - Fixed-enrolled students auto-booked as CONFIRMED on each generated session
 * - Idempotency: calling generate twice for the same range produces no duplicates
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class SessionGenerationIntegrationTest {

    /**
     * Two-week test range: 2026-11-02 (Monday) → 2026-11-15 (Sunday).
     * Contains exactly 2 Mondays: 2026-11-02 and 2026-11-09.
     */
    private static final LocalDate FROM = LocalDate.of(2026, 11, 2);
    private static final LocalDate TO   = LocalDate.of(2026, 11, 15);

    /** Expected number of Mondays in [FROM, TO] */
    private static final int EXPECTED_MONDAY_COUNT = 2;

    private static final ZoneId STUDIO_ZONE = ZoneId.of("America/Sao_Paulo");

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired BookingRepository bookingRepository;
    @Autowired ClassSessionRepository classSessionRepository;
    @Autowired ClassTypeRepository classTypeRepository;
    @Autowired StudentRepository studentRepository;
    @Autowired RecurringClassRepository recurringClassRepository;
    @Autowired FixedEnrollmentRepository fixedEnrollmentRepository;

    private String adminToken;
    private Long anaStudentId;
    private Long brunoStudentId;

    @BeforeEach
    void setUp() throws Exception {
        // Clean slate — order matters because of FK constraints
        bookingRepository.deleteAll();
        classSessionRepository.deleteAll();
        fixedEnrollmentRepository.deleteAll();
        recurringClassRepository.deleteAll();

        // Delete only STUDENT-role accounts so the seeded ADMIN is preserved
        studentRepository.findAll().stream()
                .filter(s -> s.getRole() == Role.STUDENT)
                .forEach(studentRepository::delete);

        adminToken = adminLogin();

        anaStudentId   = registerStudent("Ana Lima",    "ana.gen@test.com",   "11900000010");
        brunoStudentId = registerStudent("Bruno Melo",  "bruno.gen@test.com", "11900000011");
    }

    // -------------------------------------------------------------------------
    // Test 1: Sessions created on the correct days, fixed students auto-booked
    // -------------------------------------------------------------------------

    @Test
    void sessionGeneration_createsSessionsOnCorrectDaysAndAutoBooksFixedStudents() throws Exception {
        // Create a class type and a Monday 07:00 recurring class with capacity 5
        Long classTypeId     = createClassType("Hatha Yoga");
        Long recurringClassId = createRecurringClass(DayOfWeek.MONDAY, "07:00", 60, classTypeId, 5);

        // Enroll both students as fixed
        enrollFixed(recurringClassId, anaStudentId);
        enrollFixed(recurringClassId, brunoStudentId);

        // Generate for the 2-week range
        GenerationSummary summary = callGenerate(FROM, TO);

        // Expect 2 sessions (one per Monday in [FROM, TO])
        assertThat(summary.sessionsCreated()).isEqualTo(EXPECTED_MONDAY_COUNT);
        assertThat(summary.sessionsSkipped()).isEqualTo(0);
        // 2 fixed students × 2 sessions = 4 bookings
        assertThat(summary.fixedBookingsCreated()).isEqualTo(2 * EXPECTED_MONDAY_COUNT);

        // Verify that sessions exist on the correct calendar dates (Mondays only)
        List<ClassSession> sessions = classSessionRepository.findAll().stream()
                .filter(s -> s.getRecurringClass() != null
                          && s.getRecurringClass().getId().equals(recurringClassId))
                .toList();

        assertThat(sessions).hasSize(EXPECTED_MONDAY_COUNT);

        for (ClassSession session : sessions) {
            // Convert back to the studio's local date to assert the day-of-week
            LocalDate sessionDate = session.getStartDateTime()
                    .atZoneSameInstant(STUDIO_ZONE)
                    .toLocalDate();
            assertThat(sessionDate.getDayOfWeek())
                    .as("Session %s should be on a Monday", session.getStartDateTime())
                    .isEqualTo(DayOfWeek.MONDAY);
            assertThat(sessionDate).isBetween(FROM, TO);
        }

        // Verify every generated session has a CONFIRMED booking for both fixed students
        for (ClassSession session : sessions) {
            long confirmed = bookingRepository.countByClassSessionIdAndStatus(
                    session.getId(), BookingStatus.CONFIRMED);
            assertThat(confirmed)
                    .as("Session %s should have 2 confirmed bookings", session.getId())
                    .isEqualTo(2);

            Booking anaBooking = bookingRepository
                    .findByClassSessionIdAndStudentId(session.getId(), anaStudentId)
                    .orElseThrow(() -> new AssertionError("Ana should have a booking for session " + session.getId()));
            assertThat(anaBooking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);

            Booking brunoBooking = bookingRepository
                    .findByClassSessionIdAndStudentId(session.getId(), brunoStudentId)
                    .orElseThrow(() -> new AssertionError("Bruno should have a booking for session " + session.getId()));
            assertThat(brunoBooking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        }
    }

    // -------------------------------------------------------------------------
    // Test 2: Idempotency — calling generate twice produces no duplicates
    // -------------------------------------------------------------------------

    @Test
    void sessionGeneration_isIdempotent() throws Exception {
        Long classTypeId      = createClassType("Yin Yoga");
        Long recurringClassId = createRecurringClass(DayOfWeek.MONDAY, "09:00", 45, classTypeId, 10);
        enrollFixed(recurringClassId, anaStudentId);

        // First call
        GenerationSummary first = callGenerate(FROM, TO);
        assertThat(first.sessionsCreated()).isEqualTo(EXPECTED_MONDAY_COUNT);
        assertThat(first.sessionsSkipped()).isEqualTo(0);
        assertThat(first.fixedBookingsCreated()).isEqualTo(EXPECTED_MONDAY_COUNT); // 1 student × 2 sessions

        long sessionCountAfterFirst = classSessionRepository.count();
        long bookingCountAfterFirst = bookingRepository.count();

        // Second call — same range
        GenerationSummary second = callGenerate(FROM, TO);
        assertThat(second.sessionsCreated()).isEqualTo(0);
        assertThat(second.sessionsSkipped()).isEqualTo(EXPECTED_MONDAY_COUNT);
        assertThat(second.fixedBookingsCreated()).isEqualTo(0);

        // Counts must not have changed
        assertThat(classSessionRepository.count())
                .as("No new sessions should be created on second generate call")
                .isEqualTo(sessionCountAfterFirst);
        assertThat(bookingRepository.count())
                .as("No new bookings should be created on second generate call")
                .isEqualTo(bookingCountAfterFirst);
    }

    // -------------------------------------------------------------------------
    // Test 3: Fixed students exceeding capacity overflow to WAITLIST
    // -------------------------------------------------------------------------

    @Test
    void sessionGeneration_overflowFixedEnrollments_goToWaitlist() throws Exception {
        // Capacity 1, but 2 fixed students → 1 CONFIRMED + 1 WAITLIST per session
        Long classTypeId      = createClassType("Vinyasa Flow");
        Long recurringClassId = createRecurringClass(DayOfWeek.MONDAY, "18:00", 60, classTypeId, 1);
        enrollFixed(recurringClassId, anaStudentId);
        enrollFixed(recurringClassId, brunoStudentId);

        GenerationSummary summary = callGenerate(FROM, TO);
        assertThat(summary.sessionsCreated()).isEqualTo(EXPECTED_MONDAY_COUNT);
        assertThat(summary.fixedBookingsCreated()).isEqualTo(2 * EXPECTED_MONDAY_COUNT);

        List<ClassSession> sessions = classSessionRepository.findAll().stream()
                .filter(s -> s.getRecurringClass() != null
                          && s.getRecurringClass().getId().equals(recurringClassId))
                .toList();

        for (ClassSession session : sessions) {
            long confirmed = bookingRepository.countByClassSessionIdAndStatus(
                    session.getId(), BookingStatus.CONFIRMED);
            long waitlist  = bookingRepository.countByClassSessionIdAndStatus(
                    session.getId(), BookingStatus.WAITLIST);
            assertThat(confirmed)
                    .as("Only 1 confirmed booking allowed (capacity=1)")
                    .isEqualTo(1);
            assertThat(waitlist)
                    .as("Overflow goes to waitlist")
                    .isEqualTo(1);
            // Capacity never exceeded
            assertThat(confirmed).isLessThanOrEqualTo(session.getCapacity());
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private String adminLogin() throws Exception {
        String adminEmail    = System.getenv().getOrDefault("ADMIN_EMAIL",    "admin@suryah.com");
        String adminPassword = System.getenv().getOrDefault("ADMIN_PASSWORD", "admin123");

        String body = objectMapper.writeValueAsString(Map.of(
                "email",    adminEmail,
                "password", adminPassword
        ));

        String responseJson = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(responseJson).get("token").asText();
    }

    /**
     * Registers a student and returns their database ID (extracted from the response body).
     */
    private Long registerStudent(String name, String email, String phone) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "name",     name,
                "email",    email,
                "phone",    phone,
                "age",      28,
                "password", "password123",
                "planType", "PRIVATE"
        ));

        String responseJson = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(responseJson).get("id").asLong();
    }

    /**
     * Creates a class type via the admin API and returns its ID.
     */
    private Long createClassType(String name) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "name",        name,
                "description", name + " class"
        ));

        String responseJson = mockMvc.perform(post("/api/class-types")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(responseJson).get("id").asLong();
    }

    /**
     * Creates a recurring class via the admin API and returns its ID.
     */
    private Long createRecurringClass(DayOfWeek dayOfWeek, String startTime,
                                      int durationMin, Long classTypeId, int capacity) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "dayOfWeek",   dayOfWeek.name(),
                "startTime",   startTime,
                "durationMin", durationMin,
                "classTypeId", classTypeId,
                "capacity",    capacity
        ));

        String responseJson = mockMvc.perform(post("/api/recurring-classes")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(responseJson).get("id").asLong();
    }

    /**
     * Enrolls a student as a fixed participant in a recurring class via the admin API.
     */
    private void enrollFixed(Long recurringClassId, Long studentId) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("studentId", studentId));

        mockMvc.perform(post("/api/recurring-classes/{id}/fixed-enrollments", recurringClassId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    /**
     * Calls POST /api/recurring-classes/generate and deserialises the {@link GenerationSummary}.
     */
    private GenerationSummary callGenerate(LocalDate from, LocalDate to) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "from", from.toString(),
                "to",   to.toString()
        ));

        String responseJson = mockMvc.perform(post("/api/recurring-classes/generate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readValue(responseJson, GenerationSummary.class);
    }
}
