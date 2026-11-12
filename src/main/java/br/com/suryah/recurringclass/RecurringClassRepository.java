package br.com.suryah.recurringclass;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

public interface RecurringClassRepository extends JpaRepository<RecurringClass, Long> {

    List<RecurringClass> findByActiveTrue();

    List<RecurringClass> findByDayOfWeekAndActiveTrue(DayOfWeek dayOfWeek);

    List<RecurringClass> findByActiveTrueOrderByDayOfWeekAscStartTimeAsc();

    @org.springframework.data.jpa.repository.Query("""
            select r from RecurringClass r
            order by
              case r.dayOfWeek
                when 'MONDAY'    then 1
                when 'TUESDAY'   then 2
                when 'WEDNESDAY' then 3
                when 'THURSDAY'  then 4
                when 'FRIDAY'    then 5
                when 'SATURDAY'  then 6
                when 'SUNDAY'    then 7
              end asc,
              r.startTime asc
            """)
    List<RecurringClass> findAllByOrderByDayOfWeekAscStartTimeAsc();

    boolean existsByClassTypeId(Long classTypeId);

    boolean existsByDayOfWeekAndStartTimeAndClassTypeId(DayOfWeek dayOfWeek, LocalTime startTime, Long classTypeId);
}
