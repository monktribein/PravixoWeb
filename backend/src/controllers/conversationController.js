import { query } from "../config/postgres.js";
import {
  formatConversation,
  formatMessage,
  formatProfile,
  formatCampaign,
} from "../utils/formatters.js";

// Helper to check valid UUID
const isUuid = (str) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

// Start conversation
export const startConversation = async (req, res) => {
  try {
    const { creatorId, brandId, adminId, targetUserId, initialMessage, campaignId } = req.body;

    let creator = creatorId;
    let brand = brandId;
    let admin = adminId || (req.user?.role === "admin" ? req.user._id : null);
    let convType = "brand_creator";

    if (targetUserId) {
      const targetProfRes = await query(
        "SELECT id, role FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1",
        [targetUserId.trim()]
      );

      if (targetProfRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Target user not found.",
        });
      }

      const targetProfile = targetProfRes.rows[0];

      if (admin || req.user?.role === "admin") {
        admin = admin || req.user?._id;
        if (targetProfile.role === "creator") {
          creator = targetProfile.id;
          convType = "admin_creator";
        } else {
          brand = targetProfile.id;
          convType = "admin_brand";
        }
      }
    } else if (admin && creator) {
      convType = "admin_creator";
    } else if (admin && brand) {
      convType = "admin_brand";
    } else if (req.body.support || req.body.contactTeam) {
      const adminProfRes = await query("SELECT id FROM profiles WHERE role = 'admin' LIMIT 1");
      if (adminProfRes.rows.length > 0) {
        admin = adminProfRes.rows[0].id;
        if (req.user?.role === "brand" || brand) {
          brand = brand || req.user?._id;
          convType = "admin_brand";
        } else {
          creator = creator || req.user?._id;
          convType = "admin_creator";
        }
      }
    }

    const senderId = req.user?._id || admin || brand || creator;

    if (!senderId || (!creator && !brand)) {
      return res.status(400).json({
        success: false,
        message: "Required participants are missing.",
      });
    }

    let existingQuery = "";
    let existingParams = [];

    if (convType === "admin_creator") {
      existingQuery = "SELECT * FROM conversations WHERE admin_id::text = $1 AND creator_id::text = $2 AND conversation_type = 'admin_creator' LIMIT 1";
      existingParams = [admin, creator];
    } else if (convType === "admin_brand") {
      existingQuery = "SELECT * FROM conversations WHERE admin_id::text = $1 AND brand_id::text = $2 AND conversation_type = 'admin_brand' LIMIT 1";
      existingParams = [admin, brand];
    } else {
      if (campaignId) {
        existingQuery = "SELECT * FROM conversations WHERE creator_id::text = $1 AND brand_id::text = $2 AND conversation_type = 'brand_creator' AND campaign_id::text = $3 LIMIT 1";
        existingParams = [creator, brand, campaignId];
      } else {
        existingQuery = "SELECT * FROM conversations WHERE creator_id::text = $1 AND brand_id::text = $2 AND conversation_type = 'brand_creator' LIMIT 1";
        existingParams = [creator, brand];
      }
    }

    const existingRes = await query(existingQuery, existingParams);
    let conversation;

    if (existingRes.rows.length > 0) {
      conversation = existingRes.rows[0];
    } else {
      const insertRes = await query(
        `INSERT INTO conversations (
          creator_id, brand_id, admin_id, conversation_type, campaign_id, status
        ) VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *`,
        [creator || null, brand || null, admin || null, convType, campaignId || null]
      );
      conversation = insertRes.rows[0];
    }

    if (initialMessage && initialMessage.trim()) {
      await query(
        `INSERT INTO messages (conversation_id, sender_id, text, read, message_type)
         VALUES ($1, $2, $3, false, 'text')`,
        [conversation.id, senderId, initialMessage.trim()]
      );
    }

    return res.status(201).json({
      success: true,
      data: conversation.id,
      conversation: formatConversation(conversation),
    });
  } catch (error) {
    console.error("Start conversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start conversation.",
    });
  }
};

// Get conversations
export const getConversations = async (req, res) => {
  try {
    const { profileId, role } = req.query;

    if (!profileId || !["creator", "brand", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "profileId and valid role are required.",
      });
    }

    let sql = "";
    let params = [];

    if (role === "creator") {
      sql = "SELECT * FROM conversations WHERE creator_id::text = $1 ORDER BY updated_at DESC";
      params = [profileId.trim()];
    } else if (role === "brand") {
      sql = "SELECT * FROM conversations WHERE brand_id::text = $1 ORDER BY updated_at DESC";
      params = [profileId.trim()];
    } else if (role === "admin") {
      sql = "SELECT * FROM conversations WHERE admin_id::text = $1 OR conversation_type IN ('admin_creator', 'admin_brand') ORDER BY updated_at DESC";
      params = [profileId.trim()];
    }

    const convRes = await query(sql, params);
    const conversations = convRes.rows;

    const results = await Promise.all(
      conversations.map(async (conv) => {
        let otherId = null;
        if (role === "creator") {
          otherId = conv.admin_id || conv.brand_id;
        } else if (role === "brand") {
          otherId = conv.admin_id || conv.creator_id;
        } else if (role === "admin") {
          otherId = conv.creator_id || conv.brand_id;
        }

        let otherProfile = null;
        if (otherId) {
          const profRes = await query(
            "SELECT id, full_name, email, handle, avatar_url, gender, role FROM profiles WHERE id::text = $1 OR user_id = $1",
            [String(otherId)]
          );
          if (profRes.rows.length > 0) {
            const p = profRes.rows[0];
            otherProfile = {
              _id: p.id,
              fullName: p.full_name,
              email: p.email,
              handle: p.handle,
              avatarUrl: p.avatar_url,
              gender: p.gender,
              role: p.role,
            };
          }
        }

        if (!otherProfile && conv.admin_id && (role === "creator" || role === "brand")) {
          const profRes = await query(
            "SELECT id, full_name, email, handle, avatar_url, gender, role FROM profiles WHERE id::text = $1",
            [String(conv.admin_id)]
          );
          if (profRes.rows.length > 0) {
            const p = profRes.rows[0];
            otherProfile = {
              _id: p.id,
              fullName: p.full_name,
              email: p.email,
              handle: p.handle,
              avatarUrl: p.avatar_url,
              gender: p.gender,
              role: p.role,
            };
          }
        }

        let campaign = null;
        if (conv.campaign_id) {
          const campRes = await query(
            "SELECT * FROM campaigns WHERE id::text = $1",
            [String(conv.campaign_id)]
          );
          if (campRes.rows.length > 0) {
            campaign = formatCampaign(campRes.rows[0]);
          }
        }

        let connection = null;
        if (conv.creator_id && conv.brand_id) {
          let connSql = "SELECT * FROM connections WHERE creator_id = $1 AND brand_id = $2";
          let connParams = [conv.creator_id, conv.brand_id];
          if (conv.campaign_id) {
            connSql += " AND campaign_id = $3";
            connParams.push(conv.campaign_id);
          }
          connSql += " LIMIT 1";
          const connRes = await query(connSql, connParams);
          if (connRes.rows.length > 0) {
            const c = connRes.rows[0];
            connection = {
              _id: c.id,
              id: c.id,
              status: c.status,
              collaborationStatus: c.collaboration_status,
              creatorAmount: Number(c.creator_amount || 0),
              brandTotal: Number(c.brand_total || 0),
            };
          }
        }

        const msgRes = await query(
          "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC",
          [conv.id]
        );
        const messages = msgRes.rows.map(formatMessage);
        const lastMessage = messages[0] || null;

        const unreadCount = messages.filter(
          (m) => String(m.senderId) !== String(profileId) && !m.read
        ).length;

        return {
          ...formatConversation(conv),
          otherProfile: otherProfile || {
            fullName: "Pravixo Admin",
            role: "admin",
            avatarUrl: "/log.png",
          },
          lastMessage,
          unreadCount,
          campaign,
          connection,
          isNew: conv.status === "pending" && String(lastMessage?.senderId) !== String(profileId),
        };
      })
    );

    const sortedResults = results.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      data: sortedResults.filter((item) => {
        if (role === "creator" && item.deletedForCreator) return false;
        if (role === "brand" && item.deletedForBrand) return false;
        return item.lastMessage || item.conversationType?.startsWith("admin_");
      }),
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversations.",
    });
  }
};

// Get conversation details
export const getConversationDetails = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { profileId } = req.query;

    if (!conversationId || !profileId) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID.",
      });
    }

    const convRes = await query("SELECT * FROM conversations WHERE id::text = $1", [conversationId.trim()]);
    if (convRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    const conversation = convRes.rows[0];
    let otherId = null;
    const myIdStr = String(profileId);

    if (conversation.creator_id && String(conversation.creator_id) === myIdStr) {
      otherId = conversation.admin_id || conversation.brand_id;
    } else if (conversation.brand_id && String(conversation.brand_id) === myIdStr) {
      otherId = conversation.admin_id || conversation.creator_id;
    } else if (conversation.admin_id && String(conversation.admin_id) === myIdStr) {
      otherId = conversation.creator_id || conversation.brand_id;
    } else {
      otherId = conversation.creator_id || conversation.brand_id || conversation.admin_id;
    }

    let otherProfile = null;
    if (otherId) {
      const profRes = await query(
        "SELECT id, full_name, email, handle, avatar_url, gender, role FROM profiles WHERE id::text = $1 OR user_id = $1",
        [String(otherId)]
      );
      if (profRes.rows.length > 0) {
        const p = profRes.rows[0];
        otherProfile = {
          _id: p.id,
          fullName: p.full_name,
          email: p.email,
          handle: p.handle,
          avatarUrl: p.avatar_url,
          gender: p.gender,
          role: p.role,
        };
      }
    }

    let campaign = null;
    if (conversation.campaign_id) {
      const campRes = await query(
        "SELECT * FROM campaigns WHERE id::text = $1",
        [String(conversation.campaign_id)]
      );
      if (campRes.rows.length > 0) {
        campaign = formatCampaign(campRes.rows[0]);
      }
    }

    let connection = null;
    if (conversation.creator_id && conversation.brand_id) {
      let connSql = "SELECT * FROM connections WHERE creator_id = $1 AND brand_id = $2";
      let connParams = [conversation.creator_id, conversation.brand_id];
      if (conversation.campaign_id) {
        connSql += " AND campaign_id = $3";
        connParams.push(conversation.campaign_id);
      }
      connSql += " LIMIT 1";
      const connRes = await query(connSql, connParams);
      if (connRes.rows.length > 0) {
        const c = connRes.rows[0];
        connection = {
          _id: c.id,
          id: c.id,
          status: c.status,
          collaborationStatus: c.collaboration_status,
          creatorAmount: Number(c.creator_amount || 0),
          brandTotal: Number(c.brand_total || 0),
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...formatConversation(conversation),
        otherProfile: otherProfile || {
          fullName: "Pravixo Admin",
          role: "admin",
          avatarUrl: "/log.png",
        },
        campaign,
        connection,
      },
    });
  } catch (error) {
    console.error("Conversation details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversation details.",
    });
  }
};

// Mark conversation as read
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { profileId } = req.body;

    if (profileId && conversationId) {
      await query(
        "UPDATE messages SET read = true WHERE conversation_id::text = $1 AND sender_id::text != $2 AND read = false",
        [conversationId.trim(), String(profileId).trim()]
      );
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read.",
    });
  }
};

// Archive / unarchive conversation
export const toggleArchive = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const convRes = await query(
      "UPDATE conversations SET archived = NOT archived, updated_at = NOW() WHERE id::text = $1 RETURNING *",
      [conversationId.trim()]
    );

    if (convRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatConversation(convRes.rows[0]),
    });
  } catch (error) {
    console.error("Toggle archive error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update archive status.",
    });
  }
};

// Delete conversation (hard delete from DB or per-role hide)
export const deleteUserConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { profileId, role, deleteFromDb = true } = req.body;

    const checkRes = await query("SELECT id FROM conversations WHERE id::text = $1", [conversationId.trim()]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    if (deleteFromDb) {
      await query("DELETE FROM messages WHERE conversation_id::text = $1", [conversationId.trim()]);
      await query("DELETE FROM conversations WHERE id::text = $1", [conversationId.trim()]);

      return res.status(200).json({
        success: true,
        message: "Conversation permanently deleted from database.",
        deletedConversationId: conversationId,
      });
    } else {
      let setClause = "archived = true";
      if (role === "creator") {
        setClause = "deleted_for_creator = true";
      } else if (role === "brand") {
        setClause = "deleted_for_brand = true";
      }

      await query(
        `UPDATE conversations SET ${setClause}, updated_at = NOW() WHERE id::text = $1`,
        [conversationId.trim()]
      );

      return res.status(200).json({
        success: true,
        message: "Conversation hidden successfully.",
      });
    }
  } catch (error) {
    console.error("Delete conversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete conversation.",
    });
  }
};