import { Router } from "express";
import * as c from "./config.controller";

export const configRouter = Router();

configRouter.get("/", c.optionalAuth, c.getAll);
configRouter.put("/:key", c.authenticate, c.requireAdmin, c.update);
