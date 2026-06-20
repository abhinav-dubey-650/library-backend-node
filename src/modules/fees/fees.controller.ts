import { createHandler } from "../../core/http/createHandler";
import { AppError } from "../../core/errors/AppError";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireAdmin, requireAdminOrLibrarian } from "../../middlewares/requireRole";
import { requirePin } from "../../middlewares/adminPin";
import { feePaymentSchema } from "./fees.validator";
import * as svc from "./fees.service";

export const generate = createHandler(async (req, res) => {
  requirePin(req.header("X-Admin-Pin"));
  const year = parseInt(String(req.query.year ?? ""), 10);
  const month = parseInt(String(req.query.month ?? ""), 10);
  if (Number.isNaN(year) || Number.isNaN(month)) throw AppError.badRequest("year and month are required");
  res.status(200).json(await svc.generateForMonth(year, month));
});

export const list = createHandler(async (req, res) => {
  requirePin(req.header("X-Admin-Pin"));
  const page = Math.max(0, parseInt(String(req.query.page ?? "0"), 10) || 0);
  const sizeRaw = parseInt(String(req.query.size ?? "20"), 10) || 20;
  const size = Math.min(sizeRaw, 100);
  const year = req.query.year != null ? parseInt(String(req.query.year), 10) : null;
  const month = req.query.month != null ? parseInt(String(req.query.month), 10) : null;
  const status = req.query.status != null ? String(req.query.status) : null;
  const search = req.query.search != null ? String(req.query.search) : null;
  res.status(200).json(await svc.searchInvoices(year, month, status, search, page, size));
});

export const stats = createHandler(async (req, res) => {
  requirePin(req.header("X-Admin-Pin"));
  const year = parseInt(String(req.query.year ?? ""), 10);
  const month = parseInt(String(req.query.month ?? ""), 10);
  if (Number.isNaN(year) || Number.isNaN(month)) throw AppError.badRequest("year and month are required");
  res.status(200).json(await svc.getStats(year, month));
});

export const myFees = createHandler(async (req, res) => {
  res.status(200).json(await svc.getMyInvoices(req.user!.userId));
});

export const myPayments = createHandler(async (req, res) => {
  res.status(200).json(await svc.getMyPaymentHistory(req.user!.userId));
});

export const myCurrentFee = createHandler(async (req, res) => {
  const inv = await svc.getCurrentMonthInvoice(req.user!.userId);
  if (!inv) {
    res.status(204).send();
    return;
  }
  res.status(200).json(inv);
});

export const recordPayment = createHandler(async (req, res) => {
  requirePin(req.header("X-Admin-Pin"));
  const body = feePaymentSchema.parse(req.body);
  res.status(200).json(await svc.recordPayment(parseId(req.params.id), body, req.user!.userId));
});

export const waive = createHandler(async (req, res) => {
  requirePin(req.header("X-Admin-Pin"));
  res.status(200).json(await svc.waiveInvoice(parseId(req.params.id)));
});

export const paymentHistory = createHandler(async (req, res) => {
  requirePin(req.header("X-Admin-Pin"));
  const page = Math.max(0, parseInt(String(req.query.page ?? "0"), 10) || 0);
  const sizeRaw = parseInt(String(req.query.size ?? "20"), 10) || 20;
  const size = Math.min(sizeRaw, 100);
  const year = req.query.year != null ? parseInt(String(req.query.year), 10) : null;
  const month = req.query.month != null ? parseInt(String(req.query.month), 10) : null;
  const search = req.query.search != null ? String(req.query.search) : null;
  res.status(200).json(await svc.getPaymentHistory(year, month, search, page, size));
});

function parseId(raw: string | string[]): number {
  const id = parseInt(String(Array.isArray(raw) ? raw[0] : raw), 10);
  if (Number.isNaN(id)) throw AppError.badRequest("Invalid id");
  return id;
}

export { authenticate, requireAdmin, requireAdminOrLibrarian };
