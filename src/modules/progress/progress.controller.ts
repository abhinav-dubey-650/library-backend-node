import type { Request } from "express";
import { createHandler } from "../../core/http/createHandler";
import { AppError } from "../../core/errors/AppError";
import { authenticate } from "../../middlewares/authMiddleware";
import * as svc from "./progress.service";

function parseOptionalInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

export const overview = createHandler(async (req, res) => {
  if (req.user!.role !== "MEMBER") throw AppError.forbidden("Members only");
  res.status(200).json(
    await svc.getOverview(req.user!.userId, parseOptionalInt(req.query.year), parseOptionalInt(req.query.month))
  );
});

export { authenticate };
