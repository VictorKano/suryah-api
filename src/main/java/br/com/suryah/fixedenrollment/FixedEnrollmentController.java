package br.com.suryah.fixedenrollment;

import br.com.suryah.recurringclass.RecurringClass;
import br.com.suryah.recurringclass.RecurringClassRepository;
import br.com.suryah.student.Student;
import br.com.suryah.student.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@RestController
public class FixedEnrollmentController {

    private final FixedEnrollmentRepository fixedEnrollmentRepository;
    private final RecurringClassRepository recurringClassRepository;
    private final StudentRepository studentRepository;

    public FixedEnrollmentController(FixedEnrollmentRepository fixedEnrollmentRepository,
                                     RecurringClassRepository recurringClassRepository,
                                     StudentRepository studentRepository) {
        this.fixedEnrollmentRepository = fixedEnrollmentRepository;
        this.recurringClassRepository = recurringClassRepository;
        this.studentRepository = studentRepository;
    }

    /**
     * List active fixed enrollments for a recurring class.
     */
    @GetMapping("/api/recurring-classes/{id}/fixed-enrollments")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<FixedEnrollmentResponse> list(@PathVariable Long id) {
        recurringClassRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring class not found"));

        return fixedEnrollmentRepository.findByRecurringClassIdAndActiveTrue(id).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Enroll a student as a fixed student in a recurring class.
     * Validates: recurring class is active, student exists and is active, no duplicate.
     */
    @PostMapping("/api/recurring-classes/{id}/fixed-enrollments")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public FixedEnrollmentResponse enroll(@PathVariable Long id,
                                          @RequestBody FixedEnrollmentRequest request) {
        RecurringClass recurringClass = recurringClassRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring class not found"));

        if (!recurringClass.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Recurring class is not active");
        }

        Student student = studentRepository.findById(request.studentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        if (!student.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Student is not active");
        }

        if (fixedEnrollmentRepository.existsByRecurringClassIdAndStudentIdAndActiveTrue(id, request.studentId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Student is already enrolled as a fixed student in this recurring class");
        }

        // Block enrollment if already at capacity
        long currentCount = fixedEnrollmentRepository.countByRecurringClassIdAndActiveTrue(id);
        if (currentCount >= recurringClass.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "N\u00e3o \u00e9 poss\u00edvel adicionar mais alunos fixos: capacidade m\u00e1xima de "
                    + recurringClass.getCapacity() + " j\u00e1 atingida.");
        }

        // If a soft-deleted enrollment exists for this pair, reactivate it
        // instead of inserting a duplicate (which would violate the unique constraint).
        Optional<FixedEnrollment> existing = fixedEnrollmentRepository
                .findByRecurringClassIdAndStudentId(id, request.studentId());
        if (existing.isPresent()) {
            FixedEnrollment enrollment = existing.get();
            enrollment.setActive(true);
            FixedEnrollment saved = fixedEnrollmentRepository.save(enrollment);
            return toResponse(saved);
        }

        FixedEnrollment enrollment = FixedEnrollment.builder()
                .recurringClass(recurringClass)
                .student(student)
                .active(true)
                .build();

        FixedEnrollment saved = fixedEnrollmentRepository.save(enrollment);
        return toResponse(saved);
    }

    /**
     * Soft-delete a fixed enrollment by setting active=false.
     */
    @DeleteMapping("/api/fixed-enrollments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long id) {
        FixedEnrollment enrollment = fixedEnrollmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fixed enrollment not found"));

        enrollment.setActive(false);
        fixedEnrollmentRepository.save(enrollment);
    }

    // --- helpers ---

    private FixedEnrollmentResponse toResponse(FixedEnrollment enrollment) {
        return new FixedEnrollmentResponse(
                enrollment.getId(),
                enrollment.getStudent().getId(),
                enrollment.getStudent().getName(),
                enrollment.getRecurringClass().getId(),
                enrollment.isActive(),
                enrollment.getCreatedAt()
        );
    }
}
