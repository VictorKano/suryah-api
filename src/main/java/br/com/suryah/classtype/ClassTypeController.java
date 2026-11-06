package br.com.suryah.classtype;

import br.com.suryah.classsession.ClassSessionRepository;
import br.com.suryah.recurringclass.RecurringClassRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/class-types")
public class ClassTypeController {

    private final ClassTypeRepository repository;
    private final RecurringClassRepository recurringClassRepository;
    private final ClassSessionRepository classSessionRepository;

    public ClassTypeController(ClassTypeRepository repository,
                               RecurringClassRepository recurringClassRepository,
                               ClassSessionRepository classSessionRepository) {
        this.repository = repository;
        this.recurringClassRepository = recurringClassRepository;
        this.classSessionRepository = classSessionRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ClassTypeResponse> list() {
        return repository.findAllByOrderByName().stream()
                .map(ct -> new ClassTypeResponse(ct.getId(), ct.getName(), ct.getDescription()))
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClassTypeResponse> create(@RequestBody ClassTypeRequest request) {
        if (repository.existsByName(request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Class type with this name already exists");
        }
        ClassType classType = new ClassType();
        classType.setName(request.name());
        classType.setDescription(request.description());
        ClassType saved = repository.save(classType);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ClassTypeResponse(saved.getId(), saved.getName(), saved.getDescription()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ClassTypeResponse update(@PathVariable Long id, @RequestBody ClassTypeRequest request) {
        ClassType classType = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class type not found"));
        classType.setName(request.name());
        classType.setDescription(request.description());
        ClassType saved = repository.save(classType);
        return new ClassTypeResponse(saved.getId(), saved.getName(), saved.getDescription());
    }

    /**
     * Hard delete — permanently removes the class type.
     * Blocked if any recurring class or session still references it.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        ClassType classType = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class type not found"));

        if (recurringClassRepository.existsByClassTypeId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Existem aulas recorrentes que usam este tipo. Remova-as primeiro.");
        }
        if (classSessionRepository.existsByClassTypeId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Existem sess\u00f5es que usam este tipo. Cancele-as primeiro.");
        }

        repository.delete(classType);
        return ResponseEntity.noContent().build();
    }
}
