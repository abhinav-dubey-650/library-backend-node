import { Request, Response, NextFunction } from "express";
import { AppError } from "../core/errors/AppError";

/**
 * Role gate. Must run after `authenticate`. Mirrors the Java checkAdmin /
 * checkAdminOrLibrarian helpers, including their exact 403 messages.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      const message =
        roles.length === 1 && roles[0] === "ADMIN"
          ? "Access denied. Admin role required."
          : "Access denied. Admin or Librarian role required.";
      throw AppError.forbidden(message);
    }
    next();
  };
}

export const requireAdmin = requireRole("ADMIN");
export const requireAdminOrLibrarian = requireRole("ADMIN", "LIBRARIAN");
