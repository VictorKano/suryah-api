package br.com.suryah.recurringclass;

/** Request body for PATCH /api/recurring-classes/{id}/active */
public record ActiveRequest(boolean active) {}
