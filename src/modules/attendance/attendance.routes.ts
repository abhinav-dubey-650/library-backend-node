import { Router } from "express";
import * as c from "./attendance.controller";
import { kioskAuth } from "../../middlewares/kioskAuth";
import { kioskReadLimit, kioskWriteLimit } from "../../middlewares/kioskRateLimit";

export const attendanceRouter = Router();

attendanceRouter.post("/check-in", c.authenticate, c.requireAdminOrLibrarian, c.checkIn);
attendanceRouter.post("/check-out", c.authenticate, c.requireAdminOrLibrarian, c.checkOut);
attendanceRouter.post("/punch-in", c.authenticate, c.punchInSelf);
attendanceRouter.post("/punch-out", c.authenticate, c.punchOutSelf);
attendanceRouter.get("/me/status", c.authenticate, c.myStatus);
attendanceRouter.get("/me/monthly-stats", c.authenticate, c.myMonthlyStats);
attendanceRouter.get("/leaderboard", c.authenticate, c.leaderboard);
attendanceRouter.get("/occupied-seats", c.authenticate, c.occupiedSeats);
attendanceRouter.get("/seat-map", c.authenticate, c.seatMapSnapshot);
attendanceRouter.get("/active", c.authenticate, c.requireAdminOrLibrarian, c.getActiveSessions);
attendanceRouter.get("/daily", c.authenticate, c.requireAdminOrLibrarian, c.getDailyAttendance);

// Public QR attendance — gated by a shared kiosk key (embedded in the wall QR)
// and per-IP rate limits. Admin can fetch/rotate the key via /qr/key.
attendanceRouter.get("/slot/:slotId/members", c.authenticate, c.requireAdminOrLibrarian, c.slotMembers);
attendanceRouter.get("/qr/students", kioskReadLimit, kioskAuth, c.qrStudents);
attendanceRouter.post("/qr/punch-in", kioskWriteLimit, kioskAuth, c.qrCheckIn);
attendanceRouter.post("/qr/punch-out", kioskWriteLimit, kioskAuth, c.qrCheckOut);
attendanceRouter.get("/qr/key", c.authenticate, c.requireAdmin, c.getKioskKey);
