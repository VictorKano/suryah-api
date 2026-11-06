package br.com.suryah.student;

import java.time.OffsetDateTime;

/**
 * Full student representation for the admin student list.
 * Excludes password hash.
 */
public record StudentDetail(
        Long id,
        String name,
        String email,
        String phone,
        Integer age,
        PlanType planType,
        boolean active,
        OffsetDateTime createdAt
) {}
