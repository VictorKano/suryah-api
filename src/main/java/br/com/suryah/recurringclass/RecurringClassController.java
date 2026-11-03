package br.com.suryah.recurringclass;

import br.com.suryah.classtype.ClassType;
import br.com.suryah.classtype.ClassTypeRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/recurring-classes")
public class RecurringClassController {

    private final RecurringClassRepository recurringClassRepository;
    private final ClassTypeRepository classTypeRepository;

    public RecurringClassController(RecurringClassRepository recurringClassRepository,
                                    ClassTypeRepository classTypeRepository) {
        this.recurringClassRepository = recurringClassRepository;
        this.classTypeRepository = classTypeRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<RecurringClassResponse> list() {
        return recurringClassRepository.findByActiveTrueOrderByDayOfWeekAscStartTimeAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        RecurringClass entity = recurringClassRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring class not found"));
        entity.setActive(false);
        recurringClassRepository.save(entity);
        return ResponseEntity.noContent().build();
    }

    // --- helpers ---

    private ClassType resolveActiveClassType(Long classTypeId) {
        ClassType classType = classTypeRepository.findById(classTypeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Class type not found: " + classTypeId));
        if (!classType.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Class type is not active: " + classTypeId);
        }
        return classType;
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
