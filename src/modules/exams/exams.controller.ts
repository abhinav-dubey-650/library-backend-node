import type { Request } from "express";
import { createHandler } from "../../core/http/createHandler";
import { AppError } from "../../core/errors/AppError";
import { authenticate } from "../../middlewares/authMiddleware";
import * as svc from "./exams.service";

function requireMember(req: Request) {
  if (req.user!.role !== "MEMBER") throw AppError.forbidden("Members only");
}

export const listExams = createHandler(async (_req, res) => {
  res.status(200).json(await svc.listExams());
});

export const myExam = createHandler(async (req, res) => {
  requireMember(req);
  res.status(200).json(await svc.getMyTarget(req.user!.userId));
});

export const setMyExam = createHandler(async (req, res) => {
  requireMember(req);
  const examName = req.body?.examName as string | undefined;
  const examDate = req.body?.examDate as string | undefined;
  const examCode = req.body?.examCode as string | undefined;

  if (examName && examDate) {
    res.status(200).json(await svc.setMyCustomTarget(req.user!.userId, examName, examDate));
    return;
  }
  res.status(200).json(await svc.setMyTarget(req.user!.userId, examCode));
});

export { authenticate };
