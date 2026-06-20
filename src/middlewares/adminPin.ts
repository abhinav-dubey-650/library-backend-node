import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "../core/errors/AppError";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate an admin PIN — port of AdminPinService.requirePin.
 */
export function requirePin(pin: string | undefined | null): void {
  const configured = env.APP_ADMIN_PIN;
  if (!configured || configured.trim() === "") {
    throw AppError.serviceUnavailable("Admin PIN is not configured on the server");
  }
  const provided = pin?.trim() ?? "";
  if (!provided || !safeEqual(configured.trim(), provided)) {
    throw AppError.forbidden("Invalid admin PIN");
  }
}

/** Middleware form: reads the X-Admin-Pin header. */
export const adminPin = (req: Request, _res: Response, next: NextFunction) => {
  requirePin(req.header("X-Admin-Pin"));
  next();
};
