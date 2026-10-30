package br.com.suryah.tipoaula;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TipoAulaRepository extends JpaRepository<TipoAula, Long> {
    List<TipoAula> findByAtivoTrueOrderByNome();
}
