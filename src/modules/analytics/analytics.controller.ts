import type { Request } from "express";
import { createHandler } from "../../core/http/createHandler";
import { AppError } from "../../core/errors/AppError";
import { authenticate } from "../../middlewares/authMiddleware";
import * as svc from "../achievements/achievements.service";

function parseOptionalInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function requireMember(req: Request) {
  if (req.user!.role !== "MEMBER") throw AppError.forbidden("Members only");
}

export const myAnalytics = createHandler(async (req, res) => {
  requireMember(req);
  res.status(200).json(
    await svc.getPersonalAnalytics(req.user!.userId, parseOptionalInt(req.query.year), parseOptionalInt(req.query.month))
  );
});

export { authenticate };
