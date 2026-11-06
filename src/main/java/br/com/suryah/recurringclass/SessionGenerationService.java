package br.com.suryah.recurringclass;

import br.com.suryah.booking.Booking;
import br.com.suryah.booking.BookingRepository;
import br.com.suryah.booking.BookingStatus;
import br.com.suryah.classsession.ClassSession;
import br.com.suryah.classsession.ClassSessionRepository;
import br.com.suryah.classsession.ClassStatus;
import br.com.suryah.fixedenrollment.FixedEnrollment;
import br.com.suryah.fixedenrollment.FixedEnrollmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Generates {@link ClassSession} instances from active {@link RecurringClass} definitions
 * for a requested date range, and auto-books fixed enrollments.
 */
@Service
public class SessionGenerationService {

    private static final Logger log = LoggerFactory.getLogger(SessionGenerationService.class);
    private static final ZoneId STUDIO_ZONE = ZoneId.of("America/Sao_Paulo");

    private final RecurringClassRepository recurringClassRepository;
    private final ClassSessionRepository classSessionRepository;
    private final FixedEnrollmentRepository fixedEnrollmentRepository;
    private final BookingRepository bookingRepository;

    public SessionGenerationService(RecurringClassRepository recurringClassRepository,
                                    ClassSessionRepository classSessionRepository,
                                    FixedEnrollmentRepository fixedEnrollmentRepository,
                                    BookingRepository bookingRepository) {
        this.recurringClassRepository = recurringClassRepository;
        this.classSessionRepository = classSessionRepository;
        this.fixedEnrollmentRepository = fixedEnrollmentRepository;
        this.bookingRepository = bookingRepository;
    }

    /**
     * For each active recurring class, iterates every date in [from, to] (inclusive)
     * that matches the recurring class's day of week. For each matching date:
     * <ol>
     *   <li>Skips if a session already exists for that (recurringClassId, startDateTime) pair
     *       (idempotent — safe to call multiple times for the same range).</li>
     *   <li>Creates a {@link ClassSession} inheriting classType, durationMin, and capacity.</li>
     *   <li>Creates {@link Booking} entries for each active fixed enrollment: CONFIRMED up to
     *       capacity, WAITLIST for any overflow.</li>
     * </ol>
     *
     * @param from start of date range (inclusive), in studio local time
     * @param to   end of date range (inclusive), in studio local time
     * @return a {@link GenerationSummary} with counts of created sessions, skipped sessions,
     *         and fixed bookings created
     */
    @Transactional
    public GenerationSummary generateSessions(LocalDate from, LocalDate to) {
        int sessionsCreated = 0;
        int sessionsSkipped = 0;
        int fixedBookingsCreated = 0;

        List<RecurringClass> recurringClasses = recurringClassRepository.findByActiveTrue();

        for (RecurringClass rc : recurringClasses) {
            // Walk every date in [from, to] looking for matching day-of-week
            for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
                if (date.getDayOfWeek() != rc.getDayOfWeek()) {
                    continue;
                }

                // Compute the session start as an OffsetDateTime in the studio timezone
                OffsetDateTime startDateTime = date.atTime(rc.getStartTime())
                        .atZone(STUDIO_ZONE)
                        .toOffsetDateTime();

                // Idempotency: skip if an ACTIVE session already exists for this slot.
                // CANCELLED sessions are ignored so the slot can be regenerated.
                if (classSessionRepository.existsByRecurringClassIdAndStartDateTimeAndStatus(
                        rc.getId(), startDateTime, ClassStatus.ACTIVE)) {
                    sessionsSkipped++;
                    continue;
                }

                // Create the session
                ClassSession session = new ClassSession();
                session.setRecurringClass(rc);
                session.setClassType(rc.getClassType());
                session.setStartDateTime(startDateTime);
                session.setDurationMin(rc.getDurationMin());
                session.setCapacity(rc.getCapacity());
                session.setStatus(ClassStatus.ACTIVE);
                ClassSession savedSession = classSessionRepository.save(session);
                sessionsCreated++;

                // Book fixed enrollments
                List<FixedEnrollment> fixedEnrollments =
                        fixedEnrollmentRepository.findByRecurringClassIdAndActiveTrue(rc.getId());

                if (fixedEnrollments.size() > rc.getCapacity()) {
                    log.warn(
                            "Recurring class id={} has {} fixed enrollments but capacity is only {}. "
                            + "Excess fixed students will be placed on WAITLIST.",
                            rc.getId(), fixedEnrollments.size(), rc.getCapacity());
                }

                int confirmedCount = 0;
                for (FixedEnrollment enrollment : fixedEnrollments) {
                    BookingStatus status = confirmedCount < rc.getCapacity()
                            ? BookingStatus.CONFIRMED
                            : BookingStatus.WAITLIST;

                    Booking booking = new Booking();
                    booking.setClassSession(savedSession);
                    booking.setStudent(enrollment.getStudent());
                    booking.setStatus(status);
                    bookingRepository.save(booking);
                    fixedBookingsCreated++;

                    if (status == BookingStatus.CONFIRMED) {
                        confirmedCount++;
                    }
                }
            }
        }

        return new GenerationSummary(sessionsCreated, sessionsSkipped, fixedBookingsCreated);
    }
}
