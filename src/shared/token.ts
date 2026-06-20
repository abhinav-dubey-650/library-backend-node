import crypto from "crypto";
import { env } from "../config/env";

/**
 * Auth token — exact port of the Java TokenService. This is NOT a standard JWT.
 *
 *   payload   = `${userId}:${memberId}:${role}:${expiryMillis}`
 *   signature = base64( HMAC_SHA256(payload, secret) )          // standard base64, padded
 *   token     = base64url( `${payload}::${signature}` )         // url-safe, no padding
 *
 * 7-day expiry. Because the secret (APP_TOKEN_SECRET) and algorithm match the
 * Java app, tokens issued by either backend validate on the other, and tokens
 * already held by the frontend keep working.
 */

const SECRET = env.APP_TOKEN_SECRET;
const SEVEN_DAYS_MS = 86400000 * 7;

export interface TokenData {
  userId: number;
  memberId: string;
  role: string;
}

function calculateHmac(data: string): string {
  return crypto.createHmac("sha256", Buffer.from(SECRET, "utf8")).update(data, "utf8").digest("base64");
}

export function generateToken(userId: number, memberId: string, role: string): string {
  const expiry = Date.now() + SEVEN_DAYS_MS;
  const payload = `${userId}:${memberId}:${role}:${expiry}`;
  const signature = calculateHmac(payload);
  return Buffer.from(`${payload}::${signature}`, "utf8").toString("base64url");
}

export function validateToken(tokenStr: string): TokenData | null {
  try {
    const decoded = Buffer.from(tokenStr, "base64url").toString("utf8");
    const parts = decoded.split("::");
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const expectedSignature = calculateHmac(payload);

    // Timing-safe compare on the UTF-8 bytes (mirrors MessageDigest.isEqual).
    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expectedSignature, "utf8");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const data = payload.split(":");
    if (data.length !== 4) return null;

    const userId = Number.parseInt(data[0], 10);
    const memberId = data[1];
    const role = data[2];
    const expiry = Number.parseInt(data[3], 10);
    if (Number.isNaN(userId) || Number.isNaN(expiry)) return null;

    if (Date.now() > expiry) return null; // expired

    return { userId, memberId, role };
  } catch {
    return null;
  }
}
