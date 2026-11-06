package br.com.suryah.recurringclass;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

public interface RecurringClassRepository extends JpaRepository<RecurringClass, Long> {

    List<RecurringClass> findByActiveTrue();

    List<RecurringClass> findByDayOfWeekAndActiveTrue(DayOfWeek dayOfWeek);

    List<RecurringClass> findByActiveTrueOrderByDayOfWeekAscStartTimeAsc();

    List<RecurringClass> findAllByOrderByDayOfWeekAscStartTimeAsc();

    boolean existsByClassTypeId(Long classTypeId);

    boolean existsByDayOfWeekAndStartTimeAndClassTypeId(DayOfWeek dayOfWeek, LocalTime startTime, Long classTypeId);
}
