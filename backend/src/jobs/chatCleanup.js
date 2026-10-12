import cron from "node-cron";
import { query } from "../config/postgres.js";

// Run once a day at midnight
export const initChatCleanupJob = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("[CRON] Starting 7-day chat cleanup...");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Find all conversations where updated_at is older than 7 days
      const staleConvs = await query(
        `SELECT id FROM conversations WHERE updated_at < $1`,
        [sevenDaysAgo]
      );

      if (staleConvs.rows.length === 0) {
        console.log("[CRON] No stale conversations found.");
        return;
      }

      const convIds = staleConvs.rows.map((c) => c.id);

      // Delete messages
      const delMsgs = await query(
        `DELETE FROM messages WHERE conversation_id = ANY($1::uuid[])`,
        [convIds]
      );

      // Delete conversations
      const delConvs = await query(
        `DELETE FROM conversations WHERE id = ANY($1::uuid[])`,
        [convIds]
      );

      console.log(`[CRON] Cleaned up ${delConvs.rowCount || 0} conversations and ${delMsgs.rowCount || 0} messages.`);
    } catch (error) {
      console.error("[CRON] Chat cleanup job failed:", error);
    }
  });
};
