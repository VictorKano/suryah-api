package br.com.suryah.student;

import jakarta.validation.constraints.Email;

/**
 * Request body for PATCH /api/students/{id} — admin edits a student's profile.
 * All fields are optional; only non-null values are applied.
 */
public record AdminUpdateStudentRequest(
        String name,
        @Email(message = "Invalid email format") String email,
        String phone,
        Integer age,
        PlanType planType
) {}
