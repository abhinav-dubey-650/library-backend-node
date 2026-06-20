import { Router } from "express";
import * as c from "./attendance.controller";

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
