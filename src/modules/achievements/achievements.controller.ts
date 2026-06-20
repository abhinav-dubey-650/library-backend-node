import type { Request } from "express";
import { createHandler } from "../../core/http/createHandler";
import { AppError } from "../../core/errors/AppError";
import { authenticate } from "../../middlewares/authMiddleware";
import * as svc from "./achievements.service";

function requireMember(req: Request) {
  if (req.user!.role !== "MEMBER") throw AppError.forbidden("Members only");
}

export const definitions = createHandler(async (_req, res) => {
  res.status(200).json(await svc.getDefinitionsForPublic());
});

export const myAchievements = createHandler(async (req, res) => {
  requireMember(req);
  res.status(200).json(await svc.getUserAchievements(req.user!.userId));
});

export { authenticate };
