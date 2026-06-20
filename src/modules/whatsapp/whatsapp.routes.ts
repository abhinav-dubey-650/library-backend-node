import { Router } from "express";
import * as c from "./whatsapp.controller";

export const whatsappRouter = Router();

whatsappRouter.get("/messages", c.authenticate, c.requireAdmin, c.getMessages);
whatsappRouter.post("/messages/:messageId/retry", c.authenticate, c.requireAdmin, c.retryMessage);
whatsappRouter.post("/test-admission", c.authenticate, c.requireAdminOrLibrarian, c.testAdmission);
