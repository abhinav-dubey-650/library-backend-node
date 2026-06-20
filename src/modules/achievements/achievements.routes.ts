import { Router } from "express";
import * as c from "./achievements.controller";

export const achievementsRouter = Router();

achievementsRouter.get("/definitions", c.authenticate, c.definitions);
achievementsRouter.get("/me", c.authenticate, c.myAchievements);
