package br.com.suryah.recurringclass;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record GenerateSessionsRequest(
        @NotNull LocalDate from,
        @NotNull LocalDate to
) {}
