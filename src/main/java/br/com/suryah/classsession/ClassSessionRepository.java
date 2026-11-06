package br.com.suryah.classsession;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface ClassSessionRepository extends JpaRepository<ClassSession, Long> {

    @Query("""
           select a from ClassSession a join fetch a.classType
           where a.startDateTime >= :from and a.startDateTime < :to
             and a.status = br.com.suryah.classsession.ClassStatus.ACTIVE
           order by a.startDateTime
           """)
    List<ClassSession> findUpcoming(@Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    /** Idempotency check: returns true if an ACTIVE session already exists for the given recurring class and start time. */
    boolean existsByRecurringClassIdAndStartDateTimeAndStatus(Long recurringClassId, OffsetDateTime startDateTime, ClassStatus status);

    /** Detaches all sessions from a recurring class (sets recurring_class_id = null).
     *  Used before hard-deleting a recurring class to satisfy the FK constraint. */
    @Modifying
    @Query("update ClassSession s set s.recurringClass = null where s.recurringClass.id = :rcId")
    void detachFromRecurringClass(@Param("rcId") Long rcId);

    boolean existsByClassTypeId(Long classTypeId);

    /** Use within the booking transaction to serialize bookings for the same class session. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from ClassSession a where a.id = :id")
    Optional<ClassSession> findByIdForUpdate(@Param("id") Long id);
}
