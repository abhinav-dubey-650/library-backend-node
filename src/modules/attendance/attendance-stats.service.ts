import { istYear, istMonth, monthStart, monthEnd, minutesToHours } from "../../shared/ist";

export interface LeaderboardEntry {
  userId: number;
  memberId: string;
  fullName: string;
  daysPresent: number;
  totalMinutes: number;
  totalHours: number;
  currentUser: boolean;
  rank?: number;
  badge?: string | null;
}

export interface LeaderboardResponse {
  year: number;
  month: number;
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
}

function resolveYearMonth(year?: number | null, month?: number | null): { year: number; month: number } {
  if (year != null && month != null) return { year, month };
  return { year: istYear(), month: istMonth() };
}

function badgeForRank(rank: number): string | null {
  if (rank === 1) return "GOLD";
  if (rank === 2) return "SILVER";
  if (rank === 3) return "BRONZE";
  return null;
}

export async function buildLeaderboard(
  year: number,
  month: number,
  currentUserId: number | null,
  repo: typeof import("./attendance.repository")
): Promise<LeaderboardResponse> {
  const start = monthStart(year, month);
  const end = monthEnd(year, month);

  const members = await repo.findAllMembers();
  const aggregates = await repo.aggregateMinutesByUserInRange(start, end);
  const statsByUser = new Map<number, { minutes: number; days: number }>();
  for (const row of aggregates) {
    statsByUser.set(Number(row.user_id), {
      minutes: Number(row.minutes),
      days: Number(row.days),
    });
  }

  const entries: LeaderboardEntry[] = members.map((member) => {
    const stats = statsByUser.get(Number(member.id)) ?? { minutes: 0, days: 0 };
    return {
      userId: Number(member.id),
      memberId: member.member_id,
      fullName: member.full_name,
      daysPresent: stats.days,
      totalMinutes: stats.minutes,
      totalHours: minutesToHours(stats.minutes),
      currentUser: currentUserId != null && currentUserId === Number(member.id),
    };
  });

  entries.sort((a, b) => {
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
    if (b.daysPresent !== a.daysPresent) return b.daysPresent - a.daysPresent;
    return a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase());
  });

  let currentUserRank: number | null = null;
  entries.forEach((entry, i) => {
    const rank = i + 1;
    entry.rank = rank;
    entry.badge = badgeForRank(rank);
    if (entry.currentUser) currentUserRank = rank;
  });

  return { year, month, entries, currentUserRank };
}

export async function getMonthlyStats(
  userId: number,
  year: number | null | undefined,
  month: number | null | undefined,
  repo: typeof import("./attendance.repository")
) {
  const ym = resolveYearMonth(year, month);
  const start = monthStart(ym.year, ym.month);
  const end = monthEnd(ym.year, ym.month);

  const totalMinutes = await repo.sumMinutesForUserInRange(userId, start, end);
  const daysPresent = await repo.countPresentDaysForUserInRange(userId, start, end);
  const leaderboard = await buildLeaderboard(ym.year, ym.month, userId, repo);

  return {
    year: ym.year,
    month: ym.month,
    daysPresent,
    totalMinutes,
    totalHours: minutesToHours(totalMinutes),
    rank: leaderboard.currentUserRank,
    totalStudents: leaderboard.entries.length,
  };
}

export { resolveYearMonth };
