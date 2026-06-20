import cron from "node-cron";
import { logger } from "../../../config/logger";
import { SimpleDatabase } from "../../../core/database/SimpleDatabase";
import { evaluateAndAward } from "../achievements.service";

/** Evaluate badges for every active member — awards + WhatsApp fire in background, not on page visit. */
export async function runAchievementEvaluationForAllMembers(): Promise<number> {
  const res = await SimpleDatabase.query(
    `SELECT id FROM users WHERE role = 'MEMBER' AND is_active = true ORDER BY id`,
    []
  );
  let processed = 0;
  for (const row of res.rows) {
    try {
      await evaluateAndAward(Number(row.id));
      processed++;
    } catch (error) {
      logger.error({ error, userId: row.id }, "Background achievement evaluation failed for member");
    }
  }
  return processed;
}

export function startAchievementEvaluationJob(): void {
  cron.schedule(
    "0 */4 * * *",
    async () => {
      try {
        const count = await runAchievementEvaluationForAllMembers();
        logger.info({ count }, "Background achievement evaluation batch completed");
      } catch (error) {
        logger.error({ error }, "Background achievement evaluation job failed");
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  logger.info("Achievement evaluation cron started (every 4 hours IST)");
}
