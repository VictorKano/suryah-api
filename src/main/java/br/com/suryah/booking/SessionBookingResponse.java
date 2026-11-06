package br.com.suryah.booking;

import java.time.OffsetDateTime;

/**
 * Booking entry as seen by the admin when viewing attendees for a specific session.
 */
public record SessionBookingResponse(
        Long bookingId,
        Long studentId,
        String studentName,
        String studentEmail,
        BookingStatus status,
        Boolean attended,
        OffsetDateTime createdAt
) {}
