import { Router } from "express";
import * as c from "./student-of-the-month.controller";

export const studentOfTheMonthRouter = Router();

studentOfTheMonthRouter.get("/", c.authenticate, c.getStudentOfTheMonth);
