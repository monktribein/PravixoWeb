import { query } from "../config/postgres.js";
import { sendPushToUsers } from "../utils/webPush.js";

// POST /api/admin/broadcast
export const sendBroadcast = async (req, res) => {
  try {
    const { title, message, audience = "all", targetUrl = "/" } = req.body;
    const adminId = req.user?._id || req.user?.profileId || req.body.adminId;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required for broadcast.",
      });
    }

    let roleFilter = "";
    if (audience === "creators") {
      roleFilter = "AND role = 'creator'";
    } else if (audience === "brands") {
      roleFilter = "AND role = 'brand'";
    } else {
      roleFilter = "AND role IN ('creator', 'brand')";
    }

    const { rows: recipients } = await query(
      `SELECT id FROM profiles WHERE is_deleted = false ${roleFilter};`
    );

    if (!recipients || recipients.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No users found for the selected audience.",
        count: 0,
      });
    }

    const recipientIds = recipients.map((r) => r.id);
    const fullText = `${title.trim()}: ${message.trim()}`;

    // Bulk insert in-app notifications
    for (const userId of recipientIds) {
      await query(
        `
        INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
        VALUES ($1, $2, 'admin_broadcast', $3, $4, false, NOW())
        ON CONFLICT DO NOTHING;
        `,
        [userId, adminId || userId, fullText, targetUrl || "/"]
      ).catch((err) => console.error("Broadcast in-app insert error:", err.message));
    }

    // Chunk web push
    const chunkSize = 500;
    for (let i = 0; i < recipientIds.length; i += chunkSize) {
      const chunk = recipientIds.slice(i, i + chunkSize);
      sendPushToUsers(chunk, {
        title: title.trim(),
        body: message.trim(),
        icon: "/logo192.png",
        url: targetUrl || "/",
      }).catch((err) => console.error("Broadcast web push batch error:", err.message));
    }

    return res.status(200).json({
      success: true,
      message: `Broadcast sent to ${recipientIds.length} users successfully.`,
      count: recipientIds.length,
    });
  } catch (error) {
    console.error("sendBroadcast error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send broadcast.",
      error: error.message,
    });
  }
};
