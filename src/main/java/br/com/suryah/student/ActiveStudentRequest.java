package br.com.suryah.student;

/** Request body for PATCH /api/students/{id}/active */
public record ActiveStudentRequest(boolean active) {}
