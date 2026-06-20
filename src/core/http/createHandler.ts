import type { Request, Response, NextFunction, RequestHandler } from "express";

export type AsyncHandler<TReq extends Request = Request, TResBody = unknown> = (
  req: TReq,
  res: Response<TResBody>,
  next: NextFunction
) => Promise<void> | void;

export function createHandler<TReq extends Request = Request, TResBody = unknown>(
  handler: AsyncHandler<TReq, TResBody>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req as TReq, res as Response<TResBody>, next)).catch(next);
  };
}
