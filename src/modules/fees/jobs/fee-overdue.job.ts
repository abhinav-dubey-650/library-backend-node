import cron from "node-cron";
import { logger } from "../../../config/logger";
import { scheduledOverdueCheck } from "../fees.service";

/**
 * Daily fee overdue check — mirrors Java FeeService @Scheduled(cron = "0 0 6 * * *").
 * Runs at 06:00 server local time (same as Spring default when JVM timezone is system default).
 */
export function startFeeOverdueJob(): void {
  cron.schedule("0 0 6 * * *", async () => {
    try {
      await scheduledOverdueCheck();
      logger.info("Fee overdue cron completed");
    } catch (error) {
      logger.error({ error }, "Fee overdue cron failed");
    }
  });
  logger.info("Fee overdue cron scheduled (daily at 06:00)");
}
