package br.com.suryah.recurringclass;

/**
 * Summary returned by the session generation endpoint.
 *
 * @param sessionsCreated     number of new class sessions persisted
 * @param sessionsSkipped     number of sessions skipped (already existed — idempotency)
 * @param fixedBookingsCreated number of confirmed/waitlist bookings created for fixed enrollments
 */
public record GenerationSummary(
        int sessionsCreated,
        int sessionsSkipped,
        int fixedBookingsCreated
) {}
