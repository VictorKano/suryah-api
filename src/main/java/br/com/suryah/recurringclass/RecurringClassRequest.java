package br.com.suryah.recurringclass;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record RecurringClassRequest(
        @NotNull DayOfWeek dayOfWeek,
        @NotNull LocalTime startTime,
        @NotNull @Positive Integer durationMin,
        @NotNull Long classTypeId,
        @NotNull @Positive Integer capacity
) {}
