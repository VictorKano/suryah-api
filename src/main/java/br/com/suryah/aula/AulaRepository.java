package br.com.suryah.aula;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface AulaRepository extends JpaRepository<Aula, Long> {

    @Query("""
           select a from Aula a join fetch a.tipoAula
           where a.dataHoraInicio >= :de and a.dataHoraInicio < :ate
             and a.status = br.com.suryah.aula.StatusAula.ATIVA
           order by a.dataHoraInicio
           """)
    List<Aula> findAgenda(@Param("de") OffsetDateTime de, @Param("ate") OffsetDateTime ate);

    /** Usar dentro da transação de reserva para serializar reservas da mesma aula. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Aula a where a.id = :id")
    Optional<Aula> findByIdForUpdate(@Param("id") Long id);
}
