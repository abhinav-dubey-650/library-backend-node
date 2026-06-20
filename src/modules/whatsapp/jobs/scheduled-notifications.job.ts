import cron from "node-cron";
import { logger } from "../../../config/logger";
import { whatsappConfig } from "../whatsapp.config";
import { isLastDayOfMonthIST } from "../../../shared/ist";
import {
  runFeeReminders,
  runSubscriptionExpiryReminders,
  runExamCountdownReminders,
  runStudentOfTheMonthNotifications,
} from "../library-notifications.service";

/** Scheduled WhatsApp notifications — all times IST (Asia/Kolkata). */
export function startWhatsAppScheduledJobs(): void {
  if (!whatsappConfig.enabled) {
    logger.info("WhatsApp disabled — scheduled notification crons not started");
    return;
  }

  // Fee reminders: 5th, 15th and 25th at 12:00 PM IST (members with pending balance only)
  cron.schedule(
    "0 12 5 * *",
    async () => {
      try {
        const count = await runFeeReminders();
        logger.info({ count, day: 5 }, "Fee reminder WhatsApp batch (5th)");
      } catch (error) {
        logger.error({ error }, "Fee reminder job failed (5th)");
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  cron.schedule(
    "0 12 15 * *",
    async () => {
      try {
        const count = await runFeeReminders();
        logger.info({ count, day: 15 }, "Fee reminder WhatsApp batch (15th)");
      } catch (error) {
        logger.error({ error }, "Fee reminder job failed (15th)");
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  cron.schedule(
    "0 12 25 * *",
    async () => {
      try {
        const count = await runFeeReminders();
        logger.info({ count, day: 25 }, "Fee reminder WhatsApp batch (25th)");
      } catch (error) {
        logger.error({ error }, "Fee reminder job failed (25th)");
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  // Subscription expiry: daily 12:00 PM IST (last 10 days)
  cron.schedule(
    "0 12 * * *",
    async () => {
      try {
        const count = await runSubscriptionExpiryReminders();
        if (count > 0) {
          logger.info({ count }, "Subscription expiry WhatsApp reminders sent");
        }
      } catch (error) {
        logger.error({ error }, "Subscription expiry job failed");
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  // Exam countdown: Tuesday & Saturday at 12:00 PM IST
  cron.schedule(
    "0 12 * * 2",
    async () => {
      try {
        const count = await runExamCountdownReminders();
        logger.info({ count, weekday: "Tuesday" }, "Exam countdown WhatsApp batch");
      } catch (error) {
        logger.error({ error }, "Exam countdown job failed (Tuesday)");
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  cron.schedule(
    "0 12 * * 6",
    async () => {
      try {
        const count = await runExamCountdownReminders();
        logger.info({ count, weekday: "Saturday" }, "Exam countdown WhatsApp batch");
      } catch (error) {
        logger.error({ error }, "Exam countdown job failed (Saturday)");
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  // Student of the Month: last day of month at 12:00 PM IST (full current month stats)
  cron.schedule(
    "0 12 * * *",
    async () => {
      if (!isLastDayOfMonthIST()) return;
      try {
        const count = await runStudentOfTheMonthNotifications();
        logger.info({ count }, "Student of the Month WhatsApp notifications (last day of month)");
      } catch (error) {
        logger.error({ error }, "Student of the Month job failed");
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  logger.info("WhatsApp scheduled notification crons started (IST)");
}
