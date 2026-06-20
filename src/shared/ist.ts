/**
 * Date/time helpers fixed to Asia/Kolkata (IST, UTC+05:30), matching the Java
 * backend which used ZoneId.of("Asia/Kolkata") for every calendar-day decision.
 *
 * IST has no DST and a constant +5:30 offset, so we can compute the IST wall
 * clock by shifting the UTC epoch by the fixed offset and reading UTC fields.
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** The current instant's wall-clock fields in IST. */
function istParts(now: Date = new Date()) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1, // 1-12
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

/** Today's date in IST as an ISO `YYYY-MM-DD` string. */
export function istToday(now: Date = new Date()): string {
  const p = istParts(now);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Current year in IST. */
export function istYear(now: Date = new Date()): number {
  return istParts(now).year;
}

/** Current month (1-12) in IST. */
export function istMonth(now: Date = new Date()): number {
  return istParts(now).month;
}

/** Current day-of-month in IST. */
export function istDayOfMonth(now: Date = new Date()): number {
  return istParts(now).day;
}

/** True when `now` is the last calendar day of the month in IST. */
export function isLastDayOfMonthIST(now: Date = new Date()): boolean {
  const p = istParts(now);
  const next = new Date(Date.UTC(p.year, p.month, p.day + 1));
  return next.getUTCMonth() + 1 !== p.month;
}

/** Minutes since midnight IST for the given instant (used by EARLY_BIRD / NIGHT_OWL). */
export function istMinutesOfDay(now: Date = new Date()): number {
  const p = istParts(now);
  return p.hour * 60 + p.minute;
}

/** Wall-clock time in IST as `h:mm AM/PM` (e.g. `8:00 AM`, `2:01 PM`). */
export function formatTimeIST12h(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const p = istParts(d);
  const ampm = p.hour >= 12 ? "PM" : "AM";
  let h12 = p.hour % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad2(p.minute)} ${ampm}`;
}

/** Human duration like `6 hrs 1 min` for WhatsApp / UI. */
export function formatDurationHrsMin(totalMinutes: number): string {
  const mins = Math.max(0, Math.floor(totalMinutes));
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs === 0) return `${rem} min`;
  if (rem === 0) return `${hrs} hrs`;
  return `${hrs} hrs ${rem} min`;
}

/** ISO instant rendered as IST date + time for display. */
export function formatDateTimeIST(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const p = istParts(d);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${pad2(p.day)} ${months[p.month - 1]} ${p.year}, ${formatTimeIST12h(d)}`;
}

/** Session calendar date in IST from a check-in instant (`YYYY-MM-DD`). */
export function istDateFromInstant(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const p = istParts(d);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** ISO date `YYYY-MM-DD` → `30 Jun 2026` */
export function formatDateShortIST(iso: string): string {
  const parts = iso.substring(0, 10).split("-");
  const y = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "1", 10);
  const d = parseInt(parts[2] ?? "1", 10);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function formatBillingMonth(year: number, month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[month - 1]} ${year}`;
}

export function formatINRAmount(amount: number | string): string {
  return Math.round(Number(amount)).toLocaleString("en-IN");
}

/** Number of days in a given month (1-12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Billing day for a month when anchor is e.g. 31 → Feb 28/29. */
export function billingDayForMonth(anchorDay: number, year: number, month: number): number {
  return Math.min(anchorDay, daysInMonth(year, month));
}

export function isBillingAnniversaryToday(subscriptionStartDate: string, today: string): boolean {
  const anchorDay = parseInt(subscriptionStartDate.substring(8, 10), 10);
  const year = parseInt(today.substring(0, 4), 10);
  const month = parseInt(today.substring(5, 7), 10);
  const day = parseInt(today.substring(8, 10), 10);
  return day === billingDayForMonth(anchorDay, year, month);
}

/** True when `today` is a plan billing day: every `durationDays` since subscription start (day 0 = join). */
export function isPlanBillingCycleDay(
  subscriptionStartDate: string,
  today: string,
  durationDays: number
): boolean {
  if (durationDays <= 0) return false;
  const daysSinceStart = daysBetween(today, subscriptionStartDate);
  if (daysSinceStart <= 0) return false;
  return daysSinceStart % durationDays === 0;
}

/** First day of the month as `YYYY-MM-DD`. */
export function monthStart(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

/** Last day of the month as `YYYY-MM-DD`. */
export function monthEnd(year: number, month: number): string {
  return `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`;
}

/**
 * Hours rendering — EXACT port of the Java `Math.round(minutes / 6.0) / 10.0`.
 * Note this is deliberately NOT minutes/60: e.g. 360 min -> 6.0, 365 -> 6.1.
 */
export function minutesToHours(minutes: number): number {
  return Math.round(minutes / 6.0) / 10.0;
}

/** Whole days between two ISO dates (a - b), positive when a is later. */
export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(`${aIso}T00:00:00Z`);
  const b = Date.parse(`${bIso}T00:00:00Z`);
  return Math.round((a - b) / 86400000);
}

/** Add `n` days to an ISO date, returning a new ISO date. */
export function addDays(iso: string, n: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`) + n * 86400000;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
