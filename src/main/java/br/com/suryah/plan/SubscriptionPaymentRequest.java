package br.com.suryah.plan;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record SubscriptionPaymentRequest(
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd,
        @NotNull @DecimalMin("0.01") BigDecimal amountPaid,
        String note
) {}
