import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import { toIsoOrNull } from "../../shared/serializers";

export async function insertLog(
  userId: number,
  logDate: string,
  subject: string,
  minutesStudied: number,
  notes: string | null
) {
  const res = await SimpleDatabase.query(
    `INSERT INTO daily_study_logs (user_id, log_date, subject, minutes_studied, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, log_date, subject, minutes_studied, notes, created_at`,
    [userId, logDate, subject, minutesStudied, notes]
  );
  return res.rows[0];
}

export async function findByUserAndDateRange(userId: number, start: string, end: string) {
  const res = await SimpleDatabase.query(
    `SELECT id, user_id, log_date, subject, minutes_studied, notes, created_at
     FROM daily_study_logs
     WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
     ORDER BY log_date DESC, id DESC`,
    [userId, start, end]
  );
  return res.rows;
}

export async function sumMinutesForUserInRange(userId: number, start: string, end: string) {
  const res = await SimpleDatabase.query(
    `SELECT COALESCE(SUM(minutes_studied), 0)::bigint AS total
     FROM daily_study_logs WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3`,
    [userId, start, end]
  );
  return Number(res.rows[0]?.total ?? 0);
}

export function toEntryResponse(row: any) {
  const minutes = Number(row.minutes_studied);
  return {
    id: Number(row.id),
    logDate: String(row.log_date).substring(0, 10),
    subject: row.subject,
    minutesStudied: minutes,
    hoursStudied: Math.round(minutes / 6.0) / 10.0,
    notes: row.notes ?? null,
    createdAt: toIsoOrNull(row.created_at),
  };
}
