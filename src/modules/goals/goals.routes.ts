import { Router } from "express";
import * as c from "./goals.controller";

export const goalsRouter = Router();

goalsRouter.get("/me", c.authenticate, c.myGoal);
goalsRouter.put("/me", c.authenticate, c.setGoal);
