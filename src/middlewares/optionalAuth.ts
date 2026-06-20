import { Request, Response, NextFunction } from "express";
import { validateToken } from "../shared/token";

/** Attach req.user when a valid Bearer token is present; otherwise leave undefined. */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const data = validateToken(authHeader.slice(7));
    if (data) req.user = data;
  }
  next();
};
