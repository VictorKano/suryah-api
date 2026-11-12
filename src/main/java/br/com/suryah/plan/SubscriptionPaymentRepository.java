package br.com.suryah.plan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, Long> {

    List<SubscriptionPayment> findByStudentIdOrderByPaidAtDesc(Long studentId);

    /** All payments whose paidAt falls within [from, to). Used by revenue report. */
    @Query("""
            select sp from SubscriptionPayment sp
            join fetch sp.student
            join fetch sp.plan
            where sp.paidAt >= :from and sp.paidAt < :to
            order by sp.paidAt
            """)
    List<SubscriptionPayment> findByPaidAtBetween(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);
}
