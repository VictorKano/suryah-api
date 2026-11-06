package br.com.suryah.booking;

/**
 * Lightweight snapshot of a booking used to pass data across the transaction
 * boundary into @Async email methods — avoids LazyInitializationException because
 * all data is extracted from the entities while the Hibernate session is still open.
 */
public record BookingSnapshot(
        String studentName,
        String studentEmail,
        String classTypeName,
        String formattedDateTime,
        int durationMin
) {
    public static BookingSnapshot of(Booking booking, String formattedDateTime) {
        return new BookingSnapshot(
                booking.getStudent().getName(),
                booking.getStudent().getEmail(),
                booking.getClassSession().getClassType().getName(),
                formattedDateTime,
                booking.getClassSession().getDurationMin()
        );
    }
}
