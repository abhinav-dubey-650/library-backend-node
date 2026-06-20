import { Router } from "express";
import { createHandler } from "../../core/http/createHandler";

export const healthRouter = Router();

/**
 * Liveness probe. Matches the Java HealthController: GET / and GET /health
 * both return { status: "ok", service: "library-backend" }.
 */
const health = createHandler(async (_req, res) => {
  res.status(200).json({ status: "ok", service: "library-backend" });
});

healthRouter.get("/", health);
healthRouter.get("/health", health);
