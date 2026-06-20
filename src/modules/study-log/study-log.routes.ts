import { Router } from "express";
import * as c from "./study-log.controller";

export const studyLogRouter = Router();

studyLogRouter.get("/", c.authenticate, c.history);
studyLogRouter.post("/", c.authenticate, c.addLog);
