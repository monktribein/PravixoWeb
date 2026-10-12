import { query } from "../config/postgres.js";
import { formatMessage } from "../utils/formatters.js";
import { sendPushToUser } from "../utils/webPush.js";

// Helper to check valid UUID
const isUuid = (str) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

// Send message (text or image/video media)
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, senderId, text, messageType: requestedType, metadata: rawMetadata } = req.body;

    let parsedMetadata = null;
    if (rawMetadata) {
      try {
        parsedMetadata = typeof rawMetadata === "string" ? JSON.parse(rawMetadata) : rawMetadata;
      } catch {
        parsedMetadata = null;
      }
    }

    let actualSenderId = req.user?._id || req.user?.profileId || senderId;

    if (!actualSenderId && conversationId) {
      const convRes = await query("SELECT admin_id FROM conversations WHERE id::text = $1", [conversationId.trim()]);
      if (convRes.rows.length > 0) {
        if (convRes.rows[0].admin_id) {
          actualSenderId = convRes.rows[0].admin_id;
        } else {
          const adminProfRes = await query("SELECT id FROM profiles WHERE role = 'admin' LIMIT 1");
          if (adminProfRes.rows.length > 0) actualSenderId = adminProfRes.rows[0].id;
        }
      }
    }

    const hasFile = Boolean(req.file);
    const isAudio =
      hasFile &&
      (req.file.mimetype?.startsWith("audio/") ||
        req.file.originalname?.endsWith(".webm") ||
        req.file.originalname?.endsWith(".mp3") ||
        req.file.originalname?.endsWith(".wav") ||
        req.file.originalname?.endsWith(".ogg"));

    let resolvedMessageType = requestedType || "text";
    if (hasFile) {
      if (isAudio || requestedType === "voice_note") {
        resolvedMessageType = "voice_note";
      } else {
        resolvedMessageType = "media";
      }
    } else if (requestedType === "timestamp_feedback") {
      resolvedMessageType = "timestamp_feedback";
    }

    const defaultFallbackText =
      isAudio || resolvedMessageType === "voice_note"
        ? "🎤 Voice Note"
        : req.file?.mimetype?.startsWith("video/")
        ? "🎥 Video"
        : hasFile
        ? "📷 Photo"
        : "💬 Message";

    const messageText = (text && text.trim()) || defaultFallbackText;

    if (!conversationId || !actualSenderId || (!messageText && !hasFile)) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing.",
      });
    }

    // Prohibited content detection (Phone, Email, External contact sharing)
    if (text && typeof text === "string") {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
      const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}|\b\d{10}\b|\b\d{5}[-\s]?\d{5}\b/g;
      const disguisedPhoneRegex = /\b(\d\s*){10,}\b/;

      const digitsOnly = text.replace(/\D/g, "");
      const hasSuspiciousPhoneNumber =
        (digitsOnly.length >= 10 && digitsOnly.length <= 13) ||
        phoneRegex.test(text) ||
        disguisedPhoneRegex.test(text);
      const hasEmail = emailRegex.test(text);

      if (hasEmail || hasSuspiciousPhoneNumber) {
        return res.status(400).json({
          success: false,
          isProhibited: true,
          message:
            "⚠️ Sharing personal contact details (phone numbers, email addresses, or off-platform contact) is strictly prohibited. All communication must stay on Pravixo. Repeated violations will result in immediate account suspension.",
        });
      }
    }

    let fileUrl = null;
    let fileType = null;
    if (hasFile) {
      if (req.file.path && (req.file.path.startsWith("http://") || req.file.path.startsWith("https://"))) {
        fileUrl = req.file.path;
      } else {
        fileUrl = `/uploads/${req.file.filename}`;
      }
      fileType = isAudio ? "audio" : req.file.mimetype?.startsWith("video/") ? "video" : "image";
    }

    const finalMetadata = hasFile
      ? {
          contentUrl: fileUrl,
          mediaType: fileType,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          ...(parsedMetadata || {}),
        }
      : parsedMetadata || null;

    const insertRes = await query(
      `INSERT INTO messages (
        conversation_id, sender_id, text, read, message_type, metadata
      ) VALUES ($1, $2, $3, false, $4, $5)
      RETURNING *`,
      [
        conversationId.trim(),
        actualSenderId,
        messageText,
        resolvedMessageType,
        finalMetadata ? JSON.stringify(finalMetadata) : null,
      ]
    );

    const message = formatMessage(insertRes.rows[0]);

    // Update conversation status and updated_at
    const convRes = await query(
      `UPDATE conversations
       SET status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
           archived = false,
           updated_at = NOW()
       WHERE id::text = $1
       RETURNING *`,
      [conversationId.trim()]
    );

    if (convRes.rows.length > 0) {
      const conversation = convRes.rows[0];
      let recipientId = null;
      const actualSenderStr = String(actualSenderId);

      if (conversation.creator_id && String(conversation.creator_id) !== actualSenderStr) {
        recipientId = conversation.creator_id;
      } else if (conversation.brand_id && String(conversation.brand_id) !== actualSenderStr) {
        recipientId = conversation.brand_id;
      } else if (conversation.admin_id && String(conversation.admin_id) !== actualSenderStr) {
        recipientId = conversation.admin_id;
      }

      if (recipientId) {
        const senderProfRes = await query(
          "SELECT full_name, role FROM profiles WHERE id::text = $1",
          [actualSenderStr]
        );
        const senderProfile = senderProfRes.rows[0];
        const senderName =
          senderProfile?.full_name || (senderProfile?.role === "admin" ? "Pravixo Admin" : "User");
        const safeText = (text && typeof text === "string" ? text.trim() : "") || messageText || "Sent an attachment";
        const preview = safeText.length > 60 ? `${safeText.slice(0, 60)}...` : safeText;

        // In-App Notification
        query(
          `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at)
           VALUES ($1, $2, 'new_message', $3, $4, $5)`,
          [
            recipientId,
            actualSenderId,
            `New message from ${senderName}: "${preview}"`,
            `/messages?conversationId=${conversationId}`,
            Date.now(),
          ]
        ).catch((notifErr) => console.warn("Could not dispatch message notification:", notifErr));

        // Web Push Notification
        sendPushToUser(recipientId, {
          title: `New message from ${senderName} 💬`,
          body: preview,
          url: `/messages?conversationId=${conversationId}`,
        }).catch((err) => console.error("Chat push error:", err.message));
      }
    }

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message.",
    });
  }
};

// Get messages
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: "conversationId is required." });
    }

    const result = await query(
      `SELECT * FROM messages
       WHERE conversation_id::text = $1
       ORDER BY created_at ASC`,
      [conversationId.trim()]
    );

    const messages = result.rows.map(formatMessage);

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages.",
    });
  }
};

// Unsend / Delete message
export const unsendMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { profileId, mode = "for_everyone", deleteFromDb = false } = req.body;

    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    const msgRes = await query("SELECT * FROM messages WHERE id::text = $1", [messageId.trim()]);
    if (msgRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    const message = msgRes.rows[0];
    const isSender = String(message.sender_id) === String(profileId);
    const userRole = req.user?.role || "user";
    const isAdmin = userRole === "admin";

    if (deleteFromDb) {
      if (!isSender && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You can only permanently delete your own messages.",
        });
      }

      await query("DELETE FROM messages WHERE id::text = $1", [messageId.trim()]);

      return res.status(200).json({
        success: true,
        message: "Message permanently deleted from database.",
        deletedMessageId: messageId,
      });
    }

    let setClause = "unsent = true, deleted_at = NOW(), updated_at = NOW()";
    if (mode === "for_everyone") {
      if (!isSender && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You can only unsend your own messages for everyone.",
        });
      }
      setClause = "unsent = true, deleted_at = NOW(), updated_at = NOW()";
    } else if (mode === "for_brand") {
      setClause = "deleted_for_brand = true, deleted_at = NOW(), updated_at = NOW()";
    } else if (mode === "for_creator") {
      setClause = "deleted_for_creator = true, deleted_at = NOW(), updated_at = NOW()";
    }

    const updateRes = await query(
      `UPDATE messages SET ${setClause} WHERE id::text = $1 RETURNING *`,
      [messageId.trim()]
    );

    return res.status(200).json({
      success: true,
      message: "Message updated successfully.",
      data: formatMessage(updateRes.rows[0]),
    });
  } catch (error) {
    console.error("Unsend message error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unsend message.",
    });
  }
};