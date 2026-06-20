import { Router } from "express";
import * as c from "./subscriptions.controller";

export const subscriptionsRouter = Router();

// Public
subscriptionsRouter.get("/plans", c.getPlans);

// Authenticated
subscriptionsRouter.post("/plans", c.authenticate, c.requireAdmin, c.createPlan);
subscriptionsRouter.put("/plans/:id", c.authenticate, c.requireAdmin, c.updatePlan);
subscriptionsRouter.delete("/plans/:id", c.authenticate, c.requireAdmin, c.deletePlan);
subscriptionsRouter.get("/plans/stats", c.authenticate, c.requireAdminOrLibrarian, c.getPlanStats);
subscriptionsRouter.get("/plans/all", c.authenticate, c.requireAdminOrLibrarian, c.getAllPlansAdmin);

subscriptionsRouter.post("/subscriptions", c.authenticate, c.createSubscription);
subscriptionsRouter.get("/subscriptions/active", c.authenticate, c.getActiveSubscription);
subscriptionsRouter.get("/subscriptions/user/:userId", c.authenticate, c.getUserSubscriptions);
