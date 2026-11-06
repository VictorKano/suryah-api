package br.com.suryah.classsession;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.OffsetDateTime;

/**
 * Request body for POST /api/class-sessions — creates an ad-hoc (one-off) session
 * with no recurring class parent.
 */
public record CreateSessionRequest(
        @NotNull Long classTypeId,
        @NotNull OffsetDateTime startDateTime,
        @NotNull @Positive Integer durationMin,
        @NotNull @Positive Integer capacity
) {}
