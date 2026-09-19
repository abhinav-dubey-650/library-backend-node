import { z } from "zod";
import axios from "axios";
import { env } from "../../config/env";
import { AppError } from "../../core/errors/AppError";
import { logger } from "../../config/logger";

export interface OcrImage {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export interface StudentFormFields {
  fullName: string | null;
  phoneNumber: string | null;
  dob: string | null;
  address: string | null;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXTRACT_PROMPT = `You are given a photo of a student admission/registration form for a library. The form may be filled in English OR Hindi (or a mix of both).
Extract the following fields and return ONLY JSON (no markdown, no commentary):
- fullName: the full name of the student (write it in English/Roman letters)
- phoneNumber: the mobile/phone number as digits only (include the country code if visible)
- dob: the date of birth as YYYY-MM-DD (convert the form's format if needed, including Hindi dates)
- address: the full residential address translated into English
If a field is missing or not clearly visible, use null for it.`;

async function callGemini(image: OcrImage): Promise<{
  fullName?: string | null;
  phoneNumber?: string | null;
  dob?: string | null;
  address?: string | null;
}> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.OCR_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: EXTRACT_PROMPT },
          // eslint-disable-next-line @typescript-eslint/naming-convention
          { inline_data: { mime_type: image.mimetype || "image/jpeg", data: image.buffer.toString("base64") } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      // Disable the model's default "thinking" so OCR latency stays a few
      // seconds instead of 30+ (relevant for flash models that think by default).
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          fullName: { type: "STRING" },
          phoneNumber: { type: "STRING" },
          dob: { type: "STRING" },
          address: { type: "STRING" },
        },
        required: ["fullName", "phoneNumber", "dob", "address"],
      },
    },
  };

  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 45000,
      });

      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        logger.error({ model: env.OCR_MODEL }, "Vision model returned no completion");
        throw AppError.serviceUnavailable("OCR service returned no result");
      }
      return JSON.parse(text);
    } catch (e: any) {
      const status = e?.response?.status;
      const metaMsg = e?.response?.data?.error?.message;
      // 503 = "model under high demand" — transient, retry with a short backoff.
      if ((status === 503 || !e?.response) && attempt < MAX_ATTEMPTS) {
        logger.warn({ model: env.OCR_MODEL, attempt }, "Vision model transient failure, retrying");
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      if (status === 400 || status === 403 || status === 404) {
        throw AppError.internalError(metaMsg ?? `OCR provider rejected the request (${status})`);
      }
      logger.error({ err: e?.message, status }, "Gemini OCR failed");
      throw AppError.serviceUnavailable(metaMsg ?? "OCR service temporarily unavailable");
    }
  }

  // Unreachable — kept to satisfy the return type.
  throw AppError.serviceUnavailable("OCR service temporarily unavailable");
}

function sanitizePhone(raw: unknown): string | null {
  if (raw == null) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

function sanitizeDob(raw: unknown): string | null {
  if (raw == null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw).trim());
  if (!m) return null;
  const [, yy, mm, dd] = m;
  const y = Number(yy), mo = Number(mm), d = Number(dd);
  if (y < 1900 || y > new Date().getFullYear()) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${yy}-${mm}-${dd}`;
}

/**
 * Send the form image to the configured vision model and return structured
 * student fields. Provider/model are driven by env (GEMINI_API_KEY, OCR_MODEL)
 * so a model swap is a config change, not a code change.
 */
export async function extractStudentFields(image: OcrImage): Promise<StudentFormFields> {
  if (image.buffer.length > MAX_IMAGE_BYTES) {
    throw AppError.badRequest("Image is too large (max 5 MB)");
  }
  if (!env.GEMINI_API_KEY) {
    throw AppError.serviceUnavailable("OCR is not configured on the server");
  }

  try {
    const parsed = z
      .object({
        fullName: z.string().nullable().optional(),
        phoneNumber: z.string().nullable().optional(),
        dob: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
      })
      .passthrough()
      .parse(await callGemini(image));

    const fullName = parsed.fullName?.trim() || null;
    return {
      fullName,
      phoneNumber: sanitizePhone(parsed.phoneNumber),
      dob: sanitizeDob(parsed.dob),
      address: parsed.address?.trim() || null,
    };
  } catch (e: any) {
    const status = e?.response?.status;
    const metaMsg = e?.response?.data?.error?.message;
    if (status === 400 || status === 403 || status === 404) {
      throw AppError.internalError(metaMsg ?? `OCR provider rejected the request (${status})`);
    }
    logger.error({ err: e?.message }, "Gemini OCR failed");
    throw AppError.serviceUnavailable("OCR service temporarily unavailable");
  }
}