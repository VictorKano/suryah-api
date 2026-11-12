package br.com.suryah.plan;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    List<Plan> findAllByOrderByNameAsc();
    List<Plan> findByActiveTrueOrderByNameAsc();
}
