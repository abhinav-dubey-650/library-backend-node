import cron from "node-cron";
import { logger } from "../../../config/logger";
import { runAutoFeeGenerationForToday } from "../fees.service";

/** Auto-generate monthly invoices on each member's join-date anniversary (12:00 PM IST). */
export function startAutoFeeGenerationJob(): void {
  cron.schedule(
    "0 12 * * *",
    async () => {
      try {
        const result = await runAutoFeeGenerationForToday();
        if (result.created > 0) {
          logger.info(result, "Auto fee generation completed");
        }
      } catch (error) {
        logger.error({ error }, "Auto fee generation job failed");
      }
    },
    { timezone: "Asia/Kolkata" }
  );
  logger.info("Auto fee generation cron started (daily 12:00 PM IST, every plan duration_days from join)");
}
