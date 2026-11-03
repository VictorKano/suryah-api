package br.com.suryah.classsession;

import java.time.OffsetDateTime;

public record ClassSessionResponse(
        Long id,
        String classTypeName,
        OffsetDateTime startDateTime,
        int durationMin,
        int capacity,
        long confirmedCount,
        long availableSpots,
        String myBookingStatus
) {}
