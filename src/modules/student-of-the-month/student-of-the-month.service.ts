import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import { longestConsecutiveStreak } from "../../shared/streak";
import { istYear, istMonth, monthStart, monthEnd, minutesToHours } from "../../shared/ist";

export async function getStudentOfTheMonth(year?: number | null, month?: number | null) {
  const ym =
    year != null && month != null ? { year, month } : { year: istYear(), month: istMonth() };
  const start = monthStart(ym.year, ym.month);
  const end = monthEnd(ym.year, ym.month);

  const membersRes = await SimpleDatabase.query(
    `SELECT id, member_id, full_name FROM users WHERE role = 'MEMBER' ORDER BY id`,
    []
  );
  const members = membersRes.rows;

  const aggRes = await SimpleDatabase.query(
    `SELECT user_id, COALESCE(SUM(total_minutes), 0)::bigint AS minutes,
            COUNT(CASE WHEN total_minutes > 0 THEN 1 END)::bigint AS days
     FROM daily_attendance_summary
     WHERE attendance_date >= $1 AND attendance_date <= $2
     GROUP BY user_id`,
    [start, end]
  );
  const monthStats = new Map<number, { minutes: number; days: number }>();
  for (const row of aggRes.rows) {
    monthStats.set(Number(row.user_id), { minutes: Number(row.minutes), days: Number(row.days) });
  }

  let topHours: any = null;
  let topHoursValue = -1;
  let topAttendance: any = null;
  let topAttendanceValue = -1;
  let topStreak: any = null;
  let topStreakValue = -1;

  for (const member of members) {
    const stats = monthStats.get(Number(member.id)) ?? { minutes: 0, days: 0 };
    if (stats.minutes > topHoursValue) {
      topHoursValue = stats.minutes;
      topHours = member;
    }
    if (stats.days > topAttendanceValue) {
      topAttendanceValue = stats.days;
      topAttendance = member;
    }

    const datesRes = await SimpleDatabase.query(
      `SELECT attendance_date FROM daily_attendance_summary
       WHERE user_id = $1 AND total_minutes > 0 AND attendance_date >= $2 AND attendance_date <= $3
       ORDER BY attendance_date ASC`,
      [member.id, start, end]
    );
    const dates = datesRes.rows.map((r) => String(r.attendance_date).substring(0, 10));
    const streakInMonth = longestConsecutiveStreak(dates);
    if (streakInMonth > topStreakValue) {
      topStreakValue = streakInMonth;
      topStreak = member;
    }
  }

  const winners = [
    buildWinner("HOURS", "Highest Study Hours", topHours, topHoursValue, `${minutesToHours(topHoursValue)}h`),
    buildWinner(
      "ATTENDANCE",
      "Best Attendance",
      topAttendance,
      topAttendanceValue,
      `${topAttendanceValue} day${topAttendanceValue !== 1 ? "s" : ""}`
    ),
    buildWinner(
      "STREAK",
      "Longest Streak This Month",
      topStreak,
      topStreakValue,
      `${topStreakValue} day${topStreakValue !== 1 ? "s" : ""} in a row`
    ),
  ];

  return { year: ym.year, month: ym.month, winners };
}

function buildWinner(
  category: string,
  label: string,
  user: any | null,
  value: number,
  valueLabel: string
) {
  if (!user || value <= 0) {
    return { category, categoryLabel: label, value: 0, valueLabel: "—" };
  }
  return {
    category,
    categoryLabel: label,
    userId: Number(user.id),
    memberId: user.member_id,
    fullName: user.full_name,
    value,
    valueLabel,
  };
}
