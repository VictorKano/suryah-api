package br.com.suryah.booking;

import br.com.suryah.classsession.ClassSession;
import br.com.suryah.classsession.ClassSessionRepository;
import br.com.suryah.classsession.ClassStatus;
import br.com.suryah.student.Student;
import br.com.suryah.student.StudentRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ClassSessionRepository classSessionRepository;
    private final StudentRepository studentRepository;

    public BookingService(BookingRepository bookingRepository,
                          ClassSessionRepository classSessionRepository,
                          StudentRepository studentRepository) {
        this.bookingRepository = bookingRepository;
        this.classSessionRepository = classSessionRepository;
        this.studentRepository = studentRepository;
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

        Booking booking = new Booking();
        booking.setClassSession(session);
        booking.setStudent(student);
        booking.setStatus(newStatus);

        return bookingRepository.save(booking);
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
            throw new IllegalStateException("Booking does not belong to this student.");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Booking is already cancelled.");
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
                    });
        }

        return booking;
    }
}
