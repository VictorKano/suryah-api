package br.com.suryah.report;

import java.util.List;

/**
 * Full occupancy report returned by GET /api/reports/occupancy?days=N.
 */
public record OccupancyReport(
        Summary summary,
        List<ClassTypeStats> byClassType,
        List<DayOfWeekStats> byDayOfWeek,
        List<HourStats> byHour,
        List<TopStudent> topStudents,
        List<WeeklyTrend> weeklyTrend
) {

    public record Summary(
            int totalSessions,
            long totalCapacity,
            long totalConfirmed,
            long totalWaitlist,
            long totalCancellations,
            long totalAttended,
            double occupancyRate,    // confirmed / capacity  (0–100)
            double attendanceRate    // attended  / confirmed (0–100), NaN if no check-ins
    ) {}

    public record ClassTypeStats(
            String classTypeName,
            int sessions,
            long capacity,
            long confirmed,
            double occupancyRate
    ) {}

    public record DayOfWeekStats(
            String dayOfWeek,
            int sessions,
            long confirmed,
            double occupancyRate
    ) {}

    public record HourStats(
            int hour,              // 0–23
            int sessions,
            long confirmed,
            double occupancyRate
    ) {}

    public record TopStudent(
            Long studentId,
            String studentName,
            long confirmed,
            long attended,
            long cancellations
    ) {}

    public record WeeklyTrend(
            String weekStart,   // ISO date "2026-10-27"
            long confirmed,
            long cancellations
    ) {}
}
