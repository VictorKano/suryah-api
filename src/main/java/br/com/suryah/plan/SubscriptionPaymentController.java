package br.com.suryah.plan;

import br.com.suryah.student.Student;
import br.com.suryah.student.StudentRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@PreAuthorize("hasRole('ADMIN')")
public class SubscriptionPaymentController {

    private final SubscriptionPaymentRepository paymentRepository;
    private final StudentRepository studentRepository;
    private final PlanRepository planRepository;

    public SubscriptionPaymentController(SubscriptionPaymentRepository paymentRepository,
                                         StudentRepository studentRepository,
                                         PlanRepository planRepository) {
        this.paymentRepository = paymentRepository;
        this.studentRepository = studentRepository;
        this.planRepository = planRepository;
    }

    /** GET /api/admin/students/{studentId}/subscription-payments */
    @GetMapping("/api/admin/students/{studentId}/subscription-payments")
    @Transactional(readOnly = true)
    public List<SubscriptionPaymentResponse> listByStudent(@PathVariable Long studentId) {
        return paymentRepository.findByStudentIdOrderByPaidAtDesc(studentId)
                .stream().map(this::toResponse).toList();
    }

    /** POST /api/admin/students/{studentId}/subscription-payments */
    @PostMapping("/api/admin/students/{studentId}/subscription-payments")
    @Transactional
    public ResponseEntity<SubscriptionPaymentResponse> create(
            @PathVariable Long studentId,
            @Valid @RequestBody SubscriptionPaymentRequest req) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        Plan plan = student.getPlan();
        if (plan == null || plan.getBillingType() != BillingType.SUBSCRIPTION) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Student does not have a SUBSCRIPTION plan");
        }

        if (!req.periodEnd().isAfter(req.periodStart()) && !req.periodEnd().equals(req.periodStart())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "periodEnd must be >= periodStart");
        }

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setStudent(student);
        payment.setPlan(plan);
        payment.setPeriodStart(req.periodStart());
        payment.setPeriodEnd(req.periodEnd());
        payment.setAmountPaid(req.amountPaid());
        payment.setNote(req.note());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(paymentRepository.save(payment)));
    }

    /** DELETE /api/admin/subscription-payments/{id} */
    @DeleteMapping("/api/admin/subscription-payments/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        SubscriptionPayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        paymentRepository.delete(payment);
        return ResponseEntity.noContent().build();
    }

    // ── helper ────────────────────────────────────────────────────────────────

    private SubscriptionPaymentResponse toResponse(SubscriptionPayment p) {
        return new SubscriptionPaymentResponse(
                p.getId(),
                p.getStudent().getId(),
                p.getStudent().getName(),
                p.getPlan().getId(),
                p.getPlan().getName(),
                p.getPeriodStart(),
                p.getPeriodEnd(),
                p.getAmountPaid(),
                p.getNote(),
                p.getPaidAt());
    }
}
