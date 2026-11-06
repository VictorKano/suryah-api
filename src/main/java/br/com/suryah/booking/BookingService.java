package br.com.suryah.booking;

import br.com.suryah.classsession.ClassSession;
import br.com.suryah.classsession.ClassSessionRepository;
import br.com.suryah.classsession.ClassStatus;
import br.com.suryah.email.EmailService;
import br.com.suryah.student.Student;
import br.com.suryah.student.StudentRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
public class BookingService {

    /** Students cannot cancel a booking within this many hours of the class start. */
    private static final long CANCELLATION_CUTOFF_HOURS = 12;

    private static final ZoneId STUDIO_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter
            .ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
            .withLocale(new Locale("pt", "BR"))
            .withZone(STUDIO_ZONE);

    private final BookingRepository bookingRepository;
    private final ClassSessionRepository classSessionRepository;
    private final StudentRepository studentRepository;
    private final EmailService emailService;

    public BookingService(BookingRepository bookingRepository,
                          ClassSessionRepository classSessionRepository,
                          StudentRepository studentRepository,
                          EmailService emailService) {
        this.bookingRepository = bookingRepository;
        this.classSessionRepository = classSessionRepository;
        this.studentRepository = studentRepository;
        this.emailService = emailService;
    }

    private BookingSnapshot toSnapshot(Booking booking) {
        return new BookingSnapshot(
                booking.getStudent().getName(),
                booking.getStudent().getEmail(),
                booking.getClassSession().getClassType().getName(),
                DATE_FMT.format(booking.getClassSession().getStartDateTime()),
                booking.getClassSession().getDurationMin()
        );
    }

    /**
     * Books a spot in the given class session for the given student.
     * Uses a pessimistic write lock to prevent overselling under concurrent load.
     * Creates a CONFIRMED booking if there is space, or a WAITLIST booking if the
     * session is at capacity.
     *
     * @param sessionId the class session to book
     * @param studentId the student making the booking
     * @return the created Booking
     * @throws EntityNotFoundException  if the session or student does not exist
     * @throws IllegalStateException    if the session is not ACTIVE or the student
     *                                  already has a non-cancelled booking for it
     */
    @Transactional
    public Booking book(Long sessionId, Long studentId) {
        // Acquire pessimistic write lock on the session row
        ClassSession session = classSessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Class session not found: " + sessionId));

        if (session.getStatus() != ClassStatus.ACTIVE) {
            throw new IllegalStateException("Cannot book a session that is not ACTIVE.");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found: " + studentId));

        // Reject duplicate (existing CONFIRMED or WAITLIST booking)
        bookingRepository.findByClassSessionIdAndStudentId(sessionId, studentId)
                .ifPresent(existing -> {
                    if (existing.getStatus() != BookingStatus.CANCELLED) {
                        throw new IllegalStateException(
                                "Student already has a " + existing.getStatus() + " booking for this session.");
                    }
                });

        long confirmedCount = bookingRepository.countByClassSessionIdAndStatus(sessionId, BookingStatus.CONFIRMED);
        BookingStatus newStatus = confirmedCount < session.getCapacity()
                ? BookingStatus.CONFIRMED
                : BookingStatus.WAITLIST;

        // If a CANCELLED booking already exists for this student+session, reactivate
        // it rather than inserting a new row (which would violate the unique constraint).
        Booking booking = bookingRepository
                .findByClassSessionIdAndStudentId(sessionId, studentId)
                .orElseGet(() -> {
                    Booking b = new Booking();
                    b.setClassSession(session);
                    b.setStudent(student);
                    return b;
                });

        booking.setStatus(newStatus);
        Booking saved = bookingRepository.save(booking);

        // Build snapshot while session is open, then fire async email
        BookingSnapshot snap = toSnapshot(saved);
        if (newStatus == BookingStatus.CONFIRMED) {
            emailService.sendBookingConfirmed(snap);
        } else {
            emailService.sendWaitlistConfirmed(snap);
        }

        return saved;
    }

    /**
     * Cancels the given booking for the given student.
     * Uses a pessimistic write lock on the session to safely promote the oldest
     * waitlisted student to CONFIRMED when a confirmed spot is freed up.
     *
     * @param bookingId the booking to cancel
     * @param studentId the student who owns the booking
     * @return the cancelled Booking
     * @throws EntityNotFoundException  if the booking does not exist
     * @throws IllegalStateException    if the booking does not belong to the student
     *                                  or is already cancelled
     */
    @Transactional
    public Booking cancel(Long bookingId, Long studentId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingId));

        if (!booking.getStudent().getId().equals(studentId)) {
            throw new EntityNotFoundException("Booking not found: " + bookingId);
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Booking is already cancelled.");
        }

        // Enforce cancellation cutoff: students cannot cancel within 12 hours of class start
        OffsetDateTime sessionStart = booking.getClassSession().getStartDateTime();
        OffsetDateTime cutoff = sessionStart.minus(CANCELLATION_CUTOFF_HOURS, ChronoUnit.HOURS);
        if (OffsetDateTime.now(ZoneOffset.UTC).isAfter(cutoff)) {
            throw new IllegalStateException(
                    "N\u00e3o \u00e9 poss\u00edvel cancelar com menos de "
                    + CANCELLATION_CUTOFF_HOURS + " horas de anteced\u00eancia.");
        }

        // Acquire pessimistic write lock on the session before mutating booking state
        classSessionRepository.findByIdForUpdate(booking.getClassSession().getId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Class session not found: " + booking.getClassSession().getId()));

        BookingStatus previousStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        // Promote the oldest waitlisted student when a confirmed spot is freed
        if (previousStatus == BookingStatus.CONFIRMED) {
            bookingRepository
                    .findFirstByClassSessionIdAndStatusOrderByCreatedAtAsc(
                            booking.getClassSession().getId(), BookingStatus.WAITLIST)
                    .ifPresent(waitlisted -> {
                        waitlisted.setStatus(BookingStatus.CONFIRMED);
                        bookingRepository.save(waitlisted);
                        emailService.sendWaitlistPromoted(toSnapshot(waitlisted));
                    });
        }

        return booking;
    }
}
