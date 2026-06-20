import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional().default("8080"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Optional Java-style split credentials (same keys as library-backend/.env)
  DATABASE_USERNAME: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),

  // Auth — must match the original Java backend.
  APP_TOKEN_SECRET: z.string().optional().default("bra-library-fallback-secret-key-2026"),
  APP_ADMIN_PIN: z.string().optional().default("560059"),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .default("http://localhost:3000,http://127.0.0.1:3000"),

  LOG_LEVEL: z.string().optional().default("info"),

  // WhatsApp (Phase 2)
  WHATSAPP_ENABLED: z.string().optional().default("false"),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional().default(""),
  WHATSAPP_API_VERSION: z.string().optional().default("v21.0"),
  WHATSAPP_BASE_URL: z.string().optional().default("https://graph.facebook.com"),
  WHATSAPP_RATE_LIMIT_PER_SECOND: z.string().optional().default("80"),
  WHATSAPP_RATE_LIMIT_PER_DAY: z.string().optional().default("10000"),
  WHATSAPP_MONTHLY_COLLECTION_RECIPIENTS: z.string().optional().default(""),
  WHATSAPP_QUEUE_RETENTION_DAYS: z.string().optional().default("10"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);

export const isProduction = env.NODE_ENV === "production";

export const getNumber = (value: string | undefined, fallback: number): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const corsOrigins: string[] = env.CORS_ALLOWED_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter((o) => o.length > 0);

/**
 * Build a node-postgres connection string from env.
 * Accepts the same Java/Spring JDBC URL format used by library-backend:
 *   jdbc:postgresql://host/db?sslmode=require
 * with optional separate DATABASE_USERNAME / DATABASE_PASSWORD.
 */
export const buildDatabaseUrl = (): string => {
  let url = env.DATABASE_URL.trim();

  if (url.startsWith("jdbc:postgresql://")) {
    url = `postgresql://${url.slice("jdbc:postgresql://".length)}`;
  } else if (url.startsWith("jdbc:postgres://")) {
    url = `postgresql://${url.slice("jdbc:postgres://".length)}`;
  }

  const username = env.DATABASE_USERNAME?.trim();
  const password = env.DATABASE_PASSWORD?.trim();

  if (username && password && !url.includes("@")) {
    const parsed = new URL(url);
    parsed.username = encodeURIComponent(username);
    parsed.password = encodeURIComponent(password);
    url = parsed.toString();
  }

  return url;
};
