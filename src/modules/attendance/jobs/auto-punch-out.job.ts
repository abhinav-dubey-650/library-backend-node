import cron from "node-cron";
import { logger } from "../../../config/logger";
import { autoPunchOutAtShiftEnd } from "../attendance.service";
import * as bookingRepo from "../../booking/booking.repository";

/**
 * Schedule one cron job per unique shift end time (IST).
 * Fires exactly at shift end — no 5-minute polling.
 */
export async function startAutoPunchOutJob(): Promise<void> {
  const rows = await bookingRepo.findAllShifts();
  const active = rows.filter((s) => s.is_active !== false);

  const endTimes = new Map<string, string>();
  for (const s of active) {
    const end = String(s.end_time).substring(0, 5);
    endTimes.set(end, end);
  }

  if (endTimes.size === 0) {
    logger.info("No active shifts — auto punch-out scheduler skipped");
    return;
  }

  for (const end of endTimes.values()) {
    const [hh, mm] = end.split(":");
    const hour = parseInt(hh ?? "0", 10);
    const minute = parseInt(mm ?? "0", 10);
    const cronExpr = `${minute} ${hour} * * *`;

    cron.schedule(
      cronExpr,
      async () => {
        try {
          const count = await autoPunchOutAtShiftEnd(end);
          if (count > 0) {
            logger.info({ end, count }, "Auto punch-out at shift end");
          }
        } catch (error) {
          logger.error({ error, end }, "Auto punch-out job failed");
        }
      },
      { timezone: "Asia/Kolkata" }
    );

    logger.info({ end, cronExpr }, "Auto punch-out scheduled (IST)");
  }
}
