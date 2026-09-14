import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

import { corsOrigins } from "../config/env";
import { TtlCache } from "../shared/ttlCache";
import { findConfigByKey, upsertConfig } from "../modules/config/config.repository";

export const KIOSK_KEY_CONFIG = "qr_kiosk_secret";

const KIOSK_DESCRIPTION =
  "Secret access key embedded in the library wall QR code for the attendance kiosk. Rotating it invalidates printed QR codes until they are reprinted.";

// Short-lived cache so the hot /scan polling path avoids a DB hit on every
// request, while an admin rotation still takes effect within ~45s.
const secretCache = new TtlCache<string>(45_000);

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Return the configured kiosk secret, auto-generating + persisting one on first use. */
export async function getKioskSecret(): Promise<string> {
  const cached = secretCache.get(KIOSK_KEY_CONFIG);
  if (cached) return cached;

  const row = await findConfigByKey(KIOSK_KEY_CONFIG);
  let secret = row?.config_value?.trim() ?? "";
  if (!secret) {
    secret = crypto.randomBytes(12).toString("hex");
    await upsertConfig(KIOSK_KEY_CONFIG, secret, KIOSK_DESCRIPTION);
  }
  secretCache.set(KIOSK_KEY_CONFIG, secret);
  return secret;
}

/**
 * Gate for the public QR attendance kiosk:
 *  - requires the kiosk key (X-Kiosk-Key header or `?k=` query), compared in
 *    constant time so simple timing attacks can't extract the secret.
 *  - for non-GET requests, a browser-supplied Origin must be one of the allowed
 *    frontend origins (CSRF/abuse defense-in-depth).
 * Rejects with 401/403 before any business logic runs.
 */
export async function kioskAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.get("x-kiosk-key");
    const query = typeof req.query?.k === "string" ? req.query.k : "";
    const supplied = String(header ?? query ?? "").trim();

    if (!supplied) {
      res.status(401).json({ message: "Invalid or missing access key. Scan the QR code from the library wall." });
      return;
    }

    const secret = await getKioskSecret();
    if (!safeEqual(supplied, secret)) {
      res.status(401).json({ message: "Invalid or missing access key. Scan the QR code from the library wall." });
      return;
    }

    if (req.method !== "GET" && req.headers.origin && !corsOrigins.includes(req.headers.origin)) {
      res.status(403).json({ message: "Request blocked by security policy." });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}