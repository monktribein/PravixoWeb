import { query } from "../config/postgres.js";
import {
  formatConnection,
  formatProfile,
  formatCampaign,
  formatConversation,
  formatMessage,
  formatPayment,
  formatSubmission,
} from "../utils/formatters.js";
import { sendPushToUser } from "../utils/webPush.js";

// Helper to find profile by UUID or user_id
const findProfile = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [String(idOrUserId)]
  );
  return res.rows[0] ? formatProfile(res.rows[0]) : null;
};

// Helper to find campaign by ID
const findCampaign = async (id) => {
  if (!id) return null;
  const res = await query(
    `SELECT * FROM campaigns WHERE id::text = $1 LIMIT 1`,
    [String(id)]
  );
  return res.rows[0] ? formatCampaign(res.rows[0]) : null;
};

// Helper to find connection by ID
const findConnection = async (id) => {
  if (!id) return null;
  const res = await query(
    `SELECT * FROM connections WHERE id::text = $1 LIMIT 1`,
    [String(id)]
  );
  return res.rows[0] ? formatConnection(res.rows[0]) : null;
};

// 1. Send connection request
export const sendRequest = async (req, res) => {
  try {
    const { creatorId, brandId, campaignId, pitch, senderId } = req.body;

    if (!creatorId || !brandId || !pitch) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing.",
      });
    }

    const [creatorProfile, brandProfile] = await Promise.all([
      findProfile(creatorId),
      findProfile(brandId),
    ]);

    if (!creatorProfile || !brandProfile) {
      return res.status(404).json({
        success: false,
        message: "Creator or Brand profile not found.",
      });
    }

    // Role check: Connections can only be built between Brands and Creators
    if (creatorProfile.role === "creator" && brandProfile.role === "creator") {
      return res.status(400).json({
        success: false,
        message:
          "A creator cannot connect with another creator. Connections can only be built between Brands and Creators.",
      });
    }
    if (creatorProfile.role === "brand" && brandProfile.role === "brand") {
      return res.status(400).json({
        success: false,
        message:
          "A brand cannot connect with another brand. Connections can only be built between Brands and Creators.",
      });
    }

    let validCampaignId = null;
    if (campaignId) {
      const camp = await findCampaign(campaignId);
      if (!camp) {
        return res.status(404).json({
          success: false,
          message: "Campaign not found.",
        });
      }
      if (camp.status !== "APPROVED") {
        return res.status(400).json({
          success: false,
          message: "Campaign is not approved for collaboration requests.",
        });
      }
      if (!camp.active) {
        return res.status(400).json({
          success: false,
          message: "Campaign is currently inactive.",
        });
      }
      validCampaignId = camp.id;
    }

    // Check existing connection
    const existingRes = await query(
      `SELECT * FROM connections 
       WHERE creator_id = $1 AND brand_id = $2 
         AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
       LIMIT 1`,
      [creatorProfile.id, brandProfile.id, validCampaignId]
    );

    if (existingRes.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Connection request already exists.",
      });
    }

    // Insert new connection
    const insertRes = await query(
      `INSERT INTO connections (
         creator_id, brand_id, campaign_id, pitch, status, 
         creator_notification_seen, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'pending', false, NOW(), NOW())
       RETURNING *`,
      [creatorProfile.id, brandProfile.id, validCampaignId, pitch]
    );

    const connection = formatConnection(insertRes.rows[0]);

    // Create or find pending conversation
    let convRes = await query(
      `SELECT * FROM conversations 
       WHERE creator_id = $1 AND brand_id = $2 
         AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
       LIMIT 1`,
      [creatorProfile.id, brandProfile.id, validCampaignId]
    );

    let conversationRow = convRes.rows[0];
    if (!conversationRow) {
      const newConvRes = await query(
        `INSERT INTO conversations (creator_id, brand_id, campaign_id, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING *`,
        [creatorProfile.id, brandProfile.id, validCampaignId]
      );
      conversationRow = newConvRes.rows[0];
    }

    // Insert initial pitch message
    const actualSenderProfile = senderId ? await findProfile(senderId) : brandProfile;
    await query(
      `INSERT INTO messages (conversation_id, sender_id, text, read)
       VALUES ($1, $2, $3, false)`,
      [conversationRow.id, actualSenderProfile ? actualSenderProfile.id : brandProfile.id, pitch]
    );

    res.status(201).json({ success: true, data: connection });
  } catch (error) {
    console.error("sendRequest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send connection request.",
    });
  }
};

// 2. Accept request
export const acceptRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await findConnection(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found.",
      });
    }

    // Security check: Must be authenticated brand and brand must own this request
    if (req.user) {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can approve connection/campaign requests.",
        });
      }

      if (
        String(connection.brandId) !== String(req.user._id) &&
        String(connection.brandId) !== String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this campaign/request.",
        });
      }
    }

    if (connection.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Connection request is already ${connection.status}.`,
      });
    }

    // If request belongs to a campaign, validate budget limits
    let campaign = null;
    if (connection.campaignId) {
      campaign = await findCampaign(connection.campaignId);
      if (campaign) {
        const totalBudget = Number(campaign.totalBudget) || 0;
        const minBudget = Number(campaign.minBudgetPerCreator) || 0;

        if (totalBudget > 0 && minBudget > 0) {
          const countRes = await query(
            `SELECT COUNT(*)::int as count FROM connections WHERE campaign_id = $1 AND status = 'accepted'`,
            [campaign.id]
          );
          const approvedCount = countRes.rows[0]?.count || 0;
          const currentApprovedBudget = approvedCount * minBudget;
          const remainingBudget = totalBudget - currentApprovedBudget;

          if (remainingBudget < minBudget) {
            return res.status(400).json({
              success: false,
              message: "Campaign budget limit reached. Cannot approve more creators.",
            });
          }
        }
      }
    }

    // Lock in the agreed amount for payment on approval
    const finalBrandTotal =
      connection.proposedAmount || connection.brandTotal || (campaign?.minBudgetPerCreator || 0);
    let pravixoFee = 0;
    let creatorAmount = 0;
    let collaborationStatus = connection.collaborationStatus || "NEGOTIATING";
    let agreedAt = connection.agreedAt || null;

    if (finalBrandTotal > 0) {
      pravixoFee = Math.round(finalBrandTotal * 0.2);
      creatorAmount = finalBrandTotal - pravixoFee;
      collaborationStatus = "AMOUNT_AGREED";
      agreedAt = Date.now();
    }

    // Derive deliverablesTracking snapshot from Campaign if empty
    let deliverablesTracking = connection.deliverablesTracking || [];
    if (
      campaign &&
      campaign.deliverables &&
      (!deliverablesTracking || deliverablesTracking.length === 0)
    ) {
      const delivs = [];
      const now = Date.now();
      if (campaign.deliverables.reels > 0) {
        delivs.push({
          type: "REEL",
          requiredQuantity: campaign.deliverables.reels,
          completedQuantity: 0,
          status: "PENDING",
          createdAt: now,
          updatedAt: now,
        });
      }
      if (campaign.deliverables.posts > 0) {
        delivs.push({
          type: "POST",
          requiredQuantity: campaign.deliverables.posts,
          completedQuantity: 0,
          status: "PENDING",
          createdAt: now,
          updatedAt: now,
        });
      }
      if (campaign.deliverables.stories > 0) {
        delivs.push({
          type: "STORY",
          requiredQuantity: campaign.deliverables.stories,
          completedQuantity: 0,
          status: "PENDING",
          createdAt: now,
          updatedAt: now,
        });
      }
      if (campaign.deliverables.videos > 0) {
        delivs.push({
          type: "VIDEO",
          requiredQuantity: campaign.deliverables.videos,
          completedQuantity: 0,
          status: "PENDING",
          createdAt: now,
          updatedAt: now,
        });
      }
      deliverablesTracking = delivs;
    }

    const updateRes = await query(
      `UPDATE connections
       SET status = 'accepted',
           creator_notification_seen = false,
           brand_total = $1,
           pravixo_fee = $2,
           creator_amount = $3,
           collaboration_status = $4,
           agreed_at = $5,
           deliverables_tracking = $6::jsonb,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        finalBrandTotal,
        pravixoFee,
        creatorAmount,
        collaborationStatus,
        agreedAt,
        JSON.stringify(deliverablesTracking),
        connection.id,
      ]
    );

    const updatedConnection = formatConnection(updateRes.rows[0]);

    // Activate or create conversation
    let convRes = await query(
      `SELECT * FROM conversations 
       WHERE creator_id = $1 AND brand_id = $2 
         AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
       LIMIT 1`,
      [connection.creatorId, connection.brandId, connection.campaignId || null]
    );

    let conversationRow = convRes.rows[0];
    if (!conversationRow) {
      const newConvRes = await query(
        `INSERT INTO conversations (creator_id, brand_id, campaign_id, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING *`,
        [connection.creatorId, connection.brandId, connection.campaignId || null]
      );
      conversationRow = newConvRes.rows[0];
    } else {
      await query(`UPDATE conversations SET status = 'active', updated_at = NOW() WHERE id = $1`, [
        conversationRow.id,
      ]);
    }

    // Ensure initial pitch message is present
    const msgCheck = await query(
      `SELECT id FROM messages WHERE conversation_id = $1 LIMIT 1`,
      [conversationRow.id]
    );
    if (msgCheck.rows.length === 0) {
      await query(
        `INSERT INTO messages (conversation_id, sender_id, text, read)
         VALUES ($1, $2, $3, false)`,
        [conversationRow.id, connection.creatorId, connection.pitch]
      );
    }

    // Notify Creator
    const brandProfile = await findProfile(connection.brandId);
    const brandName = brandProfile?.fullName || "A Brand";
    const campaignTitle = campaign?.title || "Collaboration";
    const approveText = `${brandName} approved your request for "${campaignTitle}".`;

    // Add approval message to chat
    await query(
      `INSERT INTO messages (conversation_id, sender_id, text, message_type, read)
       VALUES ($1, $2, $3, 'system', false)`,
      [
        conversationRow.id,
        connection.brandId,
        `[Collaboration Approved] 🎉 ${brandName} approved your application for "${campaignTitle}". Next step: Brand will fund the campaign escrow to activate the collaboration.`,
      ]
    ).catch((err) => console.warn("Could not post approval message to chat:", err));

    // Create Notification
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
       VALUES ($1, $2, 'campaign_request_approved', $3, $4, $5, NOW())`,
      [
        connection.creatorId,
        connection.brandId,
        approveText,
        `/messages?conversationId=${conversationRow.id}`,
        Date.now(),
      ]
    );

    sendPushToUser(connection.creatorId, {
      title: "Campaign Request Approved! 🎉",
      body: approveText,
      url: `/messages?conversationId=${conversationRow.id}`,
    }).catch((err) => console.error("Request approval push error:", err.message));

    res.status(200).json({
      success: true,
      message: "Request approved successfully.",
      data: {
        connection: updatedConnection,
        conversationId: conversationRow.id,
      },
    });
  } catch (error) {
    console.error("Accept request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept connection request.",
      error: error.message,
    });
  }
};

// 3. Reject request
export const rejectRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { reason } = req.body || {};

    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found.",
      });
    }

    if (req.user) {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can decline connection/campaign requests.",
        });
      }

      if (
        String(connection.brandId) !== String(req.user._id) &&
        String(connection.brandId) !== String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this campaign/request.",
        });
      }
    }

    if (connection.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Connection request is already ${connection.status}.`,
      });
    }

    const updateRes = await query(
      `UPDATE connections 
       SET status = 'rejected', creator_notification_seen = false, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [connection.id]
    );

    const updatedConnection = formatConnection(updateRes.rows[0]);

    // Notify Creator
    let campaign = null;
    if (connection.campaignId) {
      campaign = await findCampaign(connection.campaignId);
    }
    const campaignTitle = campaign?.title || "Campaign Collaboration";
    const brandProfile = await findProfile(connection.brandId);
    const brandName = brandProfile?.fullName || "A Brand";
    const declineReasonText = reason && reason.trim() ? `: "${reason.trim()}"` : "";
    const rejectText = `${brandName} declined your request for "${campaignTitle}"${declineReasonText}.`;

    try {
      const convRes = await query(
        `SELECT id FROM conversations 
         WHERE creator_id = $1 AND brand_id = $2 
           AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
         LIMIT 1`,
        [connection.creatorId, connection.brandId, connection.campaignId || null]
      );
      if (convRes.rows.length > 0) {
        await query(
          `INSERT INTO messages (conversation_id, sender_id, text, message_type, read)
           VALUES ($1, $2, $3, 'system', false)`,
          [
            convRes.rows[0].id,
            connection.brandId,
            `[Collaboration Declined] ${brandName} declined this collaboration${
              reason && reason.trim() ? `. Reason: "${reason.trim()}"` : ""
            }.`,
          ]
        );
      }
    } catch (chatErr) {
      console.warn("Could not post rejection message to chat:", chatErr);
    }

    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
       VALUES ($1, $2, 'campaign_request_rejected', $3, '/dashboard/influencer', $4, NOW())`,
      [connection.creatorId, connection.brandId, rejectText, Date.now()]
    );

    sendPushToUser(connection.creatorId, {
      title: "Campaign Request Update",
      body: rejectText,
      url: "/dashboard/influencer",
    }).catch((err) => console.error("Request rejection push error:", err.message));

    res.status(200).json({
      success: true,
      message: "Request declined.",
      data: updatedConnection,
    });
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject connection request.",
      error: error.message,
    });
  }
};

// 4. Navbar notification count
export const getNavbarNotificationCount = async (req, res) => {
  try {
    const { profileId, role } = req.query;
    let count = 0;

    const profile = await findProfile(profileId);
    const targetUuid = profile?.id || profileId;

    if (role === "brand") {
      const result = await query(
        `SELECT COUNT(*)::int as count FROM connections 
         WHERE brand_id::text = $1 AND status = 'pending'`,
        [targetUuid]
      );
      count = result.rows[0]?.count || 0;
    } else if (role === "creator") {
      const result = await query(
        `SELECT COUNT(*)::int as count FROM connections 
         WHERE creator_id::text = $1 
           AND creator_notification_seen = false 
           AND status IN ('accepted', 'rejected')`,
        [targetUuid]
      );
      count = result.rows[0]?.count || 0;
    }

    res.json({ success: true, data: count });
  } catch (error) {
    console.error("getNavbarNotificationCount error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get notification count.",
    });
  }
};

// 5. Requests for brand
export const getRequestsForBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const brandProfile = await findProfile(brandId);
    const brandUuid = brandProfile?.id || brandId;

    const reqRes = await query(
      `SELECT * FROM connections 
       WHERE brand_id::text = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [brandUuid]
    );

    const data = await Promise.all(
      reqRes.rows.map(async (row) => {
        const connection = formatConnection(row);
        const creatorProfile = await findProfile(connection.creatorId);
        const campaign = connection.campaignId ? await findCampaign(connection.campaignId) : null;

        let followersCount = 0;
        let platformStr = "Instagram";
        let creatorRating = 0;
        let reviewCount = 0;

        if (creatorProfile) {
          followersCount =
            (creatorProfile.instagramFollowers || 0) +
            (creatorProfile.facebookFollowers || 0) +
            (creatorProfile.linkedinFollowers || 0) +
            (creatorProfile.youtubeFollowers || 0) +
            (creatorProfile.quoraFollowers || 0) +
            (creatorProfile.twitterFollowers || 0);

          const socialRes = await query(
            `SELECT platform FROM social_connections WHERE profile_id::text = $1`,
            [creatorProfile.id]
          );
          if (socialRes.rows.length > 0) {
            platformStr = socialRes.rows
              .map((c) => c.platform.charAt(0).toUpperCase() + c.platform.slice(1))
              .join(", ");
          }

          const reviewRes = await query(
            `SELECT rating FROM reviews WHERE creator_id::text = $1 AND visible = true`,
            [creatorProfile.id]
          );
          if (reviewRes.rows.length > 0) {
            const sum = reviewRes.rows.reduce((acc, r) => acc + (r.rating || 0), 0);
            creatorRating = Number((sum / reviewRes.rows.length).toFixed(1));
            reviewCount = reviewRes.rows.length;
          }
        }

        return {
          ...connection,
          creatorProfile: creatorProfile
            ? {
                ...creatorProfile,
                followersCount,
                platformStr,
                rating: creatorRating,
                reviewCount,
              }
            : null,
          campaign,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error("getRequestsForBrand error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch brand requests.",
    });
  }
};

// 6. Requests for creator
export const getRequestsForCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const creator = await findProfile(creatorId);
    const creatorUuid = creator?.id || creatorId;

    const reqRes = await query(
      `SELECT * FROM connections 
       WHERE creator_id::text = $1
       ORDER BY created_at DESC`,
      [creatorUuid]
    );

    const data = await Promise.all(
      reqRes.rows.map(async (row) => {
        const connection = formatConnection(row);
        const brandProfile = await findProfile(connection.brandId);
        const campaign = connection.campaignId ? await findCampaign(connection.campaignId) : null;

        let conversationId = null;
        if (connection.status === "accepted") {
          const convRes = await query(
            `SELECT id FROM conversations 
             WHERE creator_id = $1 AND brand_id = $2 
               AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
             LIMIT 1`,
            [connection.creatorId, connection.brandId, connection.campaignId || null]
          );
          conversationId = convRes.rows[0]?.id || null;
        }

        // Retrieve payment
        let payment = null;
        if (connection.paymentId) {
          const payRes = await query(`SELECT * FROM payments WHERE id::text = $1 LIMIT 1`, [
            connection.paymentId,
          ]);
          payment = payRes.rows[0] ? formatPayment(payRes.rows[0]) : null;
        }
        if (!payment) {
          const payRes = await query(
            `SELECT * FROM payments WHERE connection_id::text = $1 LIMIT 1`,
            [connection.id]
          );
          payment = payRes.rows[0] ? formatPayment(payRes.rows[0]) : null;
        }

        // Submissions count
        const subRes = await query(`SELECT * FROM submissions WHERE connection_id::text = $1`, [
          connection.id,
        ]);
        const submissions = subRes.rows.map(formatSubmission);
        const pendingCount = submissions.filter(
          (s) => s.status === "SUBMITTED" || s.status === "RESUBMITTED"
        ).length;
        const approvedCount = submissions.filter((s) => s.status === "APPROVED").length;
        const rejectedCount = submissions.filter((s) => s.status === "REJECTED").length;

        return {
          ...connection,
          brandProfile,
          campaign,
          conversationId,
          payment,
          submissionsCount: submissions.length,
          pendingSubmissionsCount: pendingCount,
          approvedSubmissionsCount: approvedCount,
          rejectedSubmissionsCount: rejectedCount,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error("getRequestsForCreator error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch creator requests.",
    });
  }
};

// 7. Connection status
export const getConnectionStatus = async (req, res) => {
  try {
    const { creatorId, brandId } = req.query;

    const [creatorProfile, brandProfile] = await Promise.all([
      findProfile(creatorId),
      findProfile(brandId),
    ]);

    const cUuid = creatorProfile?.id || creatorId;
    const bUuid = brandProfile?.id || brandId;

    const result = await query(
      `SELECT * FROM connections 
       WHERE creator_id::text = $1 AND brand_id::text = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [cUuid, bUuid]
    );

    res.json({
      success: true,
      data: result.rows[0] ? formatConnection(result.rows[0]) : null,
    });
  } catch (error) {
    console.error("getConnectionStatus error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get connection status.",
    });
  }
};

// 8. Mark creator notifications seen
export const markCreatorNotificationsSeen = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const profile = await findProfile(creatorId);
    const creatorUuid = profile?.id || creatorId;

    await query(
      `UPDATE connections 
       SET creator_notification_seen = true, updated_at = NOW()
       WHERE creator_id::text = $1 
         AND creator_notification_seen = false 
         AND status IN ('accepted', 'rejected')`,
      [creatorUuid]
    );

    res.json({
      success: true,
      message: "Notifications marked as seen.",
    });
  } catch (error) {
    console.error("markCreatorNotificationsSeen error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notifications.",
    });
  }
};

// 9. All connections
export const getAllConnections = async (req, res) => {
  try {
    const { profileId, role } = req.query;
    const profile = await findProfile(profileId);
    const targetUuid = profile?.id || profileId;

    const sql =
      role === "brand"
        ? `SELECT * FROM connections WHERE brand_id::text = $1 ORDER BY created_at DESC`
        : `SELECT * FROM connections WHERE creator_id::text = $1 ORDER BY created_at DESC`;

    const listRes = await query(sql, [targetUuid]);

    const data = await Promise.all(
      listRes.rows.map(async (row) => {
        const connection = formatConnection(row);
        const otherId = role === "brand" ? connection.creatorId : connection.brandId;
        const otherProfile = await findProfile(otherId);

        let conversationId = null;
        if (connection.status === "accepted") {
          const convRes = await query(
            `SELECT id FROM conversations 
             WHERE creator_id = $1 AND brand_id = $2 
               AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
             LIMIT 1`,
            [connection.creatorId, connection.brandId, connection.campaignId || null]
          );
          conversationId = convRes.rows[0]?.id || null;
        }

        return {
          ...connection,
          otherProfile,
          conversationId,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error("getAllConnections error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch connections.",
    });
  }
};

// 10. My requests for creator
export const getMyRequestsForCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const profile = await findProfile(creatorId);
    const creatorUuid = profile?.id || creatorId;

    const listRes = await query(
      `SELECT * FROM connections WHERE creator_id::text = $1 ORDER BY created_at DESC`,
      [creatorUuid]
    );

    const data = await Promise.all(
      listRes.rows.map(async (row) => {
        const connection = formatConnection(row);
        const brandProfile = await findProfile(connection.brandId);
        const campaign = connection.campaignId ? await findCampaign(connection.campaignId) : null;

        let conversationId = null;
        if (connection.status === "accepted") {
          const convRes = await query(
            `SELECT id FROM conversations 
             WHERE creator_id = $1 AND brand_id = $2 
               AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
             LIMIT 1`,
            [connection.creatorId, connection.brandId, connection.campaignId || null]
          );
          conversationId = convRes.rows[0]?.id || null;
        }

        return {
          ...connection,
          brandProfile,
          campaign,
          conversationId,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error("getMyRequestsForCreator error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch creator requests.",
    });
  }
};

// 11. Approved collaborations for brand
export const getApprovedCollaborationsForBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const profile = await findProfile(brandId);
    const brandUuid = profile?.id || brandId;

    const listRes = await query(
      `SELECT * FROM connections 
       WHERE brand_id::text = $1 AND status = 'accepted'
       ORDER BY created_at DESC`,
      [brandUuid]
    );

    const data = await Promise.all(
      listRes.rows.map(async (row) => {
        const connection = formatConnection(row);
        const creatorProfile = await findProfile(connection.creatorId);
        const campaign = connection.campaignId ? await findCampaign(connection.campaignId) : null;

        const convRes = await query(
          `SELECT * FROM conversations 
           WHERE creator_id = $1 AND brand_id = $2 
             AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
           LIMIT 1`,
          [connection.creatorId, connection.brandId, connection.campaignId || null]
        );
        const conversation = convRes.rows[0] ? formatConversation(convRes.rows[0]) : null;

        let payment = null;
        if (connection.paymentId) {
          const pRes = await query(`SELECT * FROM payments WHERE id::text = $1 LIMIT 1`, [
            connection.paymentId,
          ]);
          payment = pRes.rows[0] ? formatPayment(pRes.rows[0]) : null;
        }
        if (!payment) {
          const pRes = await query(
            `SELECT * FROM payments WHERE connection_id::text = $1 LIMIT 1`,
            [connection.id]
          );
          payment = pRes.rows[0] ? formatPayment(pRes.rows[0]) : null;
        }

        const subRes = await query(`SELECT * FROM submissions WHERE connection_id::text = $1`, [
          connection.id,
        ]);
        const submissions = subRes.rows.map(formatSubmission);
        const pendingCount = submissions.filter(
          (s) => s.status === "SUBMITTED" || s.status === "RESUBMITTED"
        ).length;
        const approvedCount = submissions.filter((s) => s.status === "APPROVED").length;
        const rejectedCount = submissions.filter((s) => s.status === "REJECTED").length;

        return {
          ...connection,
          creatorProfile,
          campaign,
          conversationId: conversation?.id || null,
          conversationStatus: conversation?.status || "inactive",
          payment,
          submissionsCount: submissions.length,
          pendingSubmissionsCount: pendingCount,
          approvedSubmissionsCount: approvedCount,
          rejectedSubmissionsCount: rejectedCount,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error("getApprovedCollaborationsForBrand error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch approved collaborations.",
    });
  }
};

// 12. Propose collaboration payment amount
export const proposeCollaborationAmount = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { amount } = req.body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Agreed creator amount must be greater than ₹0.",
      });
    }

    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration record not found.",
      });
    }

    // Security check
    if (req.user) {
      const isBrand =
        String(connection.brandId) === String(req.user._id) ||
        String(connection.brandId) === String(req.user.id);
      const isCreator =
        String(connection.creatorId) === String(req.user._id) ||
        String(connection.creatorId) === String(req.user.id);

      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not a participant in this collaboration.",
        });
      }
    }

    // Budget constraints validation if campaign linked
    if (connection.campaignId) {
      const campaign = await findCampaign(connection.campaignId);
      if (campaign) {
        if (campaign.maxBudgetPerCreator && campaign.maxBudgetPerCreator > 0) {
          if (numericAmount > campaign.maxBudgetPerCreator) {
            return res.status(400).json({
              success: false,
              message: `Amount exceeds campaign maximum allowed budget per creator (₹${campaign.maxBudgetPerCreator.toLocaleString()}).`,
            });
          }
        }

        if (campaign.totalBudget && campaign.totalBudget > 0) {
          const agreedRes = await query(
            `SELECT creator_amount FROM connections 
             WHERE campaign_id = $1 AND collaboration_status = 'AMOUNT_AGREED' AND id != $2`,
            [campaign.id, connection.id]
          );
          const totalCommitted = agreedRes.rows.reduce(
            (acc, curr) => acc + Number(curr.creator_amount || 0),
            0
          );
          const remainingBudget = campaign.totalBudget - totalCommitted;

          if (numericAmount > remainingBudget) {
            return res.status(400).json({
              success: false,
              message: `Amount exceeds campaign remaining budget (₹${remainingBudget.toLocaleString()} remaining out of ₹${campaign.totalBudget.toLocaleString()}).`,
            });
          }
        }
      }
    }

    const senderProfileId = req.user ? req.user.id || req.user._id : connection.brandId;
    const recipientId =
      String(senderProfileId) === String(connection.brandId)
        ? connection.creatorId
        : connection.brandId;

    const updateRes = await query(
      `UPDATE connections
       SET proposed_amount = $1,
           proposed_by = $2,
           collaboration_status = 'NEGOTIATING',
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [numericAmount, senderProfileId, connection.id]
    );

    const updatedConn = formatConnection(updateRes.rows[0]);

    // Send notification
    const senderProfile = await findProfile(senderProfileId);
    const senderName = senderProfile?.fullName || "Collaboration partner";
    let campaign = null;
    if (connection.campaignId) {
      campaign = await findCampaign(connection.campaignId);
    }
    const campaignTitle = campaign?.title || "campaign";

    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at, created_at_dt)
       VALUES ($1, $2, 'campaign_amount_proposed', $3, $4, NOW())`,
      [
        recipientId,
        senderProfileId,
        `${senderName} proposed a creator payment of ₹${numericAmount.toLocaleString()} for "${campaignTitle}".`,
        Date.now(),
      ]
    );

    res.status(200).json({
      success: true,
      message: "Offer proposed successfully.",
      data: updatedConn,
    });
  } catch (error) {
    console.error("Propose amount error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to propose collaboration amount.",
      error: error.message,
    });
  }
};

// 13. Agree to collaboration payment amount
export const agreeCollaborationAmount = async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration record not found.",
      });
    }

    if (req.user) {
      const isBrand =
        String(connection.brandId) === String(req.user._id) ||
        String(connection.brandId) === String(req.user.id);
      const isCreator =
        String(connection.creatorId) === String(req.user._id) ||
        String(connection.creatorId) === String(req.user.id);

      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not a participant in this collaboration.",
        });
      }
    }

    const finalAmount = connection.proposedAmount;
    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No valid proposed amount to agree upon. Please propose an amount first.",
      });
    }

    if (connection.campaignId) {
      const campaign = await findCampaign(connection.campaignId);
      if (campaign) {
        if (campaign.maxBudgetPerCreator && campaign.maxBudgetPerCreator > 0) {
          if (finalAmount > campaign.maxBudgetPerCreator) {
            return res.status(400).json({
              success: false,
              message: `Amount exceeds campaign maximum allowed budget per creator (₹${campaign.maxBudgetPerCreator.toLocaleString()}).`,
            });
          }
        }

        if (campaign.totalBudget && campaign.totalBudget > 0) {
          const agreedRes = await query(
            `SELECT brand_total, creator_amount FROM connections 
             WHERE campaign_id = $1 AND collaboration_status = 'AMOUNT_AGREED' AND id != $2`,
            [campaign.id, connection.id]
          );
          const totalCommitted = agreedRes.rows.reduce(
            (acc, curr) => acc + (Number(curr.brand_total) || Number(curr.creator_amount) || 0),
            0
          );
          const remainingBudget = campaign.totalBudget - totalCommitted;

          if (finalAmount > remainingBudget) {
            return res.status(400).json({
              success: false,
              message: `Amount exceeds campaign remaining budget (₹${remainingBudget.toLocaleString()} remaining out of ₹${campaign.totalBudget.toLocaleString()}).`,
            });
          }
        }
      }
    }

    const brandTotal = Math.round(finalAmount);
    const pravixoFee = Math.round(brandTotal * 0.2);
    const creatorAmount = brandTotal - pravixoFee;

    const updateRes = await query(
      `UPDATE connections 
       SET creator_amount = $1,
           pravixo_fee = $2,
           brand_total = $3,
           collaboration_status = 'AMOUNT_AGREED',
           agreed_at = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [creatorAmount, pravixoFee, brandTotal, Date.now(), connection.id]
    );

    const updatedConn = formatConnection(updateRes.rows[0]);

    const agreeingUser = req.user ? req.user.id || req.user._id : connection.brandId;
    const recipientId =
      String(agreeingUser) === String(connection.brandId)
        ? connection.creatorId
        : connection.brandId;

    const agreeingProfile = await findProfile(agreeingUser);
    const agreeingName = agreeingProfile?.fullName || "Collaboration partner";
    let campaign = null;
    if (connection.campaignId) {
      campaign = await findCampaign(connection.campaignId);
    }
    const campaignTitle = campaign?.title || "campaign";

    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at, created_at_dt)
       VALUES ($1, $2, 'campaign_amount_agreed', $3, $4, NOW())`,
      [
        recipientId,
        agreeingUser,
        `${agreeingName} agreed to collaboration budget ₹${brandTotal.toLocaleString()} (Creator receives ₹${creatorAmount.toLocaleString()} after 20% platform fee) for "${campaignTitle}".`,
        Date.now(),
      ]
    );

    res.status(200).json({
      success: true,
      message: "Collaboration payment amount agreed successfully.",
      data: updatedConn,
    });
  } catch (error) {
    console.error("Agree amount error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to agree on collaboration amount.",
      error: error.message,
    });
  }
};

// 14. Get collaboration details by connection ID or query (creatorId & brandId & campaignId)
export const getCollaborationDetails = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { creatorId, brandId, campaignId } = req.query;

    let connection = null;
    if (connectionId) {
      connection = await findConnection(connectionId);
    } else if (creatorId && brandId) {
      const [cProf, bProf] = await Promise.all([findProfile(creatorId), findProfile(brandId)]);
      const cUuid = cProf?.id || creatorId;
      const bUuid = bProf?.id || brandId;
      const camp = campaignId ? await findCampaign(campaignId) : null;
      const campUuid = camp?.id || campaignId || null;

      const result = await query(
        `SELECT * FROM connections 
         WHERE creator_id::text = $1 AND brand_id::text = $2 
           AND (($3::text IS NULL AND campaign_id IS NULL) OR campaign_id::text = $3)
         ORDER BY created_at DESC LIMIT 1`,
        [cUuid, bUuid, campUuid]
      );
      connection = result.rows[0] ? formatConnection(result.rows[0]) : null;
    }

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const isBrand =
        String(connection.brandId) === String(req.user._id) ||
        String(connection.brandId) === String(req.user.id);
      const isCreator =
        String(connection.creatorId) === String(req.user._id) ||
        String(connection.creatorId) === String(req.user.id);
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not a participant in this collaboration.",
        });
      }
    }

    let campaign = null;
    if (connection.campaignId) {
      campaign = await findCampaign(connection.campaignId);
    }

    res.status(200).json({
      success: true,
      data: {
        ...connection,
        campaign,
      },
    });
  } catch (error) {
    console.error("Get collaboration details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collaboration details.",
      error: error.message,
    });
  }
};

// 15. Get Deliverables Tracking for a Collaboration
export const getCollaborationDeliverables = async (req, res) => {
  try {
    const { connectionId } = req.params;
    let connection = await findConnection(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const isBrand =
        String(connection.brandId) === String(req.user._id) ||
        String(connection.brandId) === String(req.user.id);
      const isCreator =
        String(connection.creatorId) === String(req.user._id) ||
        String(connection.creatorId) === String(req.user.id);
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have access to this collaboration's deliverables.",
        });
      }
    }

    let deliverables = connection.deliverablesTracking || [];
    if (deliverables.length === 0 && connection.campaignId) {
      const camp = await findCampaign(connection.campaignId);
      if (camp && camp.deliverables) {
        const delivs = [];
        const now = Date.now();
        if (camp.deliverables.reels > 0) {
          delivs.push({
            type: "REEL",
            requiredQuantity: camp.deliverables.reels,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
          });
        }
        if (camp.deliverables.posts > 0) {
          delivs.push({
            type: "POST",
            requiredQuantity: camp.deliverables.posts,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
          });
        }
        if (camp.deliverables.stories > 0) {
          delivs.push({
            type: "STORY",
            requiredQuantity: camp.deliverables.stories,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
          });
        }
        if (camp.deliverables.videos > 0) {
          delivs.push({
            type: "VIDEO",
            requiredQuantity: camp.deliverables.videos,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
          });
        }
        deliverables = delivs;
        await query(
          `UPDATE connections SET deliverables_tracking = $1::jsonb, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(deliverables), connection.id]
        );
      }
    }

    const totalRequired = deliverables.reduce((sum, d) => sum + (d.requiredQuantity || 0), 0);
    const totalCompleted = deliverables.reduce((sum, d) => sum + (d.completedQuantity || 0), 0);
    const progressPercent =
      totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        connectionId: connection.id,
        paymentStatus: connection.paymentStatus,
        isPaid: connection.paymentStatus === "PAID",
        deliverables,
        summary: {
          totalRequired,
          totalCompleted,
          progressPercent,
        },
      },
    });
  } catch (error) {
    console.error("Get collaboration deliverables error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deliverables tracking.",
      error: error.message,
    });
  }
};

// 16. Delete / Dismiss connection request
export const deleteConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await findConnection(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user._id || req.user.id);
      const isBrandOwner = String(connection.brandId) === userProfileId;
      const isCreatorOwner = String(connection.creatorId) === userProfileId;

      if (!isBrandOwner && !isCreatorOwner) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to delete this connection request.",
        });
      }
    }

    await query(`DELETE FROM connections WHERE id = $1`, [connection.id]);

    return res.status(200).json({
      success: true,
      message: "Connection request deleted successfully.",
      deletedId: connectionId,
    });
  } catch (error) {
    console.error("Delete connection error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete connection request.",
      error: error.message,
    });
  }
};

// 17. Update Shipping Address by Creator
export const updateShippingAddress = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { fullName, phone, addressLine1, city, state, pincode } = req.body;

    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found." });
    }

    const barterDetails = connection.barterDetails || {};
    barterDetails.isBarter = true;
    barterDetails.creatorShippingAddress = {
      fullName: fullName || "",
      phone: phone || "",
      addressLine1: addressLine1 || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
    };

    const updateRes = await query(
      `UPDATE connections 
       SET barter_details = $1::jsonb, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [JSON.stringify(barterDetails), connection.id]
    );

    return res.status(200).json({
      success: true,
      message: "Shipping address updated successfully.",
      data: formatConnection(updateRes.rows[0]),
    });
  } catch (error) {
    console.error("Update shipping address error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 18. Update Barter Shipment / Tracking by Brand
export const updateBarterShipping = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const {
      productName,
      productValue,
      productDescription,
      courierPartner,
      trackingNumber,
      trackingUrl,
      shippingStatus,
    } = req.body;

    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found." });
    }

    const barterDetails = connection.barterDetails || {};
    barterDetails.isBarter = true;
    if (productName) barterDetails.productName = productName;
    if (productValue != null) barterDetails.productValue = Number(productValue);
    if (productDescription) barterDetails.productDescription = productDescription;
    if (courierPartner) barterDetails.courierPartner = courierPartner;
    if (trackingNumber) barterDetails.trackingNumber = trackingNumber;
    if (trackingUrl) barterDetails.trackingUrl = trackingUrl;

    if (shippingStatus) {
      barterDetails.shippingStatus = shippingStatus;
      if (shippingStatus === "DISPATCHED" && !barterDetails.shippedAt) {
        barterDetails.shippedAt = Date.now();
      }
      if (shippingStatus === "DELIVERED" && !barterDetails.deliveredAt) {
        barterDetails.deliveredAt = Date.now();
      }
    }

    const updateRes = await query(
      `UPDATE connections 
       SET barter_details = $1::jsonb, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [JSON.stringify(barterDetails), connection.id]
    );

    return res.status(200).json({
      success: true,
      message: "Barter shipping details updated successfully.",
      data: formatConnection(updateRes.rows[0]),
    });
  } catch (error) {
    console.error("Update barter shipping error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 19. Confirm Product Received by Creator
export const confirmProductReceived = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found." });
    }

    const barterDetails = connection.barterDetails || {};
    barterDetails.shippingStatus = "CONFIRMED_BY_CREATOR";
    barterDetails.creatorConfirmedAt = Date.now();

    const updateRes = await query(
      `UPDATE connections 
       SET barter_details = $1::jsonb, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [JSON.stringify(barterDetails), connection.id]
    );

    return res.status(200).json({
      success: true,
      message: "Product reception confirmed! You can now proceed with deliverables.",
      data: formatConnection(updateRes.rows[0]),
    });
  } catch (error) {
    console.error("Confirm product received error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};