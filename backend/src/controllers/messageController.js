import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Profile from "../models/Profile.js";
import Notification from "../models/Notification.js";
import { sendPushToUser } from "../utils/webPush.js"; 

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

    let actualSenderId = req.user?._id || senderId;

    if (!actualSenderId && conversationId) {
      const conv = await Conversation.findById(conversationId);
      if (conv) {
        if (conv.adminId) {
          actualSenderId = conv.adminId;
        } else {
          const adminProfile = await Profile.findOne({ role: "admin" });
          if (adminProfile) actualSenderId = adminProfile._id;
        }
      }
    }

    const hasFile = Boolean(req.file);
    const isAudio = hasFile && (req.file.mimetype?.startsWith("audio/") || req.file.originalname?.endsWith(".webm") || req.file.originalname?.endsWith(".mp3") || req.file.originalname?.endsWith(".wav") || req.file.originalname?.endsWith(".ogg"));
    
    let resolvedMessageType = requestedType || "text";
    if (hasFile) {
      if (isAudio || requestedType === "voice_note") {
        resolvedMessageType = "voice_note";
      } else if (req.file.mimetype?.startsWith("video/")) {
        resolvedMessageType = "media";
      } else {
        resolvedMessageType = "media";
      }
    } else if (requestedType === "timestamp_feedback") {
      resolvedMessageType = "timestamp_feedback";
    }

    const defaultFallbackText = isAudio || resolvedMessageType === "voice_note"
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

    // =========================================================================
    // PROHIBITED CONTENT DETECTION (PHONE, EMAIL, EXTERNAL CONTACT SHARING)
    // =========================================================================
    if (text && typeof text === "string") {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
      const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}|\b\d{10}\b|\b\d{5}[-\s]?\d{5}\b/g;
      const disguisedPhoneRegex = /\b(\d\s*){10,}\b/;
      const obfuscatedContactKeywords = /\b(whatsapp|wa\.me|call\s*me|phone\s*no|contact\s*no|mobile\s*no|gmail|telegram|t\.me|instagram\s*dm|direct\s*dm|pay\s*outside)\b/i;

      // Extract cleaned digits to detect sneaky phone number patterns
      const digitsOnly = text.replace(/\D/g, "");
      const hasSuspiciousPhoneNumber = (digitsOnly.length >= 10 && digitsOnly.length <= 13) || phoneRegex.test(text) || disguisedPhoneRegex.test(text);
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

    const message = await Message.create({
      conversationId,
      senderId: actualSenderId,
      text: messageText,
      read: false,
      messageType: resolvedMessageType,
      metadata: finalMetadata,
    });

    const conversation = await Conversation.findById(conversationId);

    if (conversation) {
      let isUpdated = false;
      if (conversation.status === "pending") {
        conversation.status = "active";
        isUpdated = true;
      }
      if (conversation.archived) {
        conversation.archived = false;
        isUpdated = true;
      }
      if (isUpdated) {
        await conversation.save();
      }

      // Determine recipient for notification
      let recipientId = null;
      const actualSenderStr = actualSenderId.toString();

      if (conversation.creatorId && conversation.creatorId.toString() !== actualSenderStr) {
        recipientId = conversation.creatorId;
      } else if (conversation.brandId && conversation.brandId.toString() !== actualSenderStr) {
        recipientId = conversation.brandId;
      } else if (conversation.adminId && conversation.adminId.toString() !== actualSenderStr) {
        recipientId = conversation.adminId;
      }
    if (recipientId) {
      const senderProfile = await Profile.findById(actualSenderId).select("fullName role").lean();
      const senderName = senderProfile?.fullName || (senderProfile?.role === "admin" ? "Pravixo Admin" : "User");
      const safeText = (text && typeof text === "string" ? text.trim() : "") || messageText || "Sent an attachment";
      const preview = safeText.length > 60 ? `${safeText.slice(0, 60)}...` : safeText;

      // 1. In-App Notification (bell dropdown ke liye)
      await Notification.create({
        recipientId,
        senderId: actualSenderId,
        type: "new_message",
        text: `New message from ${senderName}: "${preview}"`,
        targetUrl: `/messages?conversationId=${conversationId}`,
        createdAt: Date.now(),
      }).catch((notifErr) => console.warn("Could not dispatch message notification:", notifErr));

  // 2. Web Push Notification (popup ke liye)
  sendPushToUser(recipientId, {
    title: `New message from ${senderName} 💬`,
    body: preview,
    url: `/messages?conversationId=${conversationId}`,
  }).catch((err) => console.error("Chat push error:", err.message));
}
    }

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send message.",
    });
  }
};

// Get messages
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({
      conversationId,
    })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);

    res.status(500).json({
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

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    const isSender = message.senderId.toString() === profileId.toString();
    const userRole = req.user?.role || "user";
    const isAdmin = userRole === "admin";

    // Hard delete from DB requested
    if (deleteFromDb) {
      if (!isSender && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You can only permanently delete your own messages.",
        });
      }
      await Message.findByIdAndDelete(messageId);
      return res.status(200).json({
        success: true,
        message: "Message permanently deleted from database.",
        deletedMessageId: messageId,
      });
    }

    // Delete / Unsend modes
    if (mode === "for_everyone") {
      if (!isSender && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You can only unsend your own messages for everyone.",
        });
      }
      message.unsent = true;
      message.deletedAt = new Date();
    } else if (mode === "for_brand") {
      message.deletedForBrand = true;
      message.deletedAt = new Date();
    } else if (mode === "for_creator") {
      message.deletedForCreator = true;
      message.deletedAt = new Date();
    } else {
      message.unsent = true;
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: "Message updated successfully.",
      data: message,
    });
  } catch (error) {
    console.error("Unsend message error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to unsend message.",
    });
  }
};