import cron from "node-cron";
import { logger } from "../../../config/logger";
import { whatsappConfig } from "../whatsapp.config";
import { resetFailedMessagesForRetry } from "../queue.service";
import { processQueuedMessages, cleanupOldQueueMessages } from "../whatsapp.service";

/** Daily queue processing — 12:03 AM IST (0 3 0 * * * server-local; use TZ=Asia/Kolkata in prod). */
export function startWhatsAppMaintenanceJobs(): void {
  if (!whatsappConfig.enabled) {
    logger.info("WhatsApp disabled — maintenance crons not scheduled");
    return;
  }

  cron.schedule("0 3 0 * * *", async () => {
    try {
      logger.info("Starting daily WhatsApp queue processing");
      await resetFailedMessagesForRetry();
      await processQueuedMessages();
    } catch (error) {
      logger.error({ error }, "WhatsApp queue processing failed");
    }
  });

  cron.schedule("0 10 0 * * *", async () => {
    try {
      const deleted = await cleanupOldQueueMessages(whatsappConfig.queueRetentionDays);
      logger.info({ deleted }, "WhatsApp queue cleanup completed");
    } catch (error) {
      logger.error({ error }, "WhatsApp queue cleanup failed");
    }
  });

  logger.info("WhatsApp maintenance crons scheduled");
}
