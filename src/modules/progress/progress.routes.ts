import { Router } from "express";
import * as c from "./progress.controller";

export const progressRouter = Router();

progressRouter.get("/overview", c.authenticate, c.overview);
