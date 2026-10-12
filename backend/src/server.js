import dotenv from "dotenv";
import dns from "dns";

dotenv.config();
dns.setDefaultResultOrder("ipv4first");

import app from "./app.js";
import { connectPostgres, initPostgresTables } from "./config/db.js";

import { startSocialSyncJob } from "./jobs/socialSyncJob.js";
import { startPaymentReleaseJob } from "./jobs/paymentReleaseJob.js";
import { initChatCleanupJob } from "./jobs/chatCleanup.js";
import { initPayoutEventListener } from "./services/payoutEventService.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to Supabase PostgreSQL (MongoDB removed)
    await connectPostgres();
    await initPostgresTables();

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`✅ Database: Supabase PostgreSQL`);

      // Start cron jobs AFTER database connection
      startSocialSyncJob();
      startPaymentReleaseJob();
      initChatCleanupJob();
      initPayoutEventListener();
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();