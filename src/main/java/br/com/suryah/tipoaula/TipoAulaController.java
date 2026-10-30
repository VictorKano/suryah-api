package br.com.suryah.tipoaula;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tipos-aula")
public class TipoAulaController {

    private final TipoAulaRepository repository;

    public TipoAulaController(TipoAulaRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<TipoAula> listar() {
        return repository.findByAtivoTrueOrderByNome();
    }
}
