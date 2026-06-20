import { env, getNumber } from "../../config/env";

export const SCOPE_KEY = "library";

export const whatsappConfig = {
  enabled: env.WHATSAPP_ENABLED === "true",
  accessToken: env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
  apiVersion: env.WHATSAPP_API_VERSION,
  baseUrl: env.WHATSAPP_BASE_URL,
  rateLimitPerSecond: getNumber(env.WHATSAPP_RATE_LIMIT_PER_SECOND, 80),
  rateLimitPerDay: getNumber(env.WHATSAPP_RATE_LIMIT_PER_DAY, 10000),
  queueRetentionDays: getNumber(env.WHATSAPP_QUEUE_RETENTION_DAYS, 10),
  scopeKey: SCOPE_KEY,
};

export function formatPhone(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return "";
  let cleaned = phoneNumber.replace(/\D/g, "");
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  else if (cleaned.length === 11 && cleaned.startsWith("0")) cleaned = "91" + cleaned.slice(1);
  return cleaned;
}

export function buildTemplateComponents(variables: Record<string, unknown>): object[] {
  if (!variables || Object.keys(variables).length === 0) return [];
  const bodyParams = Object.entries(variables)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ type: "text", text: String(v) }));
  return [{ type: "body", parameters: bodyParams }];
}

export function newBatchId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
