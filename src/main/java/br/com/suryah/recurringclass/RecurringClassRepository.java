package br.com.suryah.recurringclass;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.util.List;

public interface RecurringClassRepository extends JpaRepository<RecurringClass, Long> {

    List<RecurringClass> findByActiveTrue();

    List<RecurringClass> findByDayOfWeekAndActiveTrue(DayOfWeek dayOfWeek);
}
