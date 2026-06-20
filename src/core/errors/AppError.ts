export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | "VALIDATION_ERROR";

/**
 * Application error carrying an HTTP status code.
 * Mirrors the status/reason behaviour of Spring's ResponseStatusException
 * so the JSON body matches what the Java GlobalExceptionHandler returned:
 *   { "message": <reason> }
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(message: string, status = 500, code: ErrorCode = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.statusCode = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, "BAD_REQUEST", details);
  }
  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(message, 401, "UNAUTHORIZED");
  }
  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, 403, "FORBIDDEN");
  }
  static notFound(message = "Not Found"): AppError {
    return new AppError(message, 404, "NOT_FOUND");
  }
  static conflict(message = "Conflict", details?: unknown): AppError {
    return new AppError(message, 409, "CONFLICT", details);
  }
  static serviceUnavailable(message = "Service Unavailable"): AppError {
    return new AppError(message, 503, "SERVICE_UNAVAILABLE");
  }
  static internalError(message = "Internal Server Error"): AppError {
    return new AppError(message, 500, "INTERNAL_ERROR");
  }
}
