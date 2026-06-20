import { createHandler } from "../../core/http/createHandler";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireAdminOrLibrarian } from "../../middlewares/requireRole";
import * as svc from "./dashboard.service";

export const adminDashboard = createHandler(async (_req, res) => {
  res.status(200).json(await svc.getAdminDashboard());
});

export { authenticate, requireAdminOrLibrarian };
