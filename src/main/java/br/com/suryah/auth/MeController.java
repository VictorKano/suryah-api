package br.com.suryah.auth;

import br.com.suryah.booking.BookingRepository;
import br.com.suryah.plan.BillingType;
import br.com.suryah.plan.Plan;
import br.com.suryah.student.Student;
import br.com.suryah.student.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private static final ZoneId STUDIO_ZONE = ZoneId.of("America/Sao_Paulo");

    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final BookingRepository bookingRepository;

    public MeController(StudentRepository studentRepository,
                        PasswordEncoder passwordEncoder,
                        BookingRepository bookingRepository) {
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.bookingRepository = bookingRepository;
    }

    /** Returns the authenticated user's profile. */
    @GetMapping
    @Transactional(readOnly = true)
    public StudentResponse me(Authentication authentication) {
        Student student = resolve(authentication);
        return toResponse(student);
    }

    /** Updates the authenticated user's profile. */
    @PutMapping
    @Transactional
    public StudentResponse update(Authentication authentication,
                                  @RequestBody UpdateProfileRequest request) {
        Student student = resolve(authentication);

        // Name
        if (request.name() != null && !request.name().isBlank()) {
            student.setName(request.name());
        }

        // Email — check uniqueness if changing
        if (request.email() != null && !request.email().isBlank()
                && !request.email().equalsIgnoreCase(student.getEmail())) {
            if (studentRepository.existsByEmail(request.email())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Este e-mail j\u00e1 est\u00e1 cadastrado.");
            }
            student.setEmail(request.email());
        }

        if (request.phone() != null) {
            student.setPhone(request.phone());
        }

        if (request.age() != null) {
            student.setAge(request.age());
        }

        if (request.planType() != null) {
            student.setPlanType(request.planType());
        }

        // Password — only change if newPassword is provided
        if (request.newPassword() != null && !request.newPassword().isBlank()) {
            if (request.currentPassword() == null || request.currentPassword().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Informe a senha atual para alter\u00e1-la.");
            }
            if (!passwordEncoder.matches(request.currentPassword(), student.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Senha atual incorreta.");
            }
            student.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        }

        Student saved = studentRepository.save(student);
        return toResponse(saved);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /**
     * GET /api/me/weekly-usage?weekOf=2026-11-18
     * Returns how many confirmed bookings the student has in the requested week vs their plan limit.
     * weekOf (optional ISO date) — any date within the target week; defaults to today.
     * Returns null values when the student has a PER_SESSION plan (no limit applies).
     */
    @GetMapping("/weekly-usage")
    @Transactional(readOnly = true)
    public WeeklyUsageResponse weeklyUsage(
            Authentication authentication,
            @RequestParam(required = false) String weekOf) {
        Student student = resolve(authentication);
        Plan plan = student.getPlan();

        if (plan == null || plan.getBillingType() != BillingType.SUBSCRIPTION) {
            return new WeeklyUsageResponse(null, null, null);
        }

        Integer limit = plan.getWeeklySessionLimit();

        // Determine the Mon–Sun window for the requested week (or current week if not specified)
        LocalDate anchor = (weekOf != null && !weekOf.isBlank())
                ? LocalDate.parse(weekOf)
                : LocalDate.now(STUDIO_ZONE);
        LocalDate monday = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        OffsetDateTime weekStart = monday.atStartOfDay(STUDIO_ZONE).toOffsetDateTime();
        OffsetDateTime weekEnd   = monday.plusDays(7).atStartOfDay(STUDIO_ZONE).toOffsetDateTime();

        long used = bookingRepository.countConfirmedInWeek(student.getId(), weekStart, weekEnd);
        int remaining = limit != null ? Math.max(0, limit - (int) used) : 0;

        return new WeeklyUsageResponse((int) used, limit, remaining);
    }

    public record WeeklyUsageResponse(Integer used, Integer limit, Integer remaining) {}

    private Student resolve(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    private StudentResponse toResponse(Student student) {
        return new StudentResponse(
                student.getId(),
                student.getName(),
                student.getEmail(),
                student.getPhone(),
                student.getAge(),
                student.getPlanType(),
                student.getRole()
        );
    }
}
