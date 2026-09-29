import mongoose from "mongoose";
import Campaign from "../models/Campaign.js";
import Profile from "../models/Profile.js";
import Connection from "../models/Connection.js";
import Notification from "../models/Notification.js";
import Review from "../models/Review.js";
import { sendPushToUsers, sendPushToUser } from "../utils/webPush.js";
import { notifyCreatorsAboutNewCampaign } from "../services/emailService.js";

// Helper: Calculate remaining budget for a campaign
const calculateCampaignRemainingBudget = async (campaign) => {
  const totalBudget = Number(campaign.totalBudget) || 0;
  if (totalBudget <= 0) return 0;

  // Find all approved or completed connections/tasks for this campaign
  // For now, each creator request or approved connection is tied to a budget
  // Check connections and campaign tasks
  // Sum allocated budgets
  const activeConnections = await Connection.find({
    campaignId: campaign._id,
    status: { $in: ["accepted", "pending"] },
  }).lean();

  // If minBudgetPerCreator is defined, calculate allocated based on average or min
  // Or if tasks have payment/budget, subtract that
  const minBudget = Number(campaign.minBudgetPerCreator) || 0;
  const allocatedBudget = activeConnections.length * minBudget;
  const remaining = Math.max(0, totalBudget - allocatedBudget);

  return remaining;
};

// =====================================================
// 1. BRAND: CREATE CAMPAIGN
// POST /api/campaigns
// =====================================================
export const createCampaign = async (req, res) => {
  try {
    const brandId = req.user?._id || req.body.brandId;

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

    const totalBudgetInt = Number(totalBudget) || (budget ? Number(String(budget).replace(/[^0-9]/g, "")) : 0);
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
    const formattedDuration = duration || `${Math.max(1, Math.round((endTs - startTs) / (24 * 60 * 60 * 1000)))} days`;

    const parsedDeliverables = typeof deliverables === "object" && deliverables !== null
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

    const campaign = await Campaign.create({
      brandId,
      title: campaignTitle,
      description: description || "",
      startDate: startTs,
      endDate: endTs,
      category: category || "General",
      location: location || "Pan India",
      totalBudget: totalBudgetInt,
      minBudgetPerCreator: minBudgetInt,
      maxBudgetPerCreator: maxBudgetInt,
      minFollowers: minFollowersInt,
      tiers: parsedTiers,
      deliverables: parsedDeliverables,
      budget: formattedBudget,
      duration: formattedDuration,
      status: "PENDING_VERIFICATION", // Initial status for Task 1
      active: active !== undefined ? Boolean(active) : true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create Admin notification
    const admins = await Profile.find({ role: "admin" }).select("_id").lean();
    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        recipientId: admin._id,
        senderId: brandId,
        type: "campaign_pending_verification",
        text: `New campaign "${campaign.title}" submitted for verification.`,
        createdAt: Date.now(),
      }));
      await Notification.insertMany(notifications);
    }

    // If campaign is created as APPROVED (or if instant creator notify is desired)
    if (campaign.status === "APPROVED") {
      const brand = await Profile.findById(brandId).select("fullName avatarUrl");
      const brandName = brand?.fullName || "A Brand";

      let matchingCreators = await Profile.find({
        role: "creator",
        $or: [
          { category: campaign.category },
          { prefNiches: { $regex: campaign.category || "", $options: "i" } },
        ],
      }).select("_id");

      if (!matchingCreators || matchingCreators.length === 0) {
        matchingCreators = await Profile.find({ role: "creator" }).select("_id");
      }

      const creatorIds = matchingCreators.map((c) => c._id);
      if (creatorIds.length > 0) {
        const inAppNotifs = creatorIds.map((creatorId) => ({
          recipientId: creatorId,
          senderId: brandId,
          type: "new_campaign_available",
          text: `${brandName} launched a new campaign: "${campaign.title}"`,
          createdAt: Date.now(),
        }));
        await Notification.insertMany(inAppNotifs);

        await sendPushToUsers(creatorIds, {
          title: `${brandName} launched a new campaign! 🚀`,
          body: campaign.title,
          icon: brand?.avatarUrl || "/logo192.png",
          url: `/campaigns/${campaign._id}`,
        });
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
// GET /api/campaigns/discover
// =====================================================
export const getDiscoverableCampaigns = async (req, res) => {
  try {
    const creatorId = req.user?._id || req.query.creatorId;
    const now = Date.now();

    // Only APPROVED campaigns that are active and not expired
    const filter = {
      status: "APPROVED",
      active: { $ne: false },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now - 24 * 60 * 60 * 1000 } },
      ],
    };

    const campaigns = await Campaign.find(filter)
      .populate("brandId", "fullName handle avatarUrl rating location category startingPrice")
      .sort({ createdAt: -1 })
      .lean();

    // Map each campaign and compute remaining budget, reviews/ratings, and creator request status
    const data = await Promise.all(
      campaigns.map(async (camp) => {
        const brandProfile = camp.brandId;
        const brandId = brandProfile?._id || camp.brandId;

        // Brand reviews and rating
        let brandRating = 0;
        let reviewCount = 0;
        if (brandId) {
          const reviews = await Review.find({ brandId, visible: true }).select("rating").lean();
          if (reviews.length > 0) {
            const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
            brandRating = Number((sum / reviews.length).toFixed(1));
            reviewCount = reviews.length;
          }
        }

        // Remaining budget check
        const totalBudget = Number(camp.totalBudget) || 0;
        const minBudget = Number(camp.minBudgetPerCreator) || 0;

        // Count accepted + pending requests for budget allocation
        const connections = await Connection.find({
          campaignId: camp._id,
          status: { $in: ["accepted", "pending"] },
        }).lean();

        // Used budget approximation
        const allocatedBudget = connections.length * minBudget;
        const remainingBudget = totalBudget > 0 ? Math.max(0, totalBudget - allocatedBudget) : 0;

        // Check if current creator already requested or is participating
        let requestStatus = null;
        let isRequested = false;
        let isParticipating = false;

        if (creatorId) {
          const myConnection = connections.find(
            (c) => String(c.creatorId) === String(creatorId)
          );
          if (myConnection) {
            requestStatus = myConnection.status; // "pending" | "accepted" | "rejected"
            isRequested = myConnection.status === "pending";
            isParticipating = myConnection.status === "accepted";
          }
        }

        const isBudgetExhausted = totalBudget > 0 && minBudget > 0 && connections.length > 0 && remainingBudget < minBudget;

        return {
          ...camp,
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
// POST /api/campaigns/:id/join
// =====================================================
export const joinCampaignRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { pitch, proposedRate, appliedTier } = req.body;
    const numProposedRate = proposedRate ? Number(proposedRate) : 0;

    // Security Check: Authenticated User & Role
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to join a campaign.",
      });
    }

    if (req.user.role !== "creator") {
      return res.status(403).json({
        success: false,
        message: "Only Creators can request to join campaigns.",
      });
    }

    const creatorId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID.",
      });
    }

    // Verify Campaign existence & approval status
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
      });
    }

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

    // Check dates availability
    const now = Date.now();
    if (campaign.endDate && campaign.endDate < now - 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "This campaign has already ended.",
      });
    }

    // Check duplicate request from this creator
    const existingConnection = await Connection.findOne({
      creatorId,
      campaignId: campaign._id,
    });

    if (existingConnection) {
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

    // Check follower requirement & tiered compensation eligibility if set by brand
    const creatorProfile = await Profile.findById(creatorId);
    const totalFollowers =
      Number(creatorProfile?.instagramFollowers || 0) +
      Number(creatorProfile?.youtubeFollowers || 0) +
      Number(creatorProfile?.facebookFollowers || 0) +
      Number(creatorProfile?.twitterFollowers || 0) +
      Number(creatorProfile?.linkedinFollowers || 0) +
      Number(creatorProfile?.quoraFollowers || 0);

    let matchedTier = null;

    if (Array.isArray(campaign.tiers) && campaign.tiers.length > 0) {
      const sortedTiers = [...campaign.tiers].sort(
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
    } else if (campaign.minFollowers && campaign.minFollowers > 0) {
      if (totalFollowers < campaign.minFollowers) {
        return res.status(400).json({
          success: false,
          message: `This campaign requires a minimum of ${campaign.minFollowers.toLocaleString()} followers to apply.`,
        });
      }
    }

    // Check remaining budget
    const totalBudget = Number(campaign.totalBudget) || 0;
    const minBudget = Number(campaign.minBudgetPerCreator) || 0;

    if (totalBudget > 0 && minBudget > 0) {
      const activeConnectionsCount = await Connection.countDocuments({
        campaignId: campaign._id,
        status: { $in: ["accepted", "pending"] },
      });

      const allocatedBudget = activeConnectionsCount * minBudget;
      const remainingBudget = totalBudget - allocatedBudget;

      if (remainingBudget < minBudget) {
        return res.status(400).json({
          success: false,
          message: "Campaign budget has been exhausted. No new requests can be accepted.",
        });
      }
    }

    // Determine initial proposed amount (Brand Total Budget)
    const brandTotal = numProposedRate > 0
      ? numProposedRate
      : (matchedTier?.cashAmount || campaign.minBudgetPerCreator || 0);
    const pravixoFee = Math.round(brandTotal * 0.20);
    const creatorAmount = brandTotal - pravixoFee;

    // Create Connection / Request record
    const connection = await Connection.create({
      creatorId,
      brandId: campaign.brandId,
      campaignId: campaign._id,
      pitch: pitch || `Hi! I would love to collaborate on your "${campaign.title}" campaign.`,
      appliedTier: matchedTier,
      proposedAmount: brandTotal,
      proposedBy: creatorId,
      creatorAmount,
      pravixoFee,
      brandTotal,
      status: "pending",
      creatorNotificationSeen: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create pending conversation so history exists
    let conversation = await Conversation.findOne({
      creatorId,
      brandId: campaign.brandId,
      campaignId: campaign._id,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        creatorId,
        brandId: campaign.brandId,
        campaignId: campaign._id,
        status: "pending",
      });
    }

    // Post initial pitch message in the conversation
    const pitchText = (pitch && pitch.trim()) || `Hi! I'm excited to collaborate on your "${campaign.title}" campaign.`;
    const rateNote = initialRate > 0 ? ` [Proposed Rate: ₹${initialRate.toLocaleString("en-IN")}]` : "";
    await Message.create({
      conversationId: conversation._id,
      senderId: creatorId,
      text: `${pitchText}${rateNote}`,
      messageType: "text",
      read: false,
    });

    // Notify brand of incoming campaign join request
    const joinNotifText = `${req.user.fullName || "A Creator"} requested to join your campaign "${campaign.title}". Proposed rate: ₹${initialRate.toLocaleString("en-IN")}`;
    await Notification.create({
      recipientId: campaign.brandId,
      senderId: creatorId,
      type: "campaign_request_received",
      text: joinNotifText,
      targetUrl: "/connections",
      createdAt: Date.now(),
    });

    sendPushToUser(campaign.brandId, {
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
// GET /api/campaigns/brand/:brandId
// =====================================================
export const listCampaigns = async (req, res) => {
  try {
    const { brandId } = req.params;

    const filter = brandId ? { brandId } : {};
    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 });

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
// GET /api/campaigns/brand/:brandId/active
// =====================================================
export const getActiveCampaignsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID.",
      });
    }

    const campaigns = await Campaign.find({
      brandId,
      active: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: campaigns,
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
// GET /api/campaigns/:id
// =====================================================
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID.",
      });
    }

    const campaign = await Campaign.findById(id).populate(
      "brandId",
      "fullName handle avatarUrl rating location category startingPrice website"
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: campaign,
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
// 7. UPDATE CAMPAIGN : with web push notification
// PATCH /api/campaigns/:id
// =====================================================
// =====================================================
// 7. UPDATE CAMPAIGN
// PATCH /api/campaigns/:id
// =====================================================
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID.",
      });
    }

    // Pehle purana campaign fetch karo — status compare karne ke liye
    const existingCampaign = await Campaign.findById(id);
    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
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
      status,
      verificationFeedback,
    } = req.body;

    const updates = { updatedAt: Date.now() };
    if (title || name) updates.title = (title || name).trim();
    if (description !== undefined) updates.description = description;
    if (startDate) updates.startDate = new Date(startDate).getTime();
    if (endDate) updates.endDate = new Date(endDate).getTime();
    if (category) updates.category = category.trim();
    if (location) updates.location = location.trim();
    if (totalBudget !== undefined) updates.totalBudget = Number(totalBudget);
    if (minBudgetPerCreator !== undefined) updates.minBudgetPerCreator = Number(minBudgetPerCreator);
    if (maxBudgetPerCreator !== undefined) updates.maxBudgetPerCreator = Number(maxBudgetPerCreator);
    if (minFollowers !== undefined) updates.minFollowers = Number(minFollowers);
    if (tiers !== undefined) {
      updates.tiers = Array.isArray(tiers)
        ? tiers
            .map((t) => ({
              minFollowers: Number(t.minFollowers) || 0,
              reward: String(t.reward || t.perks || "").trim(),
              cashAmount: Number(t.cashAmount) || 0,
              perks: String(t.perks || t.reward || "").trim(),
            }))
            .filter((t) => t.reward || t.minFollowers > 0 || t.cashAmount > 0)
        : [];
    }
    if (deliverables) updates.deliverables = deliverables;
    if (budget) updates.budget = budget;
    if (duration) updates.duration = duration;
    if (active !== undefined) updates.active = active;
    if (status) updates.status = status; // admin isse "APPROVED"/"REJECTED" set karega
    if (verificationFeedback !== undefined) updates.verificationFeedback = verificationFeedback;

    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // ==========================================
    // NAYA CAMPAIGN APPROVED HUA — NOTIFY CREATORS
    // ==========================================
    const gotApprovedJustNow =
      existingCampaign.status !== "APPROVED" && campaign.status === "APPROVED";

    if (gotApprovedJustNow) {
      const brand = await Profile.findById(campaign.brandId).select("fullName avatarUrl");
      const brandName = brand?.fullName || "A Brand";

      // Matching creators dhundo (same category/niche or all active creators)
      let matchingCreators = await Profile.find({
        role: "creator",
        $or: [
          { category: campaign.category },
          { prefNiches: { $regex: campaign.category || "", $options: "i" } },
        ],
      }).select("_id");

      if (!matchingCreators || matchingCreators.length === 0) {
        matchingCreators = await Profile.find({ role: "creator" }).select("_id");
      }

      const creatorIds = matchingCreators.map((c) => c._id);

      if (creatorIds.length > 0) {
        // 1. In-app Notification (jo already ban chuka hai) mein bhi daalo
        const inAppNotifs = creatorIds.map((creatorId) => ({
          recipientId: creatorId,
          senderId: campaign.brandId,
          type: "new_campaign_available",
          text: `${brandName} launched a new campaign: "${campaign.title}"`,
          createdAt: Date.now(),
        }));
        await Notification.insertMany(inAppNotifs);

        // 2. Web Push (phone/desktop pe bhi jaye)
        await sendPushToUsers(creatorIds, {
          title: `${brandName} launched a new campaign! 🚀`,
          body: campaign.title,
          icon: brand?.avatarUrl || "/logo192.png",
          url: `/campaigns/${campaign._id}`,
        });

        // 3. Email Notification to all creators with direct link to campaign & unsubscribe option
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
// DELETE /api/campaigns/:id
// =====================================================
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID.",
      });
    }

    const campaign = await Campaign.findByIdAndDelete(id);

    if (!campaign) {
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