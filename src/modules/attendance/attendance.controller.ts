import { createHandler } from "../../core/http/createHandler";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireAdminOrLibrarian } from "../../middlewares/requireRole";
import * as svc from "./attendance.service";

function parseOptionalInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

export const checkIn = createHandler(async (req, res) => {
  const memberId = String(req.query.memberId ?? "");
  res.status(200).json(await svc.checkIn(memberId));
});

export const checkOut = createHandler(async (req, res) => {
  const memberId = String(req.query.memberId ?? "");
  res.status(200).json(await svc.checkOut(memberId));
});

export const punchInSelf = createHandler(async (req, res) => {
  res.status(200).json(await svc.punchInSelf(req.user!.userId));
});

export const punchOutSelf = createHandler(async (req, res) => {
  res.status(200).json(await svc.punchOutSelf(req.user!.userId));
});

export const myStatus = createHandler(async (req, res) => {
  res.status(200).json(await svc.getMyStatus(req.user!.userId));
});

export const myMonthlyStats = createHandler(async (req, res) => {
  res.status(200).json(
    await svc.getMonthlyStats(req.user!.userId, parseOptionalInt(req.query.year), parseOptionalInt(req.query.month))
  );
});

export const leaderboard = createHandler(async (req, res) => {
  res.status(200).json(
    await svc.getLeaderboard(parseOptionalInt(req.query.year), parseOptionalInt(req.query.month), req.user!.userId)
  );
});

export const occupiedSeats = createHandler(async (_req, res) => {
  res.status(200).json(await svc.getSeatIdsOccupiedByPunchIn());
});

export const seatMapSnapshot = createHandler(async (req, res) => {
  const shiftRaw = req.query.shiftId;
  const shiftId =
    shiftRaw != null && String(shiftRaw) !== "" ? parseInt(String(shiftRaw), 10) : null;
  res.status(200).json(await svc.getSeatMapSnapshot(Number.isNaN(shiftId!) ? null : shiftId));
});

export const getActiveSessions = createHandler(async (_req, res) => {
  res.status(200).json(await svc.getActiveSessions());
});

export { authenticate, requireAdminOrLibrarian };
