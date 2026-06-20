import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../core/errors/AppError";
import { logger } from "../config/logger";

/**
 * Central error handler — reproduces the Java GlobalExceptionHandler contract:
 *   - validation errors        -> 400 { message: "field: msg" }
 *   - AppError (== Spring's ResponseStatusException / IllegalArgumentException)
 *                              -> its status { message }
 *   - anything else            -> 500 { message: "An unexpected error occurred. Please try again." }
 * The body is always a bare { message } object (no success envelope), matching
 * what the existing frontend expects.
 */
export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  // Zod validation -> 400, first issue formatted "path: message" like Spring's binding error.
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const path = first?.path?.join(".") ?? "";
    const message = path ? `${path}: ${first?.message}` : first?.message ?? "Validation failed";
    return res.status(400).json({ message });
  }

  if (error instanceof AppError) {
    // 5xx are unexpected; log with stack. 4xx are normal client errors.
    if (error.status >= 500) {
      logger.error({ err: error, url: req.url, method: req.method }, "Application error");
    }
    return res.status(error.status).json({ message: error.message });
  }

  // Unhandled — log full stack (Java logged to STDERR) and return the generic message.
  logger.error(
    { err: error, url: req.url, method: req.method },
    "Unhandled error"
  );
  return res
    .status(500)
    .json({ message: "An unexpected error occurred. Please try again." });
};
