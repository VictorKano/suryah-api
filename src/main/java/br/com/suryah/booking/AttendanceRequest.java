package br.com.suryah.booking;

/**
 * Request body for PATCH /api/bookings/{id}/attendance.
 * attended: true = present, false = no-show, null = clear mark.
 */
public record AttendanceRequest(Boolean attended) {}
