package br.com.suryah.booking;

import br.com.suryah.classsession.ClassSession;
import br.com.suryah.classsession.ClassSessionRepository;
import br.com.suryah.classtype.ClassType;
import br.com.suryah.classtype.ClassTypeRepository;
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

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class BookingFlowIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired BookingRepository bookingRepository;
    @Autowired ClassSessionRepository classSessionRepository;
    @Autowired ClassTypeRepository classTypeRepository;
    @Autowired StudentRepository studentRepository;

    /** Token obtained from the seeded ADMIN account (inserted by Flyway V3 migration). */
    private String adminToken;

    /** Tokens for the three student accounts registered in @BeforeEach. */
    private String anaToken;
    private String brunoToken;
    private String carlaToken;

    @BeforeEach
    void setUp() throws Exception {
        // --- Clean slate (order matters due to FK constraints) ---
        bookingRepository.deleteAll();
        classSessionRepository.deleteAll();

        // Delete only STUDENT-role accounts so the seeded ADMIN is preserved
        studentRepository.findAll().stream()
                .filter(s -> s.getRole() == Role.STUDENT)
                .forEach(s -> studentRepository.delete(s));

        // --- Obtain an admin token (admin was seeded by the V3 Flyway migration) ---
        adminToken = adminLogin();

        // --- Register three students ---
        anaToken   = registerAndLogin("Ana Silva",    "ana@test.com",   "11900000001");
        brunoToken = registerAndLogin("Bruno Costa",  "bruno@test.com", "11900000002");
        carlaToken = registerAndLogin("Carla Dias",   "carla@test.com", "11900000003");
    }

    // -------------------------------------------------------------------------
    // Test 1: Normal booking flow — CONFIRMED → capacity full → WAITLIST
    // -------------------------------------------------------------------------

    @Test
    void bookingFlow_confirmedThenWaitlist() throws Exception {
        // Create a class type (admin)
        Long classTypeId = createClassType("Yoga Flow");

        // Create a session with capacity = 2 via repository (no admin POST endpoint exists)
        ClassSession session = buildSession(classTypeId, 2);
        Long sessionId = session.getId();

        // Ana books → CONFIRMED (1 of 2)
        String anaBookingJson = mockMvc.perform(post("/api/class-sessions/{id}/bookings", sessionId)
                        .header("Authorization", "Bearer " + anaToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        BookingResponse anaBooking = objectMapper.readValue(anaBookingJson, BookingResponse.class);
        assertThat(anaBooking.status()).isEqualTo(BookingStatus.CONFIRMED);

        // Bruno books → CONFIRMED (2 of 2, now at capacity)
        String brunoBookingJson = mockMvc.perform(post("/api/class-sessions/{id}/bookings", sessionId)
                        .header("Authorization", "Bearer " + brunoToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        BookingResponse brunoBooking = objectMapper.readValue(brunoBookingJson, BookingResponse.class);
        assertThat(brunoBooking.status()).isEqualTo(BookingStatus.CONFIRMED);

        // Carla books → WAITLIST (capacity exceeded)
        String carlaBookingJson = mockMvc.perform(post("/api/class-sessions/{id}/bookings", sessionId)
                        .header("Authorization", "Bearer " + carlaToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        BookingResponse carlaBooking = objectMapper.readValue(carlaBookingJson, BookingResponse.class);
        assertThat(carlaBooking.status()).isEqualTo(BookingStatus.WAITLIST);

        // Verify DB: 2 CONFIRMED, 1 WAITLIST — capacity never exceeded
        long confirmed = bookingRepository.countByClassSessionIdAndStatus(sessionId, BookingStatus.CONFIRMED);
        long waitlist  = bookingRepository.countByClassSessionIdAndStatus(sessionId, BookingStatus.WAITLIST);
        assertThat(confirmed).isEqualTo(2);
        assertThat(waitlist).isEqualTo(1);
        assertThat(confirmed).isLessThanOrEqualTo(session.getCapacity());
    }

    // -------------------------------------------------------------------------
    // Test 2: Cancellation promotes oldest waitlist entry to CONFIRMED
    // -------------------------------------------------------------------------

    @Test
    void cancellation_promotesOldestWaitlistToConfirmed() throws Exception {
        // Create a session with capacity = 1
        Long classTypeId = createClassType("Pilates Mat");
        ClassSession session = buildSession(classTypeId, 1);
        Long sessionId = session.getId();

        // Ana books → CONFIRMED (fills the only spot)
        String anaBookingJson = mockMvc.perform(post("/api/class-sessions/{id}/bookings", sessionId)
                        .header("Authorization", "Bearer " + anaToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        BookingResponse anaBooking = objectMapper.readValue(anaBookingJson, BookingResponse.class);
        assertThat(anaBooking.status()).isEqualTo(BookingStatus.CONFIRMED);

        // Bruno books → WAITLIST
        String brunoBookingJson = mockMvc.perform(post("/api/class-sessions/{id}/bookings", sessionId)
                        .header("Authorization", "Bearer " + brunoToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        BookingResponse brunoBooking = objectMapper.readValue(brunoBookingJson, BookingResponse.class);
        assertThat(brunoBooking.status()).isEqualTo(BookingStatus.WAITLIST);

        // Ana cancels her CONFIRMED booking
        mockMvc.perform(delete("/api/bookings/{id}", anaBooking.id())
                        .header("Authorization", "Bearer " + anaToken))
                .andExpect(status().isNoContent());

        // Bruno should now be promoted to CONFIRMED
        Booking brunoUpdated = bookingRepository.findById(brunoBooking.id()).orElseThrow();
        assertThat(brunoUpdated.getStatus()).isEqualTo(BookingStatus.CONFIRMED);

        // Ana's booking should be CANCELLED
        Booking anaUpdated = bookingRepository.findById(anaBooking.id()).orElseThrow();
        assertThat(anaUpdated.getStatus()).isEqualTo(BookingStatus.CANCELLED);

        // Capacity never exceeded: still only 1 CONFIRMED after promotion
        long confirmed = bookingRepository.countByClassSessionIdAndStatus(sessionId, BookingStatus.CONFIRMED);
        assertThat(confirmed).isEqualTo(1);
        assertThat(confirmed).isLessThanOrEqualTo(session.getCapacity());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Logs in with the seeded admin credentials and returns the JWT. */
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
     * Registers a new student account and immediately logs in, returning the JWT.
     * Uses PlanType.PRIVATE so no extra plan validation is triggered.
     */
    private String registerAndLogin(String name, String email, String phone) throws Exception {
        String registerBody = objectMapper.writeValueAsString(Map.of(
                "name",     name,
                "email",    email,
                "phone",    phone,
                "age",      25,
                "password", "password123",
                "planType", "PRIVATE"
        ));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isCreated());

        String loginBody = objectMapper.writeValueAsString(Map.of(
                "email",    email,
                "password", "password123"
        ));

        String loginJson = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(loginJson).get("token").asText();
    }

    /**
     * Creates a class type via the admin API and returns its ID.
     * If a class type with this name already exists (from a prior migration seed),
     * fetch the existing one instead.
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
                .andReturn().getResponse().getContentAsString();

        // If 409 (name conflict), look it up from the DB directly
        if (responseJson.contains("already exists") || responseJson.isEmpty()) {
            return classTypeRepository.findAllByOrderByName().stream()
                    .filter(ct -> ct.getName().equals(name))
                    .findFirst()
                    .map(ClassType::getId)
                    .orElseThrow(() -> new IllegalStateException("Class type not found: " + name));
        }

        return objectMapper.readTree(responseJson).get("id").asLong();
    }

    /**
     * Builds a ClassSession directly via the repository (no HTTP endpoint for session creation exists).
     * The session starts 1 hour from now, so the findUpcoming query includes it.
     */
    private ClassSession buildSession(Long classTypeId, int capacity) {
        ClassType classType = classTypeRepository.findById(classTypeId)
                .orElseThrow(() -> new IllegalArgumentException("ClassType not found: " + classTypeId));

        ClassSession session = new ClassSession();
        session.setClassType(classType);
        session.setStartDateTime(OffsetDateTime.now(ZoneOffset.UTC).plusHours(1));
        session.setDurationMin(60);
        session.setCapacity(capacity);
        return classSessionRepository.save(session);
    }
}
