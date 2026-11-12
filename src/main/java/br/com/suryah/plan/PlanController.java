package br.com.suryah.plan;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/plans")
public class PlanController {

    private final PlanRepository planRepository;

    public PlanController(PlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<PlanResponse> list() {
        return planRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<PlanResponse> create(@Valid @RequestBody PlanRequest req) {
        validateRequest(req);
        Plan plan = applyRequest(new Plan(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(planRepository.save(plan)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public PlanResponse update(@PathVariable Long id, @Valid @RequestBody PlanRequest req) {
        validateRequest(req);
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found"));
        return toResponse(planRepository.save(applyRequest(plan, req)));
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public PlanResponse setActive(@PathVariable Long id, @RequestBody ActivePlanRequest req) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found"));
        plan.setActive(req.active());
        return toResponse(planRepository.save(plan));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void validateRequest(PlanRequest req) {
        if (req.billingType() == BillingType.SUBSCRIPTION) {
            if (req.billingCycle() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "billingCycle is required for SUBSCRIPTION plans");
            }
            if (req.weeklySessionLimit() == null || req.weeklySessionLimit() < 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "weeklySessionLimit must be >= 1 for SUBSCRIPTION plans");
            }
            if (req.price() == null || req.price().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "price must be > 0 for SUBSCRIPTION plans");
            }
        }
    }

    private Plan applyRequest(Plan plan, PlanRequest req) {
        plan.setName(req.name());
        plan.setBillingType(req.billingType());

        if (req.billingType() == BillingType.PER_SESSION) {
            plan.setPricePerAttendance(req.pricePerAttendance());
            plan.setBillingCycle(null);
            plan.setWeeklySessionLimit(null);
            plan.setPrice(null);
        } else {
            plan.setPricePerAttendance(java.math.BigDecimal.ZERO);
            plan.setBillingCycle(req.billingCycle());
            plan.setWeeklySessionLimit(req.weeklySessionLimit());
            plan.setPrice(req.price());
        }
        return plan;
    }

    private PlanResponse toResponse(Plan p) {
        return new PlanResponse(
                p.getId(), p.getName(), p.getPricePerAttendance(),
                p.getBillingType(), p.getBillingCycle(), p.getWeeklySessionLimit(),
                p.getPrice(),
                p.isActive(), p.getCreatedAt());
    }
}
