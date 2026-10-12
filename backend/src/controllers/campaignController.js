import { query } from "../config/postgres.js";
import {
  formatCampaign,
  formatProfile,
  formatConnection,
  formatConversation,
  formatMessage,
} from "../utils/formatters.js";
import { sendPushToUsers, sendPushToUser } from "../utils/webPush.js";
import { notifyCreatorsAboutNewCampaign } from "../services/emailService.js";

// Helper to check valid UUID
const isUuid = (str) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

// =====================================================
// 1. BRAND: CREATE CAMPAIGN
// =====================================================
export const createCampaign = async (req, res) => {
  try {
    const brandId = req.user?._id || req.user?.profileId || req.body.brandId;

    if (!brandId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to create a campaign.",
      });
    }

    const {
      title,
      name,
      description,
      startDate,
      endDate,
      category,
      location,
      totalBudget,
      minBudgetPerCreator,
      maxBudgetPerCreator,
      minFollowers,
      tiers,
      deliverables,
      budget,
      duration,
      active,
    } = req.body;

    const campaignTitle = (title || name || "").trim();

    if (!campaignTitle) {
      return res.status(400).json({
        success: false,
        message: "Campaign name is required.",
      });
    }

    const startTs = startDate ? new Date(startDate).getTime() : Date.now();
    const endTs = endDate ? new Date(endDate).getTime() : startTs + 30 * 24 * 60 * 60 * 1000;

    const totalBudgetInt =
      Number(totalBudget) || (budget ? Number(String(budget).replace(/[^0-9]/g, "")) : 0);
    const minBudgetInt = Number(minBudgetPerCreator) || 0;
    const maxBudgetInt = Number(maxBudgetPerCreator) || 0;
    const minFollowersInt = Number(minFollowers) || 0;

    const parsedTiers = Array.isArray(tiers)
      ? tiers
          .map((t) => ({
            minFollowers: Number(t.minFollowers) || 0,
            reward: String(t.reward || t.perks || "").trim(),
            cashAmount: Number(t.cashAmount) || 0,
            perks: String(t.perks || t.reward || "").trim(),
          }))
          .filter((t) => t.reward || t.minFollowers > 0 || t.cashAmount > 0)
      : [];

    const formattedBudget = budget || `₹${totalBudgetInt.toLocaleString("en-IN")}`;
    const formattedDuration =
      duration || `${Math.max(1, Math.round((endTs - startTs) / (24 * 60 * 60 * 1000)))} days`;

    const parsedDeliverables =
      typeof deliverables === "object" && deliverables !== null
        ? {
            reels: Number(deliverables.reels) || 0,
            posts: Number(deliverables.posts) || 0,
            stories: Number(deliverables.stories) || 0,
            videos: Number(deliverables.videos) || 0,
            notes: String(deliverables.notes || ""),
          }
        : {
            reels: 0,
            posts: 0,
            stories: 0,
            videos: 0,
            notes: typeof deliverables === "string" ? deliverables : "",
          };

    const insertRes = await query(
      `INSERT INTO campaigns (
        brand_id, title, description, start_date, end_date, category, location,
        total_budget, min_budget_per_creator, max_budget_per_creator, min_followers,
        tiers, deliverables, budget, duration, status, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PENDING_VERIFICATION', $16)
      RETURNING *`,
      [
        brandId,
        campaignTitle,
        description || "",
        startTs,
        endTs,
        category || "General",
        location || "Pan India",
        totalBudgetInt,
        minBudgetInt,
        maxBudgetInt,
        minFollowersInt,
        JSON.stringify(parsedTiers),
        JSON.stringify(parsedDeliverables),
        formattedBudget,
        formattedDuration,
        active !== undefined ? Boolean(active) : true,
      ]
    );

    const campaign = formatCampaign(insertRes.rows[0]);

    // Create Admin notification
    const adminsRes = await query("SELECT id FROM profiles WHERE role = 'admin' AND is_deleted = false");
    if (adminsRes.rows.length > 0) {
      const now = Date.now();
      for (const admin of adminsRes.rows) {
        query(
          `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at)
           VALUES ($1, $2, 'campaign_pending_verification', $3, '/admin/campaigns', $4)`,
          [
            admin.id,
            brandId,
            `New campaign "${campaign.title}" submitted for verification.`,
            now,
          ]
        ).catch((e) => console.warn("Admin campaign notif error:", e.message));
      }
    }

    return res.status(201).json({
      success: true,
      message: "Campaign submitted for verification.",
      data: campaign,
    });
  } catch (error) {
    console.error("Create campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create campaign.",
      error: error.message,
    });
  }
};

// =====================================================
// 2. CREATOR DISCOVERY: GET APPROVED ACTIVE CAMPAIGNS
// =====================================================
export const getDiscoverableCampaigns = async (req, res) => {
  try {
    const creatorId = req.user?._id || req.user?.profileId || req.query.creatorId;
    const now = Date.now();

    const sql = `
      SELECT c.*,
             p.id as brand_p_id, p.full_name as brand_name, p.handle as brand_handle,
             p.avatar_url as brand_avatar, p.location as brand_location,
             p.category as brand_category, p.starting_price as brand_starting_price,
             p.website as brand_website
      FROM campaigns c
      LEFT JOIN profiles p ON p.id = c.brand_id
      WHERE c.status = 'APPROVED'
        AND c.active = true
        AND (c.end_date IS NULL OR c.end_date >= $1)
      ORDER BY c.created_at DESC
    `;

    const result = await query(sql, [now - 24 * 60 * 60 * 1000]);
    const campaigns = result.rows;

    const data = await Promise.all(
      campaigns.map(async (camp) => {
        const brandProfile = camp.brand_p_id
          ? {
              _id: camp.brand_p_id,
              id: camp.brand_p_id,
              fullName: camp.brand_name,
              handle: camp.brand_handle,
              avatarUrl: camp.brand_avatar,
              location: camp.brand_location,
              category: camp.brand_category,
              startingPrice: Number(camp.brand_starting_price || 0),
              website: camp.brand_website,
            }
          : null;

        // Brand reviews and rating
        let brandRating = 0;
        let reviewCount = 0;
        if (camp.brand_id) {
          const reviewsRes = await query(
            "SELECT rating FROM reviews WHERE target_id = $1 AND visible = true",
            [camp.brand_id]
          );
          if (reviewsRes.rows.length > 0) {
            const sum = reviewsRes.rows.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
            brandRating = Number((sum / reviewsRes.rows.length).toFixed(1));
            reviewCount = reviewsRes.rows.length;
          }
        }

        const totalBudget = Number(camp.total_budget || 0);
        const minBudget = Number(camp.min_budget_per_creator || 0);

        // Connections for budget allocation
        const connRes = await query(
          "SELECT id, creator_id, status FROM connections WHERE campaign_id = $1 AND status IN ('accepted', 'pending')",
          [camp.id]
        );
        const connections = connRes.rows;

        const allocatedBudget = connections.length * minBudget;
        const remainingBudget = totalBudget > 0 ? Math.max(0, totalBudget - allocatedBudget) : 0;

        let requestStatus = null;
        let isRequested = false;
        let isParticipating = false;

        if (creatorId) {
          const myConnection = connections.find(
            (c) => String(c.creator_id) === String(creatorId)
          );
          if (myConnection) {
            requestStatus = myConnection.status;
            isRequested = myConnection.status === "pending";
            isParticipating = myConnection.status === "accepted";
          }
        }

        const isBudgetExhausted =
          totalBudget > 0 && minBudget > 0 && connections.length > 0 && remainingBudget < minBudget;

        return {
          ...formatCampaign(camp),
          brand: brandProfile
            ? {
                ...brandProfile,
                rating: brandRating,
                reviewCount,
              }
            : null,
          remainingBudget,
          isBudgetExhausted,
          requestStatus,
          isRequested,
          isParticipating,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get discoverable campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch discoverable campaigns.",
      error: error.message,
    });
  }
};

// =====================================================
// 3. CREATOR: REQUEST TO JOIN CAMPAIGN
// =====================================================
export const joinCampaignRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { pitch, proposedRate, appliedTier } = req.body;
    const numProposedRate = proposedRate ? Number(proposedRate) : 0;

    const creatorId = req.user?._id || req.user?.profileId;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to join a campaign.",
      });
    }

    if (req.user?.role !== "creator") {
      return res.status(403).json({
        success: false,
        message: "Only Creators can request to join campaigns.",
      });
    }

    const campRes = await query("SELECT * FROM campaigns WHERE id::text = $1", [id.trim()]);
    if (campRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
      });
    }

    const campaign = campRes.rows[0];

    if (campaign.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Campaign is not approved for creator requests.",
      });
    }

    if (!campaign.active) {
      return res.status(400).json({
        success: false,
        message: "Campaign is currently inactive.",
      });
    }

    const now = Date.now();
    if (campaign.end_date && campaign.end_date < now - 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "This campaign has already ended.",
      });
    }

    // Check duplicate request
    const existingConnRes = await query(
      "SELECT * FROM connections WHERE creator_id::text = $1 AND campaign_id = $2",
      [String(creatorId).trim(), campaign.id]
    );

    if (existingConnRes.rows.length > 0) {
      const existingConnection = existingConnRes.rows[0];
      if (existingConnection.status === "pending") {
        return res.status(409).json({
          success: false,
          message: "You have already requested to join this campaign (Request Pending).",
        });
      }
      if (existingConnection.status === "accepted") {
        return res.status(409).json({
          success: false,
          message: "You are already participating in this campaign.",
        });
      }
    }

    // Check followers requirement
    const creatorProfRes = await query(
      "SELECT * FROM profiles WHERE id::text = $1",
      [String(creatorId).trim()]
    );
    const creatorProfile = creatorProfRes.rows[0];

    const totalFollowers =
      Number(creatorProfile?.instagram_followers || 0) +
      Number(creatorProfile?.youtube_followers || 0) +
      Number(creatorProfile?.facebook_followers || 0) +
      Number(creatorProfile?.twitter_followers || 0) +
      Number(creatorProfile?.linkedin_followers || 0) +
      Number(creatorProfile?.quora_followers || 0);

    const tiers = Array.isArray(campaign.tiers)
      ? campaign.tiers
      : typeof campaign.tiers === "string"
      ? JSON.parse(campaign.tiers)
      : [];

    let matchedTier = null;

    if (tiers.length > 0) {
      const sortedTiers = [...tiers].sort(
        (a, b) => (Number(a.minFollowers) || 0) - (Number(b.minFollowers) || 0)
      );
      const minRequiredAcrossTiers = sortedTiers[0]?.minFollowers || 0;

      if (totalFollowers < minRequiredAcrossTiers) {
        return res.status(400).json({
          success: false,
          message: `This campaign requires at least ${minRequiredAcrossTiers.toLocaleString()} followers to apply for available options.`,
        });
      }

      if (appliedTier && appliedTier.minFollowers !== undefined) {
        const selectedMin = Number(appliedTier.minFollowers) || 0;
        if (totalFollowers < selectedMin) {
          return res.status(400).json({
            success: false,
            message: `You need at least ${selectedMin.toLocaleString()} followers for the selected option.`,
          });
        }
        matchedTier = appliedTier;
      } else {
        const eligibleTiers = sortedTiers.filter(
          (t) => totalFollowers >= (Number(t.minFollowers) || 0)
        );
        matchedTier = eligibleTiers[eligibleTiers.length - 1] || sortedTiers[0];
      }
    } else if (campaign.min_followers && Number(campaign.min_followers) > 0) {
      if (totalFollowers < Number(campaign.min_followers)) {
        return res.status(400).json({
          success: false,
          message: `This campaign requires a minimum of ${Number(campaign.min_followers).toLocaleString()} followers to apply.`,
        });
      }
    }

    // Budget check
    const totalBudget = Number(campaign.total_budget || 0);
    const minBudget = Number(campaign.min_budget_per_creator || 0);

    if (totalBudget > 0 && minBudget > 0) {
      const countRes = await query(
        "SELECT count(*) FROM connections WHERE campaign_id = $1 AND status IN ('accepted', 'pending')",
        [campaign.id]
      );
      const activeCount = Number(countRes.rows[0]?.count || 0);
      const remainingBudget = totalBudget - activeCount * minBudget;

      if (remainingBudget < minBudget) {
        return res.status(400).json({
          success: false,
          message: "Campaign budget has been exhausted. No new requests can be accepted.",
        });
      }
    }

    const brandTotal =
      numProposedRate > 0
        ? numProposedRate
        : (matchedTier?.cashAmount || Number(campaign.min_budget_per_creator || 0));
    const pravixoFee = Math.round(brandTotal * 0.20);
    const creatorAmount = brandTotal - pravixoFee;

    // Create Connection record
    const connInsertRes = await query(
      `INSERT INTO connections (
        creator_id, brand_id, campaign_id, pitch, applied_tier, proposed_amount,
        proposed_by, creator_amount, pravixo_fee, brand_total, status, creator_notification_seen
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', false)
      RETURNING *`,
      [
        creatorId,
        campaign.brand_id,
        campaign.id,
        pitch || `Hi! I would love to collaborate on your "${campaign.title}" campaign.`,
        matchedTier ? JSON.stringify(matchedTier) : null,
        brandTotal,
        creatorId,
        creatorAmount,
        pravixoFee,
        brandTotal,
      ]
    );

    const connection = formatConnection(connInsertRes.rows[0]);

    // Check / create Conversation
    let convRes = await query(
      "SELECT id FROM conversations WHERE creator_id = $1 AND brand_id = $2 AND campaign_id = $3 LIMIT 1",
      [creatorId, campaign.brand_id, campaign.id]
    );
    let convId;

    if (convRes.rows.length === 0) {
      const newConvRes = await query(
        `INSERT INTO conversations (creator_id, brand_id, campaign_id, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING id`,
        [creatorId, campaign.brand_id, campaign.id]
      );
      convId = newConvRes.rows[0].id;
    } else {
      convId = convRes.rows[0].id;
    }

    // Insert pitch message
    const pitchText = (pitch && pitch.trim()) || `Hi! I'm excited to collaborate on your "${campaign.title}" campaign.`;
    const rateNote = brandTotal > 0 ? ` [Proposed Rate: ₹${brandTotal.toLocaleString("en-IN")}]` : "";
    await query(
      `INSERT INTO messages (conversation_id, sender_id, text, message_type, read)
       VALUES ($1, $2, $3, 'text', false)`,
      [convId, creatorId, `${pitchText}${rateNote}`]
    );

    // Notify brand
    const joinNotifText = `${req.user?.fullName || "A Creator"} requested to join your campaign "${campaign.title}". Proposed rate: ₹${brandTotal.toLocaleString("en-IN")}`;
    query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at)
       VALUES ($1, $2, 'campaign_request_received', $3, '/connections', $4)`,
      [campaign.brand_id, creatorId, joinNotifText, Date.now()]
    ).catch((e) => console.warn("Join notif error:", e.message));

    sendPushToUser(campaign.brand_id, {
      title: "New Campaign Join Request! 📩",
      body: joinNotifText,
      url: "/connections",
    }).catch((err) => console.error("Campaign join request push error:", err.message));

    return res.status(201).json({
      success: true,
      message: "Request to join campaign sent successfully!",
      data: connection,
    });
  } catch (error) {
    console.error("Join campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit campaign request.",
      error: error.message,
    });
  }
};

// =====================================================
// 4. LIST CAMPAIGNS BY BRAND
// =====================================================
export const listCampaigns = async (req, res) => {
  try {
    const { brandId } = req.params;

    let sql = "SELECT * FROM campaigns ORDER BY created_at DESC";
    let params = [];

    if (brandId) {
      sql = "SELECT * FROM campaigns WHERE brand_id::text = $1 ORDER BY created_at DESC";
      params = [brandId.trim()];
    }

    const result = await query(sql, params);
    const campaigns = result.rows.map(formatCampaign);

    return res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error("List campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns.",
    });
  }
};

// =====================================================
// 5. GET ACTIVE CAMPAIGNS BY BRAND
// =====================================================
export const getActiveCampaignsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID.",
      });
    }

    const result = await query(
      "SELECT * FROM campaigns WHERE brand_id::text = $1 AND active = true ORDER BY created_at DESC",
      [brandId.trim()]
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map(formatCampaign),
    });
  } catch (error) {
    console.error("Get active campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active campaigns.",
    });
  }
};

// =====================================================
// 6. GET CAMPAIGN BY ID
// =====================================================
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID.",
      });
    }

    const sql = `
      SELECT c.*,
             p.id as brand_p_id, p.full_name as brand_name, p.handle as brand_handle,
             p.avatar_url as brand_avatar, p.location as brand_location,
             p.category as brand_category, p.starting_price as brand_starting_price,
             p.website as brand_website
      FROM campaigns c
      LEFT JOIN profiles p ON p.id = c.brand_id
      WHERE c.id::text = $1
      LIMIT 1
    `;

    const result = await query(sql, [id.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
      });
    }

    const camp = result.rows[0];
    const brandProfile = camp.brand_p_id
      ? {
          _id: camp.brand_p_id,
          id: camp.brand_p_id,
          fullName: camp.brand_name,
          handle: camp.brand_handle,
          avatarUrl: camp.brand_avatar,
          location: camp.brand_location,
          category: camp.brand_category,
          startingPrice: Number(camp.brand_starting_price || 0),
          website: camp.brand_website,
        }
      : null;

    return res.status(200).json({
      success: true,
      data: {
        ...formatCampaign(camp),
        brandId: brandProfile,
      },
    });
  } catch (error) {
    console.error("Get campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch campaign.",
    });
  }
};

// =====================================================
// 7. UPDATE CAMPAIGN
// =====================================================
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID.",
      });
    }

    const existingRes = await query("SELECT * FROM campaigns WHERE id::text = $1", [id.trim()]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
      });
    }

    const existingCampaign = existingRes.rows[0];

    const {
      title,
      name,
      description,
      startDate,
      endDate,
      category,
      location,
      totalBudget,
      minBudgetPerCreator,
      maxBudgetPerCreator,
      minFollowers,
      tiers,
      deliverables,
      budget,
      duration,
      active,
      status,
      verificationFeedback,
    } = req.body;

    const setClauses = [];
    const values = [];

    const addSet = (col, val) => {
      values.push(val);
      setClauses.push(`${col} = $${values.length}`);
    };

    if (title || name) addSet("title", (title || name).trim());
    if (description !== undefined) addSet("description", description);
    if (startDate) addSet("start_date", new Date(startDate).getTime());
    if (endDate) addSet("end_date", new Date(endDate).getTime());
    if (category) addSet("category", category.trim());
    if (location) addSet("location", location.trim());
    if (totalBudget !== undefined) addSet("total_budget", Number(totalBudget));
    if (minBudgetPerCreator !== undefined) addSet("min_budget_per_creator", Number(minBudgetPerCreator));
    if (maxBudgetPerCreator !== undefined) addSet("max_budget_per_creator", Number(maxBudgetPerCreator));
    if (minFollowers !== undefined) addSet("min_followers", Number(minFollowers));

    if (tiers !== undefined) {
      const parsedTiers = Array.isArray(tiers)
        ? tiers
            .map((t) => ({
              minFollowers: Number(t.minFollowers) || 0,
              reward: String(t.reward || t.perks || "").trim(),
              cashAmount: Number(t.cashAmount) || 0,
              perks: String(t.perks || t.reward || "").trim(),
            }))
            .filter((t) => t.reward || t.minFollowers > 0 || t.cashAmount > 0)
        : [];
      addSet("tiers", JSON.stringify(parsedTiers));
    }

    if (deliverables) addSet("deliverables", JSON.stringify(deliverables));
    if (budget) addSet("budget", budget);
    if (duration) addSet("duration", duration);
    if (active !== undefined) addSet("active", Boolean(active));
    if (status) addSet("status", status);
    if (verificationFeedback !== undefined) addSet("verification_feedback", verificationFeedback);

    setClauses.push("updated_at = NOW()");
    values.push(id.trim());

    const updateSql = `UPDATE campaigns SET ${setClauses.join(", ")} WHERE id::text = $${values.length} RETURNING *`;
    const updateRes = await query(updateSql, values);
    const campaign = formatCampaign(updateRes.rows[0]);

    // Check if campaign was just approved
    const gotApprovedJustNow = existingCampaign.status !== "APPROVED" && campaign.status === "APPROVED";

    if (gotApprovedJustNow) {
      const brandProfRes = await query(
        "SELECT full_name, avatar_url FROM profiles WHERE id = $1",
        [campaign.brandId]
      );
      const brand = brandProfRes.rows[0];
      const brandName = brand?.full_name || "A Brand";

      const creatorsRes = await query(
        "SELECT id FROM profiles WHERE role = 'creator' AND is_active = true AND is_deleted = false"
      );
      const creatorIds = creatorsRes.rows.map((c) => c.id);

      if (creatorIds.length > 0) {
        const now = Date.now();
        for (const creatorId of creatorIds) {
          query(
            `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at)
             VALUES ($1, $2, 'new_campaign_available', $3, $4, $5)`,
            [
              creatorId,
              campaign.brandId,
              `${brandName} launched a new campaign: "${campaign.title}"`,
              `/campaigns/${campaign.id}`,
              now,
            ]
          ).catch((e) => console.warn("Creator notif error:", e.message));
        }

        sendPushToUsers(creatorIds, {
          title: `${brandName} launched a new campaign! 🚀`,
          body: campaign.title,
          icon: brand?.avatar_url || "/logo192.png",
          url: `/campaigns/${campaign.id}`,
        }).catch((err) => console.error("Web push error:", err.message));

        notifyCreatorsAboutNewCampaign({
          campaign,
          brand,
          frontendOrigin: req.headers.origin,
        }).catch((err) => console.error("Email notification error:", err));
      }
    }

    return res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error("Update campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update campaign.",
      error: error.message,
    });
  }
};

// =====================================================
// 8. DELETE CAMPAIGN
// =====================================================
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID.",
      });
    }

    const deleteRes = await query("DELETE FROM campaigns WHERE id::text = $1 RETURNING id", [id.trim()]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Campaign deleted successfully.",
    });
  } catch (error) {
    console.error("Delete campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete campaign.",
    });
  }
};