package br.com.suryah.booking;

import java.time.OffsetDateTime;

public record BookingResponse(
        Long id,
        Long classSessionId,
        String classTypeName,
        OffsetDateTime startDateTime,
        BookingStatus status,
        OffsetDateTime createdAt
) {}
