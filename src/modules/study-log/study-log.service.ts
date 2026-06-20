import { AppError } from "../../core/errors/AppError";
import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import { istToday, istYear, istMonth, monthStart, monthEnd } from "../../shared/ist";
import * as repo from "./study-log.repository";
import type { StudyLogInput } from "./study-log.validator";

function resolveYearMonth(year?: number | null, month?: number | null) {
  if (year != null && month != null) return { year, month };
  return { year: istYear(), month: istMonth() };
}

async function ensureUser(userId: number) {
  const r = await SimpleDatabase.query(`SELECT id FROM users WHERE id = $1`, [userId]);
  if (r.rows.length === 0) throw AppError.badRequest("User not found");
}

export async function addLog(userId: number, request: StudyLogInput) {
  await ensureUser(userId);
  const logDate =
    request.logDate && request.logDate.trim() !== "" ? request.logDate.trim() : istToday();
  let minutes = Math.round(request.hoursStudied * 60);
  if (minutes < 1) minutes = 1;

  const row = await repo.insertLog(userId, logDate, request.subject.trim(), minutes, request.notes?.trim() ?? null);
  return repo.toEntryResponse(row);
}

export async function getHistory(userId: number, year?: number | null, month?: number | null) {
  const ym = resolveYearMonth(year, month);
  const start = monthStart(ym.year, ym.month);
  const end = monthEnd(ym.year, ym.month);
  const logs = await repo.findByUserAndDateRange(userId, start, end);
  const totalMinutes = await repo.sumMinutesForUserInRange(userId, start, end);
  return {
    year: ym.year,
    month: ym.month,
    totalHoursLogged: Math.round(totalMinutes / 6.0) / 10.0,
    entries: logs.map(repo.toEntryResponse),
  };
}
