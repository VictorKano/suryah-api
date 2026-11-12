package br.com.suryah.report;

import br.com.suryah.plan.SubscriptionPayment;
import br.com.suryah.plan.SubscriptionPaymentRepository;
import jakarta.persistence.EntityManager;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class RevenueController {

    private static final ZoneId STUDIO_ZONE = ZoneId.of("America/Sao_Paulo");

    private final EntityManager em;
    private final SubscriptionPaymentRepository subscriptionPaymentRepository;

    public RevenueController(EntityManager em,
                             SubscriptionPaymentRepository subscriptionPaymentRepository) {
        this.em = em;
        this.subscriptionPaymentRepository = subscriptionPaymentRepository;
    }

    /**
     * GET /api/reports/revenue?from=2026-01-01&to=2026-12-31&groupBy=month
     * groupBy: day | month | year  (default: month)
     */
    @GetMapping("/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public RevenueReport revenue(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "month") String groupBy) {

        // Default: last 12 months
        OffsetDateTime toDate = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime fromDate = toDate.minusMonths(12);
        if (from != null) fromDate = OffsetDateTime.parse(from + "T00:00:00Z");
        if (to   != null) toDate   = OffsetDateTime.parse(to   + "T23:59:59Z");

        return new RevenueReport(
                buildSummary(fromDate, toDate),
                buildSeries(fromDate, toDate, groupBy),
                buildByPlan(fromDate, toDate),
                buildTopStudents(fromDate, toDate),
                buildSubscriptionSummary(fromDate, toDate),
                buildSubscriptionByPlan(fromDate, toDate),
                buildSubscriptionSeries(fromDate, toDate, groupBy)
        );
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    private RevenueReport.Summary buildSummary(OffsetDateTime from, OffsetDateTime to) {
        // Only bookings from students with a plan (plan_id not null)
        List<?> rows = em.createQuery("""
                select
                    sum(case when b.attended = true  then 1 else 0 end),
                    sum(case when b.attended = false then 1 else 0 end),
                    sum(case when b.attended is null and b.status = 'CONFIRMED' then 1 else 0 end),
                    coalesce(sum(case when b.attended = true  then b.pricePerAttendance else 0 end), 0),
                    coalesce(sum(case when b.attended = false then b.student.plan.pricePerAttendance else 0 end), 0)
                from Booking b
                where b.classSession.startDateTime >= :from
                  and b.classSession.startDateTime < :to
                  and b.status in ('CONFIRMED', 'CANCELLED')
                  and b.student.plan is not null
                """)
                .setParameter("from", from).setParameter("to", to)
                .getResultList();

        Object[] r = (Object[]) rows.get(0);
        long attended = toLong(r[0]);
        long absent   = toLong(r[1]);
        long pending  = toLong(r[2]);
        BigDecimal confirmed  = toBD(r[3]);
        BigDecimal lost       = toBD(r[4]);

        // Potential = confirmed + (pending * average plan price)
        List<?> pendingRevRows = em.createQuery("""
                select coalesce(sum(b.student.plan.pricePerAttendance), 0)
                from Booking b
                where b.classSession.startDateTime >= :from
                  and b.classSession.startDateTime < :to
                  and b.attended is null
                  and b.status = 'CONFIRMED'
                  and b.student.plan is not null
                """)
                .setParameter("from", from).setParameter("to", to)
                .getResultList();
        BigDecimal potential = confirmed.add(toBD(pendingRevRows.get(0)));

        return new RevenueReport.Summary(attended, absent, pending, confirmed, potential, lost);
    }

    // ── Time series ───────────────────────────────────────────────────────────

    private List<RevenueReport.PeriodEntry> buildSeries(OffsetDateTime from, OffsetDateTime to, String groupBy) {
        List<?> rows = em.createQuery("""
                select b.classSession.startDateTime, b.attended,
                       b.pricePerAttendance, b.student.plan.pricePerAttendance
                from Booking b
                where b.classSession.startDateTime >= :from
                  and b.classSession.startDateTime < :to
                  and b.status in ('CONFIRMED', 'CANCELLED')
                  and b.student.plan is not null
                """)
                .setParameter("from", from).setParameter("to", to)
                .getResultList();

        // Bucket by period key in studio timezone
        Map<String, long[]> map = new LinkedHashMap<>(); // [attended, absent, pending]
        Map<String, BigDecimal> revMap = new LinkedHashMap<>();

        for (Object row : rows) {
            Object[] r = (Object[]) row;
            OffsetDateTime dt = (OffsetDateTime) r[0];
            Boolean attended = (Boolean) r[1];
            BigDecimal price = r[2] != null ? (BigDecimal) r[2] : BigDecimal.ZERO;
            BigDecimal planPrice = r[3] != null ? (BigDecimal) r[3] : BigDecimal.ZERO;

            String key = periodKey(dt, groupBy);
            map.computeIfAbsent(key, k -> new long[]{0, 0, 0});
            revMap.putIfAbsent(key, BigDecimal.ZERO);

            long[] counts = map.get(key);
            if (Boolean.TRUE.equals(attended)) {
                counts[0]++;
                revMap.merge(key, price, BigDecimal::add);
            } else if (Boolean.FALSE.equals(attended)) {
                counts[1]++;
            } else {
                counts[2]++;
                revMap.merge(key, planPrice, BigDecimal::add);
            }
        }

        List<RevenueReport.PeriodEntry> result = new ArrayList<>();
        for (String key : map.keySet()) {
            long[] c = map.get(key);
            result.add(new RevenueReport.PeriodEntry(key, c[0], c[1], c[2], revMap.get(key)));
        }
        result.sort((a, b) -> a.period().compareTo(b.period()));
        return result;
    }

    private String periodKey(OffsetDateTime dt, String groupBy) {
        var local = dt.atZoneSameInstant(STUDIO_ZONE).toLocalDate();
        return switch (groupBy) {
            case "day"  -> local.toString();                   // 2026-11-05
            case "year" -> String.valueOf(local.getYear());    // 2026
            default     -> local.getYear() + "-" + String.format("%02d", local.getMonthValue()); // 2026-11
        };
    }

    // ── By plan ───────────────────────────────────────────────────────────────

    private List<RevenueReport.PlanBreakdown> buildByPlan(OffsetDateTime from, OffsetDateTime to) {
        List<?> rows = em.createQuery("""
                select b.student.plan.name,
                       sum(case when b.attended = true  then 1 else 0 end),
                       sum(case when b.attended = false then 1 else 0 end),
                       coalesce(sum(case when b.attended = true then b.pricePerAttendance else 0 end), 0)
                from Booking b
                where b.classSession.startDateTime >= :from
                  and b.classSession.startDateTime < :to
                  and b.status in ('CONFIRMED', 'CANCELLED')
                  and b.student.plan is not null
                group by b.student.plan.name
                order by coalesce(sum(case when b.attended = true then b.pricePerAttendance else 0 end), 0) desc
                """)
                .setParameter("from", from).setParameter("to", to)
                .getResultList();

        return rows.stream().map(row -> {
            Object[] r = (Object[]) row;
            return new RevenueReport.PlanBreakdown(
                    (String) r[0], toLong(r[1]), toLong(r[2]), toBD(r[3]));
        }).toList();
    }

    // ── Top students ──────────────────────────────────────────────────────────

    private List<RevenueReport.TopStudent> buildTopStudents(OffsetDateTime from, OffsetDateTime to) {
        List<?> rows = em.createQuery("""
                select b.student.id, b.student.name, b.student.plan.name,
                       sum(case when b.attended = true then 1 else 0 end),
                       coalesce(sum(case when b.attended = true then b.pricePerAttendance else 0 end), 0)
                from Booking b
                where b.classSession.startDateTime >= :from
                  and b.classSession.startDateTime < :to
                  and b.attended = true
                  and b.student.plan is not null
                group by b.student.id, b.student.name, b.student.plan.name
                order by coalesce(sum(case when b.attended = true then b.pricePerAttendance else 0 end), 0) desc
                """)
                .setParameter("from", from).setParameter("to", to)
                .setMaxResults(10)
                .getResultList();

        return rows.stream().map(row -> {
            Object[] r = (Object[]) row;
            return new RevenueReport.TopStudent(
                    ((Number) r[0]).longValue(), (String) r[1], (String) r[2],
                    toLong(r[3]), toBD(r[4]));
        }).toList();
    }

    // ── Subscription revenue ──────────────────────────────────────────────────

    private RevenueReport.SubscriptionSummary buildSubscriptionSummary(
            OffsetDateTime from, OffsetDateTime to) {
        List<SubscriptionPayment> payments = subscriptionPaymentRepository
                .findByPaidAtBetween(from, to);
        long count = payments.size();
        BigDecimal total = payments.stream()
                .map(SubscriptionPayment::getAmountPaid)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new RevenueReport.SubscriptionSummary(count, total);
    }

    private List<RevenueReport.SubscriptionPlanBreakdown> buildSubscriptionByPlan(
            OffsetDateTime from, OffsetDateTime to) {
        List<SubscriptionPayment> payments = subscriptionPaymentRepository
                .findByPaidAtBetween(from, to);
        Map<String, long[]> countMap = new LinkedHashMap<>();
        Map<String, BigDecimal> totalMap = new LinkedHashMap<>();
        for (SubscriptionPayment p : payments) {
            String planName = p.getPlan().getName();
            countMap.computeIfAbsent(planName, k -> new long[]{0})[0]++;
            totalMap.merge(planName, p.getAmountPaid(), BigDecimal::add);
        }
        return countMap.entrySet().stream()
                .map(e -> new RevenueReport.SubscriptionPlanBreakdown(
                        e.getKey(), e.getValue()[0], totalMap.get(e.getKey())))
                .sorted((a, b) -> b.total().compareTo(a.total()))
                .toList();
    }

    private List<RevenueReport.SubscriptionPeriodEntry> buildSubscriptionSeries(
            OffsetDateTime from, OffsetDateTime to, String groupBy) {
        List<SubscriptionPayment> payments = subscriptionPaymentRepository
                .findByPaidAtBetween(from, to);
        Map<String, long[]> countMap = new LinkedHashMap<>();
        Map<String, BigDecimal> totalMap = new LinkedHashMap<>();
        for (SubscriptionPayment p : payments) {
            String key = periodKey(p.getPaidAt(), groupBy);
            countMap.computeIfAbsent(key, k -> new long[]{0})[0]++;
            totalMap.merge(key, p.getAmountPaid(), BigDecimal::add);
        }
        return countMap.entrySet().stream()
                .map(e -> new RevenueReport.SubscriptionPeriodEntry(
                        e.getKey(), e.getValue()[0], totalMap.get(e.getKey())))
                .sorted((a, b) -> a.period().compareTo(b.period()))
                .toList();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private long toLong(Object o) {
        return o instanceof Number n ? n.longValue() : 0L;
    }

    private BigDecimal toBD(Object o) {
        if (o instanceof BigDecimal bd) return bd;
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }
}
