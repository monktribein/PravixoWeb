import express from "express";
import { protect } from "../middleware/auth.js";
import { query } from "../config/postgres.js";

const router = express.Router();

router.post("/subscribe", protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, message: "Subscription payload is required." });
    }

    const userId = req.user._id || req.user.profileId;

    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, keys, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, endpoint)
       DO UPDATE SET keys = EXCLUDED.keys, updated_at = NOW()`,
      [userId, subscription.endpoint, JSON.stringify(subscription.keys)]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/test", protect, async (req, res) => {
  try {
    const { sendPushToUser } = await import("../utils/webPush.js");
    const userId = req.user._id || req.user.profileId;
    const result = await sendPushToUser(userId, {
      title: "Test Notification 🚀",
      body: "Web Push Notifications are working perfectly on Pravixo!",
      url: "/dashboard",
    });
    res.json({ success: true, message: "Push sent", result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;