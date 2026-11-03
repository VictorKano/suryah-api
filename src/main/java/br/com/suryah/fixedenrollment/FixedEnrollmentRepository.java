package br.com.suryah.fixedenrollment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FixedEnrollmentRepository extends JpaRepository<FixedEnrollment, Long> {

    List<FixedEnrollment> findByRecurringClassIdAndActiveTrue(Long recurringClassId);

    boolean existsByRecurringClassIdAndStudentIdAndActiveTrue(Long recurringClassId, Long studentId);
}
