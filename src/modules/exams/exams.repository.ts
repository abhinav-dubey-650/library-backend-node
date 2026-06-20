import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import { istToday, daysBetween } from "../../shared/ist";

export async function findActiveExams() {
  const res = await SimpleDatabase.query(
    `SELECT id, code, name, exam_label, exam_date, sort_order, is_active
     FROM exam_definitions WHERE is_active = true ORDER BY sort_order ASC`,
    []
  );
  return res.rows;
}

export async function findExamByCode(code: string) {
  const res = await SimpleDatabase.query(
    `SELECT id, code, name, exam_label, exam_date, sort_order, is_active
     FROM exam_definitions WHERE code = $1 LIMIT 1`,
    [code.toUpperCase()]
  );
  return res.rows[0] ?? null;
}

export async function findUserTarget(userId: number) {
  const res = await SimpleDatabase.query(
    `SELECT uet.id, uet.user_id, uet.exam_definition_id, uet.custom_exam_name, uet.custom_exam_date, uet.updated_at,
            ed.code, ed.name, ed.exam_label, ed.exam_date
     FROM user_exam_targets uet
     LEFT JOIN exam_definitions ed ON ed.id = uet.exam_definition_id
     WHERE uet.user_id = $1 LIMIT 1`,
    [userId]
  );
  return res.rows[0] ?? null;
}

export async function upsertUserCustomTarget(userId: number, examName: string, examDate: string) {
  const existing = await SimpleDatabase.query(`SELECT id FROM user_exam_targets WHERE user_id = $1`, [userId]);
  if (existing.rows.length > 0) {
    const res = await SimpleDatabase.query(
      `UPDATE user_exam_targets
       SET exam_definition_id = NULL, custom_exam_name = $2, custom_exam_date = $3, updated_at = NOW()
       WHERE user_id = $1
       RETURNING id, user_id, exam_definition_id, custom_exam_name, custom_exam_date, updated_at`,
      [userId, examName, examDate]
    );
    return res.rows[0];
  }
  const res = await SimpleDatabase.query(
    `INSERT INTO user_exam_targets (user_id, exam_definition_id, custom_exam_name, custom_exam_date)
     VALUES ($1, NULL, $2, $3)
     RETURNING id, user_id, exam_definition_id, custom_exam_name, custom_exam_date, updated_at`,
    [userId, examName, examDate]
  );
  return res.rows[0];
}

export async function upsertUserTarget(userId: number, examDefinitionId: number) {
  const existing = await SimpleDatabase.query(`SELECT id FROM user_exam_targets WHERE user_id = $1`, [userId]);
  if (existing.rows.length > 0) {
    const res = await SimpleDatabase.query(
      `UPDATE user_exam_targets SET exam_definition_id = $2, custom_exam_name = NULL, custom_exam_date = NULL WHERE user_id = $1
       RETURNING id, user_id, exam_definition_id, custom_exam_name, custom_exam_date, updated_at`,
      [userId, examDefinitionId]
    );
    return res.rows[0];
  }
  const res = await SimpleDatabase.query(
    `INSERT INTO user_exam_targets (user_id, exam_definition_id) VALUES ($1, $2)
     RETURNING id, user_id, exam_definition_id, custom_exam_name, custom_exam_date, updated_at`,
    [userId, examDefinitionId]
  );
  return res.rows[0];
}

export function toExamResponse(row: { code: string; name: string; exam_label: string; exam_date: string | Date }) {
  const examDate = String(row.exam_date).substring(0, 10);
  let days = daysBetween(examDate, istToday());
  if (days < 0) days = 0;
  return {
    code: row.code,
    name: row.name,
    examLabel: row.exam_label,
    examDate,
    daysRemaining: days,
  };
}

export function toUserTargetResponse(row: any) {
  if (row.custom_exam_name && row.custom_exam_date) {
    const examDate = String(row.custom_exam_date).substring(0, 10);
    let days = daysBetween(examDate, istToday());
    if (days < 0) days = 0;
    const exam = {
      code: "CUSTOM",
      name: row.custom_exam_name,
      examLabel: row.custom_exam_name,
      examDate,
      daysRemaining: days,
    };
    return {
      selectedExam: exam,
      motivationalMessage: `${days} days left for ${row.custom_exam_name}`,
    };
  }
  const exam = toExamResponse(row);
  return {
    selectedExam: exam,
    motivationalMessage: `${exam.daysRemaining} days left for ${exam.examLabel}`,
  };
}
