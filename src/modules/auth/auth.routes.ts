import { Router } from "express";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireAdmin, requireAdminOrLibrarian } from "../../middlewares/requireRole";
import { loginRateLimit } from "../../middlewares/loginRateLimit";
import * as c from "./auth.controller";

export const authRouter = Router();

// Public
authRouter.post("/login", loginRateLimit, c.login);
authRouter.post("/logout", c.logout);

// Authenticated (any role)
authRouter.post("/register", authenticate, requireAdmin, c.register);
authRouter.get("/me", authenticate, c.getMe);
authRouter.put("/me/password", authenticate, c.changeOwnPassword);
authRouter.post("/verify-admin-pin", authenticate, requireAdminOrLibrarian, c.verifyAdminPin);
authRouter.get("/members", authenticate, requireAdminOrLibrarian, c.getMembers);
authRouter.get("/users", authenticate, requireAdminOrLibrarian, c.getAllUsers);

// ADMIN / LIBRARIAN
authRouter.get("/students", authenticate, requireAdminOrLibrarian, c.getStudents);
authRouter.get("/by-email", authenticate, requireAdminOrLibrarian, c.getByEmail);
authRouter.get("/by-memberid", authenticate, requireAdminOrLibrarian, c.getByMemberId);
authRouter.post("/students/register", authenticate, requireAdminOrLibrarian, c.registerStudent);
authRouter.put("/students/:id/activate", authenticate, requireAdminOrLibrarian, c.activateStudent);
authRouter.put("/students/:id/deactivate", authenticate, requireAdminOrLibrarian, c.deactivateStudent);
authRouter.put("/students/:id/reset-password", authenticate, requireAdmin, c.resetStudentPassword);
authRouter.put("/students/:id", authenticate, requireAdminOrLibrarian, c.updateStudent);
authRouter.delete("/students/:id", authenticate, requireAdmin, c.deleteStudent);
