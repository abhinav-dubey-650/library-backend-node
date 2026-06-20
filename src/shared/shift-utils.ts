/** Parse HH:MM or HH:MM:SS into minutes from midnight. */
export function parseTimeToMinutes(raw: string): number {
  const parts = String(raw).substring(0, 8).split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return h * 60 + m;
}

export type ShiftTimes = { startTime: string; endTime: string };

/** True when two shift windows overlap (touching endpoints do not overlap). */
export function shiftsOverlap(a: ShiftTimes, b: ShiftTimes): boolean {
  const aStart = parseTimeToMinutes(a.startTime);
  const aEnd = parseTimeToMinutes(a.endTime);
  const bStart = parseTimeToMinutes(b.startTime);
  const bEnd = parseTimeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

/** Plans without a shift block every shift on the assigned seat. */
export function shiftBlocksSeat(
  occupantShift: ShiftTimes | null,
  targetShift: ShiftTimes
): boolean {
  if (!occupantShift) return true;
  return shiftsOverlap(occupantShift, targetShift);
}
