import { Router } from "express";
import * as c from "./fees.controller";

export const feesRouter = Router();

feesRouter.post("/generate", c.authenticate, c.requireAdmin, c.generate);
feesRouter.get("/", c.authenticate, c.requireAdminOrLibrarian, c.list);
feesRouter.get("/stats", c.authenticate, c.requireAdminOrLibrarian, c.stats);
feesRouter.get("/payments/history", c.authenticate, c.requireAdminOrLibrarian, c.paymentHistory);
feesRouter.get("/my", c.authenticate, c.myFees);
feesRouter.get("/my/payments", c.authenticate, c.myPayments);
feesRouter.get("/my/current", c.authenticate, c.myCurrentFee);
feesRouter.post("/:id/payments", c.authenticate, c.requireAdminOrLibrarian, c.recordPayment);
feesRouter.put("/:id/waive", c.authenticate, c.requireAdmin, c.waive);
