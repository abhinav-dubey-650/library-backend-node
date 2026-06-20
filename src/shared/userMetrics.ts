import { SimpleDatabase } from "../core/database/SimpleDatabase";
import { calculateStreak } from "./streak";
import { monthStart, monthEnd } from "./ist";

export interface UserMetrics {
  lifetimeMinutes: number;
  lifetimeDaysPresent: number;
  currentStreak: number;
  longestStreak: number;
  monthMinutes: number;
  monthDaysPresent: number;
}

/**
 * Port of UserMetricsService.getMetrics — aggregates the user's attendance
 * summary rows for a given year/month plus lifetime totals and streaks.
 * All queries hit daily_attendance_summary, matching the Java repository.
 */
export async function getUserMetrics(userId: number, year: number, month: number): Promise<UserMetrics> {
  const start = monthStart(year, month);
  const end = monthEnd(year, month);

  const [lifetime, monthAgg, presentDatesRes] = await Promise.all([
    SimpleDatabase.query(
      `SELECT COALESCE(SUM(total_minutes), 0)::bigint AS minutes,
              COUNT(*) FILTER (WHERE total_minutes > 0) AS days
         FROM daily_attendance_summary WHERE user_id = $1`,
      [userId]
    ),
    SimpleDatabase.query(
      `SELECT COALESCE(SUM(total_minutes), 0)::bigint AS minutes,
              COUNT(*) FILTER (WHERE total_minutes > 0) AS days
         FROM daily_attendance_summary
        WHERE user_id = $1 AND attendance_date >= $2 AND attendance_date <= $3`,
      [userId, start, end]
    ),
    SimpleDatabase.query(
      `SELECT attendance_date FROM daily_attendance_summary
        WHERE user_id = $1 AND total_minutes > 0 ORDER BY attendance_date ASC`,
      [userId]
    ),
  ]);

  const presentDates = presentDatesRes.rows.map((r: any) => toIso(r.attendance_date));
  const streak = calculateStreak(presentDates);

  return {
    lifetimeMinutes: Number(lifetime.rows[0].minutes),
    lifetimeDaysPresent: Number(lifetime.rows[0].days),
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    monthMinutes: Number(monthAgg.rows[0].minutes),
    monthDaysPresent: Number(monthAgg.rows[0].days),
  };
}

/** A DATE column comes back from pg as a JS Date; render it as YYYY-MM-DD. */
export function toIso(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
