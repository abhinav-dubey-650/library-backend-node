import { AppError } from "../../core/errors/AppError";
import { istYear, istMonth, monthStart, monthEnd, minutesToHours } from "../../shared/ist";
import * as repo from "./goals.repository";
import type { MonthlyGoalInput } from "./goals.validator";

function resolveYearMonth(year?: number | null, month?: number | null) {
  if (year != null && month != null) return { year, month };
  return { year: istYear(), month: istMonth() };
}

function buildResponse(goal: { year: number; month: number; target_minutes: number }, completedMinutes: number) {
  const targetMinutes = Number(goal.target_minutes);
  const progressPercent =
    targetMinutes > 0
      ? Math.min(100, Math.round((completedMinutes * 1000) / targetMinutes) / 10)
      : 0;
  return {
    year: goal.year,
    month: goal.month,
    targetMinutes,
    targetHours: minutesToHours(targetMinutes),
    completedMinutes,
    completedHours: minutesToHours(completedMinutes),
    progressPercent,
  };
}

export async function getGoal(userId: number, year?: number | null, month?: number | null) {
  const ym = resolveYearMonth(year, month);
  let goal = await repo.findGoal(userId, ym.year, ym.month);
  if (!goal) {
    goal = await repo.insertGoal(userId, ym.year, ym.month, repo.DEFAULT_TARGET_MINUTES);
  }
  const completed = await repo.sumMinutesForUserInRange(userId, monthStart(ym.year, ym.month), monthEnd(ym.year, ym.month));
  return buildResponse(goal, completed);
}

export async function setGoal(userId: number, input: MonthlyGoalInput) {
  const ym = resolveYearMonth(input.year, input.month);
  const targetMinutes = input.targetHours * 60;
  let goal = await repo.findGoal(userId, ym.year, ym.month);
  if (goal) {
    goal = await repo.updateGoal(Number(goal.id), targetMinutes);
  } else {
    goal = await repo.insertGoal(userId, ym.year, ym.month, targetMinutes);
  }
  if (!goal) throw AppError.badRequest("User not found");
  const completed = await repo.sumMinutesForUserInRange(userId, monthStart(ym.year, ym.month), monthEnd(ym.year, ym.month));
  return buildResponse(goal, completed);
}
