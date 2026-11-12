package br.com.suryah.plan;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PlanResponse(
        Long id,
        String name,
        BigDecimal pricePerAttendance,
        BillingType billingType,
        BillingCycle billingCycle,
        Integer weeklySessionLimit,
        /** Price per billing cycle — only set for SUBSCRIPTION plans. */
        BigDecimal price,
        boolean active,
        OffsetDateTime createdAt
) {}
