package br.com.suryah.fixedenrollment;

import java.time.OffsetDateTime;

public record FixedEnrollmentResponse(
        Long id,
        Long studentId,
        String studentName,
        Long recurringClassId,
        boolean active,
        OffsetDateTime createdAt
) {}
