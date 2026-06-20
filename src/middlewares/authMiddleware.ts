import { Request, Response, NextFunction } from "express";
import { SimpleDatabase } from "../core/database/SimpleDatabase";
import { validateToken, TokenData } from "../shared/token";
import { AUTH_COOKIE, parseCookieHeader } from "../shared/authCookie";
import { AppError } from "../core/errors/AppError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenData;
    }
  }
}

/**
 * Require a valid Bearer token and an active user record.
 * Re-checks DB on every request so deactivated users cannot keep using old tokens.
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const cookies = parseCookieHeader(req.header("Cookie"));
    const authHeader = req.header("Authorization");
    const cookieToken = cookies[AUTH_COOKIE];
    const bearerToken =
      authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = cookieToken || bearerToken;

    if (!token) {
      throw AppError.unauthorized("Missing or invalid authorization header");
    }
    const data = validateToken(token);
    if (!data) {
      throw AppError.unauthorized("Invalid or expired token");
    }

    const res = await SimpleDatabase.query(
      `SELECT id, member_id, role, is_active FROM users WHERE id = $1 LIMIT 1`,
      [data.userId]
    );
    const row = res.rows[0];
    if (!row || row.is_active !== true) {
      throw AppError.unauthorized("Invalid or expired token");
    }

    req.user = {
      userId: Number(row.id),
      memberId: String(row.member_id),
      role: row.role,
    };
    next();
  } catch (err) {
    next(err);
  }
};
