package br.com.suryah.reserva;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {
    long countByAulaIdAndStatus(Long aulaId, StatusReserva status);
    Optional<Reserva> findByAulaIdAndAlunoId(Long aulaId, Long alunoId);
}
