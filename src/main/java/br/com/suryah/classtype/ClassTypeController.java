package br.com.suryah.classtype;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/class-types")
public class ClassTypeController {

    private final ClassTypeRepository repository;

    public ClassTypeController(ClassTypeRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<ClassTypeResponse> list() {
        return repository.findByActiveTrueOrderByName().stream()
                .map(ct -> new ClassTypeResponse(ct.getId(), ct.getName(), ct.getDescription(), ct.isActive()))
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
        classType.setActive(true);
        ClassType saved = repository.save(classType);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ClassTypeResponse(saved.getId(), saved.getName(), saved.getDescription(), saved.isActive()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ClassTypeResponse update(@PathVariable Long id, @RequestBody ClassTypeRequest request) {
        ClassType classType = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class type not found"));
        classType.setName(request.name());
        classType.setDescription(request.description());
        ClassType saved = repository.save(classType);
        return new ClassTypeResponse(saved.getId(), saved.getName(), saved.getDescription(), saved.isActive());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        ClassType classType = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class type not found"));
        classType.setActive(false);
        repository.save(classType);
        return ResponseEntity.noContent().build();
    }
}
