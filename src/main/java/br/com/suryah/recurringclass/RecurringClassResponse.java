package br.com.suryah.recurringclass;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record RecurringClassResponse(
        Long id,
        DayOfWeek dayOfWeek,
        LocalTime startTime,
        Integer durationMin,
        String classTypeName,
        Integer capacity,
        Boolean active
) {}
