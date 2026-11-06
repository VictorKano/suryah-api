package br.com.suryah.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    long countByClassSessionIdAndStatus(Long classSessionId, BookingStatus status);
    Optional<Booking> findByClassSessionIdAndStudentId(Long classSessionId, Long studentId);
    Optional<Booking> findFirstByClassSessionIdAndStatusOrderByCreatedAtAsc(Long classSessionId, BookingStatus status);
    List<Booking> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<Booking> findByClassSessionIdAndStatusIn(Long classSessionId, List<BookingStatus> statuses);
    List<Booking> findByClassSessionIdOrderByStatusAscCreatedAtAsc(Long classSessionId);

    /** Used by the reminder scheduler: CONFIRMED bookings for sessions starting
     *  between [from, to] where the reminder has not been sent yet. */
    @org.springframework.data.jpa.repository.Query("""
            select b from Booking b
            join fetch b.student
            join fetch b.classSession cs
            join fetch cs.classType
            where b.status = 'CONFIRMED'
              and b.reminderSent is null
              and cs.startDateTime >= :from
              and cs.startDateTime < :to
            """)
    List<Booking> findConfirmedWithoutReminder(
            @org.springframework.data.repository.query.Param("from") java.time.OffsetDateTime from,
            @org.springframework.data.repository.query.Param("to") java.time.OffsetDateTime to);
}
