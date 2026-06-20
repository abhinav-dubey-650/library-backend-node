import { SimpleDatabase } from "../../core/database/SimpleDatabase";
import { formatDurationHrsMin, formatTimeIST12h } from "../../shared/ist";
import { whatsappConfig, SCOPE_KEY } from "./whatsapp.config";
import * as wa from "./whatsapp.service";

export const PUNCH_IN_TEMPLATE = "library_punchin";
export const PUNCH_OUT_TEMPLATE = "library_punchout";
const TEMPLATE_LANGUAGE = "en";
const DEFAULT_LOCATION = "BR Ambedkar Library, Nadipar";

async function getLibraryLocationName(): Promise<string> {
  const res = await SimpleDatabase.query(
    `SELECT config_value FROM library_config WHERE config_key = 'library_name' LIMIT 1`,
    []
  );
  const value = res.rows[0]?.config_value;
  return value ? String(value).trim() : DEFAULT_LOCATION;
}

async function loadUserForNotify(userId: number) {
  const res = await SimpleDatabase.query(
    `SELECT id, full_name, phone_number FROM users WHERE id = $1`,
    [userId]
  );
  return res.rows[0] ?? null;
}

export async function notifyPunchInIfNeeded(userId: number, checkInTime: Date): Promise<void> {
  const user = await loadUserForNotify(userId);
  if (!user?.phone_number) return;
  if (!whatsappConfig.enabled) return;

  const location = await getLibraryLocationName();
  void wa
    .sendTemplateMessage(
      String(user.phone_number),
      PUNCH_IN_TEMPLATE,
      TEMPLATE_LANGUAGE,
      {
        "1": String(user.full_name).trim(),
        "2": formatTimeIST12h(checkInTime),
        "3": location,
      },
      SCOPE_KEY,
      userId,
      false
    )
    .catch(() => {
      /* fire-and-forget */
    });
}

export async function notifyPunchOutIfNeeded(
  userId: number,
  checkInTime: Date,
  checkOutTime: Date
): Promise<void> {
  const user = await loadUserForNotify(userId);
  if (!user?.phone_number) return;
  if (!whatsappConfig.enabled) return;

  const sessionMinutes = Math.max(
    0,
    Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000)
  );

  void wa
    .sendTemplateMessage(
      String(user.phone_number),
      PUNCH_OUT_TEMPLATE,
      TEMPLATE_LANGUAGE,
      {
        "1": String(user.full_name).trim(),
        "2": formatTimeIST12h(checkInTime),
        "3": formatTimeIST12h(checkOutTime),
        "4": formatDurationHrsMin(sessionMinutes),
      },
      SCOPE_KEY,
      userId,
      false
    )
    .catch(() => {
      /* fire-and-forget */
    });
}
