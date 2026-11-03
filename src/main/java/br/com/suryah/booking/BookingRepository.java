package br.com.suryah.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    long countByClassSessionIdAndStatus(Long classSessionId, BookingStatus status);
    Optional<Booking> findByClassSessionIdAndStudentId(Long classSessionId, Long studentId);
    Optional<Booking> findFirstByClassSessionIdAndStatusOrderByCreatedAtAsc(Long classSessionId, BookingStatus status);
    List<Booking> findByStudentIdOrderByCreatedAtDesc(Long studentId);
}
