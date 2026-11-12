package br.com.suryah.report;

import java.math.BigDecimal;
import java.util.List;

public record RevenueReport(
        // ── Per-session revenue (PER_SESSION plans) ───────────────────────────
        Summary summary,
        List<PeriodEntry> series,
        List<PlanBreakdown> byPlan,
        List<TopStudent> topStudents,

        // ── Subscription revenue (SUBSCRIPTION plans) ─────────────────────────
        SubscriptionSummary subscriptionSummary,
        List<SubscriptionPlanBreakdown> subscriptionByPlan,
        List<SubscriptionPeriodEntry> subscriptionSeries
) {
    // ── Per-session records ───────────────────────────────────────────────────

    public record Summary(
            long totalAttended,
            long totalAbsent,
            long totalPending,
            BigDecimal confirmedRevenue,
            BigDecimal potentialRevenue,
            BigDecimal lostRevenue
    ) {}

    public record PeriodEntry(
            String period,
            long attended,
            long absent,
            long pending,
            BigDecimal revenue
    ) {}

    public record PlanBreakdown(
            String planName,
            long attended,
            long absent,
            BigDecimal revenue
    ) {}

    public record TopStudent(
            Long studentId,
            String studentName,
            String planName,
            long attended,
            BigDecimal revenue
    ) {}

    // ── Subscription records ──────────────────────────────────────────────────

    public record SubscriptionSummary(
            long totalPayments,
            BigDecimal totalCollected
    ) {}

    public record SubscriptionPlanBreakdown(
            String planName,
            long payments,
            BigDecimal total
    ) {}

    public record SubscriptionPeriodEntry(
            String period,
            long payments,
            BigDecimal total
    ) {}
}
