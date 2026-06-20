import { env, isProduction } from "../config/env";
import { logger } from "../config/logger";

const FALLBACK_TOKEN_SECRET = "bra-library-fallback-secret-key-2026";
const FALLBACK_ADMIN_PIN = "560059";

/** Refuse to start in production with default auth secrets. */
export function validateProductionSecrets(): void {
  if (!isProduction) return;

  const issues: string[] = [];
  if (!process.env.APP_TOKEN_SECRET || env.APP_TOKEN_SECRET === FALLBACK_TOKEN_SECRET) {
    issues.push("APP_TOKEN_SECRET must be set to a strong random value in production");
  }
  if (!process.env.APP_ADMIN_PIN || env.APP_ADMIN_PIN === FALLBACK_ADMIN_PIN) {
    issues.push("APP_ADMIN_PIN must be set to a non-default value in production");
  }
  if (issues.length > 0) {
    throw new Error(`Production security check failed:\n- ${issues.join("\n- ")}`);
  }
  logger.info("Production auth secrets validated");
}
