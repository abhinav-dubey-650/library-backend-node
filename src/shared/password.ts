import crypto from "crypto";

const SCRYPT_PREFIX = "scrypt:";
const SCRYPT_KEYLEN = 64;

function legacySha256(password: string): string {
  return crypto.createHash("sha256").update(password, "utf8").digest("hex");
}

/** New passwords use scrypt. Existing SHA-256 hashes keep working until next login. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${SCRYPT_PREFIX}${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    const body = storedHash.slice(SCRYPT_PREFIX.length);
    const colon = body.indexOf(":");
    if (colon < 0) return false;
    const salt = body.slice(0, colon);
    const expected = body.slice(colon + 1);
    const computed = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(computed, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  return legacySha256(password).toLowerCase() === storedHash.toLowerCase();
}

export function needsPasswordRehash(storedHash: string): boolean {
  return !storedHash.startsWith(SCRYPT_PREFIX);
}
