package br.com.suryah.plan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record SubscriptionPaymentResponse(
        Long id,
        Long studentId,
        String studentName,
        Long planId,
        String planName,
        LocalDate periodStart,
        LocalDate periodEnd,
        BigDecimal amountPaid,
        String note,
        OffsetDateTime paidAt
) {}
