import webpush from "web-push";
import { query } from "../config/postgres.js";

let isVapidConfigured = false;

function ensureVapidDetails() {
  if (isVapidConfigured) return true;

  const email = process.env.VAPID_EMAIL || "mailto:admin@example.com";
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.warn("⚠️ VAPID keys not configured in environment variables.");
    return false;
  }

  const subject = email.startsWith("mailto:") || email.startsWith("http")
    ? email
    : `mailto:${email}`;

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isVapidConfigured = true;
    return true;
  } catch (err) {
    console.error("Failed to initialize VAPID details:", err.message);
    return false;
  }
}

export const sendPushToUser = async (userId, payload) => {
  if (!ensureVapidDetails()) {
    return [];
  }

  try {
    const res = await query(
      "SELECT id, endpoint, keys FROM push_subscriptions WHERE user_id::text = $1",
      [String(userId).trim()]
    );

    const subs = res.rows;

    return Promise.allSettled(
      subs.map((sub) => {
        const keysObj = typeof sub.keys === "string" ? JSON.parse(sub.keys) : sub.keys;
        return webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: keysObj },
            JSON.stringify(payload)
          )
          .catch(async (err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
            } else {
              console.error("Push error:", err.message);
            }
          });
      })
    );
  } catch (err) {
    console.error("sendPushToUser error:", err.message);
    return [];
  }
};

export const sendPushToUsers = async (userIds, payload) => {
  return Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)));
};