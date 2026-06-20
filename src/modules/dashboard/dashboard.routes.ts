import { Router } from "express";
import * as c from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/admin", c.authenticate, c.requireAdminOrLibrarian, c.adminDashboard);
