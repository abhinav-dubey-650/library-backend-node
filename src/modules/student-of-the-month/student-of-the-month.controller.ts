import type { Request } from "express";
import { createHandler } from "../../core/http/createHandler";
import { authenticate } from "../../middlewares/authMiddleware";
import * as svc from "./student-of-the-month.service";

function parseOptionalInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

export const getStudentOfTheMonth = createHandler(async (req, res) => {
  res.status(200).json(
    await svc.getStudentOfTheMonth(parseOptionalInt(req.query.year), parseOptionalInt(req.query.month))
  );
});

export { authenticate };
