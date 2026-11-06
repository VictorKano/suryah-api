package br.com.suryah.report;

import br.com.suryah.booking.BookingStatus;
import jakarta.persistence.EntityManager;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private static final ZoneId STUDIO_ZONE = ZoneId.of("America/Sao_Paulo");

    private final EntityManager em;

    public ReportController(EntityManager em) {
        this.em = em;
    }

    @GetMapping("/occupancy")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public OccupancyReport occupancy(@RequestParam(defaultValue = "30") int days) {
        OffsetDateTime from = OffsetDateTime.now(ZoneOffset.UTC).minusDays(days);

        return new OccupancyReport(
                buildSummary(from),
                buildByClassType(from),
                buildByDayOfWeek(from),
                buildByHour(from),
                buildTopStudents(from),
                buildWeeklyTrend(from)
        );
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    private OccupancyReport.Summary buildSummary(OffsetDateTime from) {
        // Total sessions and capacity
        Object[] sessionRow = (Object[]) em.createQuery("""
                select count(s), coalesce(sum(s.capacity), 0)
                from ClassSession s
                where s.startDateTime >= :from
                """)
                .setParameter("from", from)
                .getSingleResult();
        int totalSessions = ((Number) sessionRow[0]).intValue();
        long totalCapacity = ((Number) sessionRow[1]).longValue();

        // Booking counts by status
        List<?> bRows = em.createQuery("""
                select b.status, count(b)
                from Booking b
                where b.classSession.startDateTime >= :from
                group by b.status
                """)
                .setParameter("from", from)
                .getResultList();

        long confirmed = 0, waitlist = 0, cancellations = 0;
        for (Object row : bRows) {
            Object[] r = (Object[]) row;
            BookingStatus status = (BookingStatus) r[0];
            long cnt = ((Number) r[1]).longValue();
            switch (status) {
                case CONFIRMED -> confirmed = cnt;
                case WAITLIST -> waitlist = cnt;
                case CANCELLED -> cancellations = cnt;
            }
        }

        // Attended count (only where attended = true)
        long attended = ((Number) em.createQuery("""
                select count(b)
                from Booking b
                where b.classSession.startDateTime >= :from
                  and b.attended = true
                """)
                .setParameter("from", from)
                .getSingleResult()).longValue();

        double occupancyRate = totalCapacity > 0
                ? Math.round(confirmed * 1000.0 / totalCapacity) / 10.0
                : 0.0;

        // Only compute attendance rate if any check-ins have been recorded
        long checkedInTotal = ((Number) em.createQuery("""
                select count(b)
                from Booking b
                where b.classSession.startDateTime >= :from
                  and b.attended is not null
                """)
                .setParameter("from", from)
                .getSingleResult()).longValue();

        double attendanceRate = (checkedInTotal > 0 && confirmed > 0)
                ? Math.round(attended * 1000.0 / confirmed) / 10.0
                : Double.NaN;

        return new OccupancyReport.Summary(
                totalSessions, totalCapacity, confirmed, waitlist,
                cancellations, attended, occupancyRate, attendanceRate);
    }

    // ── By class type ─────────────────────────────────────────────────────────

    private List<OccupancyReport.ClassTypeStats> buildByClassType(OffsetDateTime from) {
        List<?> rows = em.createQuery("""
                select s.classType.name,
                       count(s),
                       coalesce(sum(s.capacity), 0),
                       coalesce(sum(
                           (select count(b) from Booking b
                            where b.classSession = s and b.status = 'CONFIRMED')
                       ), 0)
                from ClassSession s
                where s.startDateTime >= :from
                group by s.classType.name
                order by count(s) desc
                """)
                .setParameter("from", from)
                .getResultList();

        return rows.stream().map(r -> {
            Object[] row = (Object[]) r;
            String name = (String) row[0];
            int sessions = ((Number) row[1]).intValue();
            long cap = ((Number) row[2]).longValue();
            long conf = ((Number) row[3]).longValue();
            double rate = cap > 0 ? Math.round(conf * 1000.0 / cap) / 10.0 : 0.0;
            return new OccupancyReport.ClassTypeStats(name, sessions, cap, conf, rate);
        }).collect(Collectors.toList());
    }

    // ── By day of week ────────────────────────────────────────────────────────

    private List<OccupancyReport.DayOfWeekStats> buildByDayOfWeek(OffsetDateTime from) {
        // Fetch raw sessions with their start times and capacities
        List<?> rows = em.createQuery("""
                select s.startDateTime, s.capacity,
                       (select count(b) from Booking b
                        where b.classSession = s and b.status = 'CONFIRMED')
                from ClassSession s
                where s.startDateTime >= :from
                """)
                .setParameter("from", from)
                .getResultList();

        // Group in Java using the studio timezone for correct local day
        Map<DayOfWeek, long[]> acc = new LinkedHashMap<>();
        for (DayOfWeek d : DayOfWeek.values()) acc.put(d, new long[]{0, 0, 0});

        for (Object r : rows) {
            Object[] row = (Object[]) r;
            OffsetDateTime start = (OffsetDateTime) row[0];
            DayOfWeek dow = start.atZoneSameInstant(STUDIO_ZONE).getDayOfWeek();
            long cap = ((Number) row[1]).longValue();
            long conf = ((Number) row[2]).longValue();
            long[] a = acc.get(dow);
            a[0]++; a[1] += cap; a[2] += conf;
        }

        List<OccupancyReport.DayOfWeekStats> result = new ArrayList<>();
        for (Map.Entry<DayOfWeek, long[]> e : acc.entrySet()) {
            long[] a = e.getValue();
            if (a[0] == 0) continue;
            double rate = a[1] > 0 ? Math.round(a[2] * 1000.0 / a[1]) / 10.0 : 0.0;
            String label = e.getKey().getDisplayName(TextStyle.FULL, new Locale("pt", "BR"));
            result.add(new OccupancyReport.DayOfWeekStats(label, (int) a[0], a[2], rate));
        }
        return result;
    }

    // ── By hour ───────────────────────────────────────────────────────────────

    private List<OccupancyReport.HourStats> buildByHour(OffsetDateTime from) {
        List<?> rows = em.createQuery("""
                select s.startDateTime, s.capacity,
                       (select count(b) from Booking b
                        where b.classSession = s and b.status = 'CONFIRMED')
                from ClassSession s
                where s.startDateTime >= :from
                """)
                .setParameter("from", from)
                .getResultList();

        Map<Integer, long[]> acc = new TreeMap<>();
        for (Object r : rows) {
            Object[] row = (Object[]) r;
            OffsetDateTime start = (OffsetDateTime) row[0];
            int hour = start.atZoneSameInstant(STUDIO_ZONE).getHour();
            long cap = ((Number) row[1]).longValue();
            long conf = ((Number) row[2]).longValue();
            acc.computeIfAbsent(hour, k -> new long[]{0, 0, 0});
            long[] a = acc.get(hour);
            a[0]++; a[1] += cap; a[2] += conf;
        }

        return acc.entrySet().stream().map(e -> {
            long[] a = e.getValue();
            double rate = a[1] > 0 ? Math.round(a[2] * 1000.0 / a[1]) / 10.0 : 0.0;
            return new OccupancyReport.HourStats(e.getKey(), (int) a[0], a[2], rate);
        }).collect(Collectors.toList());
    }

    // ── Top students ──────────────────────────────────────────────────────────

    private List<OccupancyReport.TopStudent> buildTopStudents(OffsetDateTime from) {
        List<?> rows = em.createQuery("""
                select b.student.id,
                       b.student.name,
                       sum(case when b.status = 'CONFIRMED' then 1 else 0 end),
                       sum(case when b.attended = true      then 1 else 0 end),
                       sum(case when b.status = 'CANCELLED' then 1 else 0 end)
                from Booking b
                where b.classSession.startDateTime >= :from
                  and b.student.role = 'STUDENT'
                group by b.student.id, b.student.name
                order by sum(case when b.status = 'CONFIRMED' then 1 else 0 end) desc
                """)
                .setParameter("from", from)
                .setMaxResults(10)
                .getResultList();

        return rows.stream().map(r -> {
            Object[] row = (Object[]) r;
            return new OccupancyReport.TopStudent(
                    ((Number) row[0]).longValue(),
                    (String) row[1],
                    ((Number) row[2]).longValue(),
                    ((Number) row[3]).longValue(),
                    ((Number) row[4]).longValue()
            );
        }).collect(Collectors.toList());
    }

    // ── Weekly trend ──────────────────────────────────────────────────────────

    private List<OccupancyReport.WeeklyTrend> buildWeeklyTrend(OffsetDateTime from) {
        List<?> rows = em.createQuery("""
                select b.classSession.startDateTime, b.status
                from Booking b
                where b.classSession.startDateTime >= :from
                  and b.status in ('CONFIRMED', 'CANCELLED')
                order by b.classSession.startDateTime
                """)
                .setParameter("from", from)
                .getResultList();

        // Bucket by ISO week start (Monday) in studio timezone
        Map<String, long[]> acc = new LinkedHashMap<>();
        for (Object r : rows) {
            Object[] row = (Object[]) r;
            OffsetDateTime start = (OffsetDateTime) row[0];
            BookingStatus status = (BookingStatus) row[1];
            // Find the Monday of this session's local week
            var localDate = start.atZoneSameInstant(STUDIO_ZONE).toLocalDate();
            var monday = localDate.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            String key = monday.toString();
            acc.computeIfAbsent(key, k -> new long[]{0, 0});
            long[] a = acc.get(key);
            if (status == BookingStatus.CONFIRMED) a[0]++;
            else a[1]++;
        }

        return acc.entrySet().stream()
                .map(e -> new OccupancyReport.WeeklyTrend(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .collect(Collectors.toList());
    }
}
