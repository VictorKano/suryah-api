package br.com.suryah.classtype;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/class-types")
public class ClassTypeController {

    private final ClassTypeRepository repository;

    public ClassTypeController(ClassTypeRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<ClassType> listar() {
        return repository.findByActiveTrueOrderByName();
    }
}
