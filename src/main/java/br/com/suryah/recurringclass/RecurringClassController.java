package br.com.suryah.recurringclass;

import br.com.suryah.classtype.ClassType;
import br.com.suryah.classtype.ClassTypeRepository;
import br.com.suryah.classsession.ClassSessionRepository;
import br.com.suryah.fixedenrollment.FixedEnrollmentRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@RestController
@RequestMapping("/api/recurring-classes")
public class RecurringClassController {

    private final RecurringClassRepository recurringClassRepository;
    private final ClassTypeRepository classTypeRepository;
    private final SessionGenerationService sessionGenerationService;
    private final FixedEnrollmentRepository fixedEnrollmentRepository;
    private final ClassSessionRepository classSessionRepository;

    public RecurringClassController(RecurringClassRepository recurringClassRepository,
                                    ClassTypeRepository classTypeRepository,
                                    SessionGenerationService sessionGenerationService,
                                    FixedEnrollmentRepository fixedEnrollmentRepository,
                                    ClassSessionRepository classSessionRepository) {
        this.recurringClassRepository = recurringClassRepository;
        this.classTypeRepository = classTypeRepository;
        this.sessionGenerationService = sessionGenerationService;
        this.fixedEnrollmentRepository = fixedEnrollmentRepository;
        this.classSessionRepository = classSessionRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<RecurringClassResponse> list() {
        return recurringClassRepository.findAllByOrderByDayOfWeekAscStartTimeAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<RecurringClassResponse> create(@Valid @RequestBody RecurringClassRequest request) {
        ClassType classType = resolveActiveClassType(request.classTypeId());

        if (recurringClassRepository.existsByDayOfWeekAndStartTimeAndClassTypeId(
                request.dayOfWeek(), request.startTime(), request.classTypeId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A recurring class already exists for this day, time, and class type");
        }

        RecurringClass entity = RecurringClass.builder()
                .dayOfWeek(request.dayOfWeek())
                .startTime(request.startTime())
                .durationMin(request.durationMin())
                .classType(classType)
                .capacity(request.capacity())
                .active(true)
                .build();

        RecurringClass saved = recurringClassRepository.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public RecurringClassResponse update(@PathVariable Long id,
                                         @Valid @RequestBody RecurringClassRequest request) {
        RecurringClass entity = recurringClassRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring class not found"));

        ClassType classType = resolveActiveClassType(request.classTypeId());

        // Check unique slot constraint only if the slot fields are actually changing
        boolean slotChanged = !entity.getDayOfWeek().equals(request.dayOfWeek())
                || !entity.getStartTime().equals(request.startTime())
                || !entity.getClassType().getId().equals(request.classTypeId());

        if (slotChanged && recurringClassRepository.existsByDayOfWeekAndStartTimeAndClassTypeId(
                request.dayOfWeek(), request.startTime(), request.classTypeId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A recurring class already exists for this day, time, and class type");
        }

        entity.setDayOfWeek(request.dayOfWeek());
        entity.setStartTime(request.startTime());
        entity.setDurationMin(request.durationMin());
        entity.setClassType(classType);
        entity.setCapacity(request.capacity());

        RecurringClass saved = recurringClassRepository.save(entity);
        return toResponse(saved);
    }

    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public GenerationSummary generate(@Valid @RequestBody GenerateSessionsRequest request) {
        return sessionGenerationService.generateSessions(request.from(), request.to());
    }

    /** Toggle active/inactive — replaces the old soft-delete-only DELETE. */
    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public RecurringClassResponse setActive(@PathVariable Long id,
                                            @RequestBody ActiveRequest request) {
        RecurringClass entity = recurringClassRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring class not found"));
        entity.setActive(request.active());
        RecurringClass saved = recurringClassRepository.save(entity);
        return toResponse(saved);
    }

    /** Hard delete — permanently removes the recurring class and its fixed enrollments.
     *  Generated sessions are kept but detached (recurring_class_id set to null). */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        RecurringClass entity = recurringClassRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring class not found"));
        // 1. Detach generated sessions (set recurring_class_id = null) — sessions are kept
        classSessionRepository.detachFromRecurringClass(id);
        // 2. Delete fixed enrollments
        fixedEnrollmentRepository.deleteByRecurringClassId(id);
        // 3. Delete the recurring class itself
        recurringClassRepository.delete(entity);
        return ResponseEntity.noContent().build();
    }

    // --- helpers ---

    private ClassType resolveActiveClassType(Long classTypeId) {
        return classTypeRepository.findById(classTypeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Class type not found: " + classTypeId));
    }

    private RecurringClassResponse toResponse(RecurringClass rc) {
        return new RecurringClassResponse(
                rc.getId(),
                rc.getDayOfWeek(),
                rc.getStartTime(),
                rc.getDurationMin(),
                rc.getClassType().getName(),
                rc.getCapacity(),
                rc.isActive()
        );
    }
}
