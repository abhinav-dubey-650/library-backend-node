import { AppError } from "../../core/errors/AppError";
import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import * as repo from "./exams.repository";

export async function listExams() {
  return (await repo.findActiveExams()).map((e) =>
    repo.toExamResponse({ code: e.code, name: e.name, exam_label: e.exam_label, exam_date: e.exam_date })
  );
}

export async function getMyTarget(userId: number) {
  const row = await repo.findUserTarget(userId);
  if (!row) return null;
  if (!row.custom_exam_name && !row.exam_definition_id) return null;
  return repo.toUserTargetResponse(row);
}

export async function setMyTarget(userId: number, examCode: string | null | undefined) {
  if (!examCode || examCode.trim() === "") throw AppError.badRequest("Exam code is required");

  const user = await SimpleDatabase.query(`SELECT id FROM users WHERE id = $1`, [userId]);
  if (user.rows.length === 0) throw AppError.badRequest("User not found");

  const exam = await repo.findExamByCode(examCode);
  if (!exam) throw AppError.badRequest(`Unknown exam: ${examCode}`);

  await repo.upsertUserTarget(userId, Number(exam.id));
  const row = await repo.findUserTarget(userId);
  return repo.toUserTargetResponse(row);
}

export async function setMyCustomTarget(userId: number, examName: string, examDate: string) {
  const name = examName?.trim();
  const date = examDate?.trim();
  if (!name) throw AppError.badRequest("Exam name is required");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw AppError.badRequest("Exam date must be YYYY-MM-DD");
  }

  const user = await SimpleDatabase.query(`SELECT id FROM users WHERE id = $1`, [userId]);
  if (user.rows.length === 0) throw AppError.badRequest("User not found");

  await repo.upsertUserCustomTarget(userId, name, date);
  const row = await repo.findUserTarget(userId);
  return repo.toUserTargetResponse(row);
}

export { repo };
