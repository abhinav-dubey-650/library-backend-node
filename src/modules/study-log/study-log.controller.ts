import type { Request } from "express";
import { createHandler } from "../../core/http/createHandler";
import { AppError } from "../../core/errors/AppError";
import { authenticate } from "../../middlewares/authMiddleware";
import { studyLogSchema } from "./study-log.validator";
import * as svc from "./study-log.service";

function parseOptionalInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function requireMember(req: Request) {
  if (req.user!.role !== "MEMBER") throw AppError.forbidden("Members only");
}

export const history = createHandler(async (req, res) => {
  requireMember(req);
  res.status(200).json(await svc.getHistory(req.user!.userId, parseOptionalInt(req.query.year), parseOptionalInt(req.query.month)));
});

export const addLog = createHandler(async (req, res) => {
  requireMember(req);
  const body = studyLogSchema.parse(req.body);
  res.status(200).json(await svc.addLog(req.user!.userId, body));
});

export { authenticate };
