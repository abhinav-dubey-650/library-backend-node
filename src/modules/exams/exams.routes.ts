import { Router } from "express";
import * as c from "./exams.controller";

export const examsRouter = Router();

examsRouter.get("/", c.authenticate, c.listExams);
examsRouter.get("/me", c.authenticate, c.myExam);
examsRouter.put("/me", c.authenticate, c.setMyExam);
