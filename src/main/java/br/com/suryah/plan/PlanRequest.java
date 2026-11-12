package br.com.suryah.plan;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PlanRequest(
        @NotBlank String name,

        // PER_SESSION
        @NotNull @DecimalMin("0.00") BigDecimal pricePerAttendance,

        // SUBSCRIPTION
        @NotNull BillingType billingType,
        BillingCycle billingCycle,
        @Min(1) Integer weeklySessionLimit,

        /** Price per billing cycle (required for SUBSCRIPTION plans). */
        @DecimalMin("0.01") BigDecimal price
) {}
