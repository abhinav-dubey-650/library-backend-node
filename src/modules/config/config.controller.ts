import { createHandler } from "../../core/http/createHandler";
import { AppError } from "../../core/errors/AppError";
import { isProduction } from "../../config/env";
import { optionalAuth } from "../../middlewares/optionalAuth";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireAdmin } from "../../middlewares/requireRole";
import { requirePin } from "../../middlewares/adminPin";
import * as svc from "./config.service";

const PIN_PROTECTED_KEYS = new Set(["login_image_url", "developer_credit", "admin_whatsapp_numbers"]);

const WRITABLE_CONFIG_KEYS = new Set([
  "library_name",
  "school_affiliation",
  "developer_credit",
  "login_image_url",
  "admin_whatsapp_numbers",
  "fee_due_day",
  "fee_grace_days",
]);

export const getAll = createHandler(async (req, res) => {
  res.status(200).json(await svc.getAllConfigs(req.user?.role ?? null));
});

export const update = createHandler(async (req, res) => {
  const key = String(Array.isArray(req.params.key) ? req.params.key[0] : req.params.key);
  if (!WRITABLE_CONFIG_KEYS.has(key)) {
    throw AppError.forbidden(`Config key cannot be updated: ${key}`);
  }
  const bodyValue = req.body?.value;
  const queryValue = req.query.value;
  const value =
    bodyValue != null && String(bodyValue).trim() !== ""
      ? String(bodyValue)
      : queryValue != null
        ? String(queryValue)
        : "";
  if (!value.trim()) throw AppError.badRequest("value is required in JSON body or query param");
  if (PIN_PROTECTED_KEYS.has(key)) {
    requirePin(req.header("X-Admin-Pin"));
  }
  res.status(200).json(await svc.updateConfig(key, value));
});

export { optionalAuth, authenticate, requireAdmin };
