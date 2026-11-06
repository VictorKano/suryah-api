package br.com.suryah.auth;

import br.com.suryah.student.PlanType;

/**
 * Request body for PUT /api/me.
 * All fields are optional — only non-null values are applied.
 * password is only changed when newPassword is provided.
 */
public record UpdateProfileRequest(
        String name,
        String email,
        String phone,
        Integer age,
        PlanType planType,
        String currentPassword,
        String newPassword
) {}
