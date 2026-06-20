import { SimpleDatabase } from "../../core/database/SimpleDatabase";

export const DEFAULT_TARGET_MINUTES = 9000;

export async function findGoal(userId: number, year: number, month: number) {
  const res = await SimpleDatabase.query(
    `SELECT id, user_id, year, month, target_minutes, created_at, updated_at
     FROM user_monthly_goals WHERE user_id = $1 AND year = $2 AND month = $3 LIMIT 1`,
    [userId, year, month]
  );
  return res.rows[0] ?? null;
}

export async function insertGoal(userId: number, year: number, month: number, targetMinutes: number) {
  const res = await SimpleDatabase.query(
    `INSERT INTO user_monthly_goals (user_id, year, month, target_minutes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, year, month, target_minutes, created_at, updated_at`,
    [userId, year, month, targetMinutes]
  );
  return res.rows[0];
}

export async function updateGoal(id: number, targetMinutes: number) {
  const res = await SimpleDatabase.query(
    `UPDATE user_monthly_goals SET target_minutes = $2 WHERE id = $1
     RETURNING id, user_id, year, month, target_minutes, created_at, updated_at`,
    [id, targetMinutes]
  );
  return res.rows[0] ?? null;
}

export async function sumMinutesForUserInRange(userId: number, start: string, end: string) {
  const res = await SimpleDatabase.query(
    `SELECT COALESCE(SUM(total_minutes), 0)::bigint AS total
     FROM daily_attendance_summary
     WHERE user_id = $1 AND attendance_date >= $2 AND attendance_date <= $3`,
    [userId, start, end]
  );
  return Number(res.rows[0]?.total ?? 0);
}
