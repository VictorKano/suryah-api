package br.com.suryah.fixedenrollment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FixedEnrollmentRepository extends JpaRepository<FixedEnrollment, Long> {

    List<FixedEnrollment> findByRecurringClassIdAndActiveTrue(Long recurringClassId);

    boolean existsByRecurringClassIdAndStudentIdAndActiveTrue(Long recurringClassId, Long studentId);

    long countByRecurringClassIdAndActiveTrue(Long recurringClassId);

    Optional<FixedEnrollment> findByRecurringClassIdAndStudentId(Long recurringClassId, Long studentId);

    void deleteByRecurringClassId(Long recurringClassId);
}
