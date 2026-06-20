import { Router } from "express";
import * as c from "./analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.get("/me", c.authenticate, c.myAnalytics);
