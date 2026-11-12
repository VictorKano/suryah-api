package br.com.suryah.booking;

/** Request body for POST /api/admin/sessions/{id}/bookings */
public record AdminBookRequest(Long studentId) {}
