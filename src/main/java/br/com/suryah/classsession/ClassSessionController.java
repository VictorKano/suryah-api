package br.com.suryah.classsession;

import br.com.suryah.booking.BookingRepository;
import br.com.suryah.booking.BookingStatus;
import br.com.suryah.booking.BookingSnapshot;
import br.com.suryah.classtype.ClassType;
import br.com.suryah.classtype.ClassTypeRepository;
import br.com.suryah.classsession.SessionSnapshot;
import br.com.suryah.email.EmailService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/class-sessions")
public class ClassSessionController {

    private static final ZoneId STUDIO_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter
            .ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
            .withLocale(new Locale("pt", "BR"))
            .withZone(STUDIO_ZONE);

    private final ClassSessionRepository classSessionRepository;
    private final BookingRepository bookingRepository;
    private final EmailService emailService;
    private final ClassTypeRepository classTypeRepository;

    public ClassSessionController(ClassSessionRepository classSessionRepository,
                                  BookingRepository bookingRepository,
                                  EmailService emailService,
                                  ClassTypeRepository classTypeRepository) {
        this.classSessionRepository = classSessionRepository;
        this.bookingRepository = bookingRepository;
        this.emailService = emailService;
        this.classTypeRepository = classTypeRepository;
    }

    /** Creates an ad-hoc (one-off) session with no recurring class parent. */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ClassSessionResponse create(@Valid @RequestBody CreateSessionRequest request) {
        ClassType classType = classTypeRepository.findById(request.classTypeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Class type not found: " + request.classTypeId()));

        ClassSession session = new ClassSession();
        session.setClassType(classType);
        session.setStartDateTime(request.startDateTime());
        session.setDurationMin(request.durationMin());
        session.setCapacity(request.capacity());
        session.setStatus(ClassStatus.ACTIVE);
        // recurringClass is left null — this is an ad-hoc session

        ClassSession saved = classSessionRepository.save(session);
        return toResponse(saved, null);
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ClassSessionResponse> listUpcoming(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            Authentication authentication) {

        OffsetDateTime effectiveFrom = from != null ? from : OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime effectiveTo = to != null ? to : effectiveFrom.plusDays(30);

        Long studentId = resolveStudentId(authentication);

        return classSessionRepository.findUpcoming(effectiveFrom, effectiveTo).stream()
                .map(session -> toResponse(session, studentId))
                .toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ClassSessionResponse getById(@PathVariable Long id, Authentication authentication) {
        ClassSession session = classSessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class session not found"));

        Long studentId = resolveStudentId(authentication);
        return toResponse(session, studentId);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ClassSessionResponse update(@PathVariable Long id,
                                       @RequestBody ClassSessionUpdateRequest request,
                                       Authentication authentication) {
        ClassSession session = classSessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class session not found"));

        if (request.capacity() != null) {
            if (request.capacity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Capacity must be greater than 0");
            }
            session.setCapacity(request.capacity());
        }

        if (request.status() != null) {
            boolean wasNotCancelled = session.getStatus() != ClassStatus.CANCELLED;
            session.setStatus(request.status());
            // When cancelling a session, cancel all active bookings so students
            // are notified that the class is no longer happening.
            if (request.status() == ClassStatus.CANCELLED && wasNotCancelled) {
                var activeBookings = bookingRepository.findByClassSessionIdAndStatusIn(
                        session.getId(), List.of(BookingStatus.CONFIRMED, BookingStatus.WAITLIST));
                activeBookings.forEach(b -> b.setStatus(BookingStatus.CANCELLED));
                bookingRepository.saveAll(activeBookings);
                // Build snapshots while session is open, then fire async emails
                String formattedDateTime = DATE_FMT.format(session.getStartDateTime());
                SessionSnapshot sessionSnap = new SessionSnapshot(
                        session.getClassType().getName(), formattedDateTime);
                List<BookingSnapshot> bookingSnaps = activeBookings.stream()
                        .map(b -> new BookingSnapshot(
                                b.getStudent().getName(),
                                b.getStudent().getEmail(),
                                session.getClassType().getName(),
                                formattedDateTime,
                                session.getDurationMin()))
                        .toList();
                emailService.sendSessionCancelled(sessionSnap, bookingSnaps);
            }
        }

        ClassSession saved = classSessionRepository.save(session);
        return toResponse(saved, null);
    }

    // --- helpers ---

    private Long resolveStudentId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Long id) {
            return id;
        }
        return null;
    }

    private ClassSessionResponse toResponse(ClassSession session, Long studentId) {
        long confirmedCount = bookingRepository.countByClassSessionIdAndStatus(
                session.getId(), BookingStatus.CONFIRMED);
        long availableSpots = Math.max(0, session.getCapacity() - confirmedCount);

        String myBookingStatus = null;
        if (studentId != null) {
            myBookingStatus = bookingRepository
                    .findByClassSessionIdAndStudentId(session.getId(), studentId)
                    .filter(b -> b.getStatus() != BookingStatus.CANCELLED)
                    .map(b -> b.getStatus().name())
                    .orElse(null);
        }

        return new ClassSessionResponse(
                session.getId(),
                session.getClassType().getName(),
                session.getStartDateTime(),
                session.getDurationMin(),
                session.getCapacity(),
                confirmedCount,
                availableSpots,
                myBookingStatus
        );
    }
}
