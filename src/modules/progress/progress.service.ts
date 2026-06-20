import { istYear, istMonth, monthStart, monthEnd, minutesToHours } from "../../shared/ist";
import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import * as achievementSvc from "../achievements/achievements.service";
import * as examSvc from "../exams/exams.service";
import * as attendanceStats from "../attendance/attendance-stats.service";
import * as attendanceRepo from "../attendance/attendance.repository";

function resolveYearMonth(year?: number | null, month?: number | null) {
  if (year != null && month != null) return { year, month };
  return { year: istYear(), month: istMonth() };
}

function formatHours(hours: number): string {
  if (hours === Math.floor(hours)) return `${hours}h`;
  return `${hours}h`;
}

export async function buildCompareAverage(userMinutes: number, year: number, month: number) {
  const start = monthStart(year, month);
  const end = monthEnd(year, month);
  const members = await attendanceRepo.findAllMembers();
  if (members.length === 0) {
    return {
      yourHours: minutesToHours(userMinutes),
      libraryAverageHours: 0,
      differenceHours: minutesToHours(userMinutes),
      message: "Keep studying — you're building momentum!",
    };
  }

  let totalMinutes = 0;
  for (const member of members) {
    totalMinutes += await attendanceRepo.sumMinutesForUserInRange(Number(member.id), start, end);
  }
  const avgMinutes = totalMinutes / members.length;
  const yourHours = minutesToHours(userMinutes);
  const avgHours = minutesToHours(Math.floor(avgMinutes));
  const diff = Math.round((yourHours - avgHours) * 10) / 10;

  const message =
    diff > 0
      ? `You're ${diff}h above the library average — great work!`
      : diff < 0
        ? `You're ${Math.abs(diff)}h below average — a little push will get you there!`
        : "You're right at the library average — keep it up!";

  return { yourHours, libraryAverageHours: avgHours, differenceHours: diff, message };
}

export function buildRankInsight(leaderboard: Awaited<ReturnType<typeof attendanceStats.buildLeaderboard>>, userMinutes: number) {
  const currentRank = leaderboard.currentUserRank;
  if (currentRank == null || leaderboard.entries.length === 0) {
    return {
      message: "Start studying to appear on the leaderboard!",
      atTop: false,
      yourHours: minutesToHours(userMinutes),
    };
  }

  if (currentRank === 1) {
    return {
      currentRank: 1,
      targetRank: 1,
      yourHours: minutesToHours(userMinutes),
      targetRankHours: minutesToHours(userMinutes),
      hoursNeeded: 0,
      message: "You're #1 this month — keep leading!",
      atTop: true,
    };
  }

  const targetEntry = leaderboard.entries.find((e) => e.rank === currentRank - 1);
  if (!targetEntry) {
    return {
      currentRank,
      yourHours: minutesToHours(userMinutes),
      message: "Keep going — every hour counts!",
      atTop: false,
    };
  }

  const minutesNeeded = Math.max(0, targetEntry.totalMinutes - userMinutes + 1);
  const hoursNeeded = minutesToHours(minutesNeeded);

  return {
    currentRank,
    targetRank: targetEntry.rank,
    yourHours: minutesToHours(userMinutes),
    targetRankHours: targetEntry.totalHours,
    hoursNeeded,
    message: `You need ${formatHours(hoursNeeded)} more to reach Rank #${targetEntry.rank}`,
    atTop: false,
  };
}

export async function getOverview(userId: number, year?: number | null, month?: number | null) {
  const ym = resolveYearMonth(year, month);
  await achievementSvc.evaluateAndAward(userId);

  const leaderboard = await attendanceStats.buildLeaderboard(ym.year, ym.month, userId, attendanceRepo);
  const userMinutes = await attendanceRepo.sumMinutesForUserInRange(
    userId,
    monthStart(ym.year, ym.month),
    monthEnd(ym.year, ym.month)
  );
  const achievements = await achievementSvc.getUserAchievements(userId);

  return {
    year: ym.year,
    month: ym.month,
    examCountdown: await examSvc.getMyTarget(userId),
    compareAverage: await buildCompareAverage(userMinutes, ym.year, ym.month),
    rankInsight: buildRankInsight(leaderboard, userMinutes),
    latestMilestone: await achievementSvc.getLatestMilestone(userId),
    earnedBadgeCount: achievements.earnedCount,
    totalBadgeCount: achievements.totalCount,
  };
}
