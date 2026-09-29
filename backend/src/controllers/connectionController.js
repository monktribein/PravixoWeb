import mongoose from "mongoose";
import Connection from "../models/Connection.js";
import Profile from "../models/Profile.js";
import Campaign from "../models/Campaign.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import SocialConnection from "../models/SocialConnection.js";
import Notification from "../models/Notification.js";
import Review from "../models/Review.js";
import { sendPushToUser } from "../utils/webPush.js";

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

    // Role check: Ensure Creator can only connect with Brand, and Brand can only connect with Creator
    if (mongoose.Types.ObjectId.isValid(creatorId) && mongoose.Types.ObjectId.isValid(brandId)) {
      const [creatorProfile, brandProfile] = await Promise.all([
        Profile.findById(creatorId),
        Profile.findById(brandId),
      ]);

      if (creatorProfile && brandProfile) {
        if (creatorProfile.role === "creator" && brandProfile.role === "creator") {
          return res.status(400).json({
            success: false,
            message: "A creator cannot connect with another creator. Connections can only be built between Brands and Creators.",
          });
        }
        if (creatorProfile.role === "brand" && brandProfile.role === "brand") {
          return res.status(400).json({
            success: false,
            message: "A brand cannot connect with another brand. Connections can only be built between Brands and Creators.",
          });
        }
      }
    }

    const filter = { creatorId, brandId };

    if (campaignId) {
      if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid campaign ID.",
        });
      }
      const camp = await Campaign.findById(campaignId);
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
      filter.campaignId = campaignId;
    } else {
      filter.campaignId = null;
    }

    const existing = await Connection.findOne(filter);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Connection request already exists.",
      });
    }

    const connection = await Connection.create({
      creatorId,
      brandId,
      campaignId,
      pitch,
      status: "pending",
      creatorNotificationSeen: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create a pending conversation immediately so it appears in Messages
    let conversation = await Conversation.findOne(filter);

    if (!conversation) {
      conversation = await Conversation.create({
        creatorId,
        brandId,
        campaignId,
        status: "pending",
      });
    }

    await Message.create({
      conversationId: conversation._id,
      senderId: senderId || brandId, // fallback to brandId if not provided
      text: pitch,
      read: false,
    });

    res.status(201).json({ success: true, data: connection });
  } catch (error) {
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

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID.",
      });
    }

    const connection = await Connection.findById(connectionId);

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

      if (String(connection.brandId) !== String(req.user._id)) {
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
      campaign = await Campaign.findById(connection.campaignId);
      if (campaign) {
        const totalBudget = Number(campaign.totalBudget) || 0;
        const minBudget = Number(campaign.minBudgetPerCreator) || 0;

        if (totalBudget > 0 && minBudget > 0) {
          // Count currently accepted connections
          const approvedCount = await Connection.countDocuments({
            campaignId: campaign._id,
            status: "accepted",
          });

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

    connection.status = "accepted";
    connection.creatorNotificationSeen = false;
    connection.updatedAt = Date.now();

    // Task 5: Derive deliverablesTracking snapshot from Campaign
    if (campaign && campaign.deliverables && (!connection.deliverablesTracking || connection.deliverablesTracking.length === 0)) {
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
      connection.deliverablesTracking = delivs;
    }

    await connection.save();

    let conversation;

    const conversationFilter = {
      creatorId: connection.creatorId,
      brandId: connection.brandId,
    };

    if (connection.campaignId) {
      conversationFilter.campaignId = connection.campaignId;
    } else {
      conversationFilter.campaignId = null;
    }

    conversation = await Conversation.findOne(conversationFilter);

    if (!conversation) {
      conversation = await Conversation.create({
        creatorId: connection.creatorId,
        brandId: connection.brandId,
        campaignId: connection.campaignId,
        status: "active",
      });
    } else {
      conversation.status = "active";
      await conversation.save();
    }

    const existingMsg = await Message.findOne({
      conversationId: conversation._id,
    });

    if (!existingMsg) {
      await Message.create({
        conversationId: conversation._id,
        senderId: connection.creatorId,
        text: connection.pitch,
        read: false,
      });
    }

    // Notify Creator
    const brandProfile = await Profile.findById(connection.brandId).select("fullName").lean();
    const brandName = brandProfile?.fullName || "A Brand";
    const campaignTitle = campaign?.title || "Collaboration";
    const approveText = `${brandName} approved your request for "${campaignTitle}".`;
    
    // Add approval message to chat history
    await Message.create({
      conversationId: conversation._id,
      senderId: connection.brandId,
      text: `[Collaboration Approved] 🎉 ${brandName} approved your application for "${campaignTitle}". Next step: Brand will fund the campaign escrow to activate the collaboration.`,
      messageType: "system",
      read: false,
    }).catch((msgErr) => console.warn("Could not post approval message to chat:", msgErr));

    await Notification.create({
      recipientId: connection.creatorId,
      senderId: connection.brandId,
      type: "campaign_request_approved",
      text: approveText,
      targetUrl: `/messages?conversationId=${conversation._id}`,
      createdAt: Date.now(),
    });

    sendPushToUser(connection.creatorId, {
      title: "Campaign Request Approved! 🎉",
      body: approveText,
      url: `/messages?conversationId=${conversation._id}`,
    }).catch((err) => console.error("Request approval push error:", err.message));

    res.status(200).json({
      success: true,
      message: "Request approved successfully.",
      data: {
        connection,
        conversationId: conversation._id,
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

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID.",
      });
    }

    const connection = await Connection.findById(connectionId);

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
          message: "Only Brands can decline connection/campaign requests.",
        });
      }

      if (String(connection.brandId) !== String(req.user._id)) {
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

    connection.status = "rejected";
    connection.creatorNotificationSeen = false;
    connection.updatedAt = Date.now();

    await connection.save();

    // Notify Creator
    let campaign = null;
    if (connection.campaignId) {
      campaign = await Campaign.findById(connection.campaignId).select("title").lean();
    }
    const campaignTitle = campaign?.title || "Campaign Collaboration";
    const brandProfile = await Profile.findById(connection.brandId).select("fullName").lean();
    const brandName = brandProfile?.fullName || "A Brand";
    const declineReasonText = reason && reason.trim() ? `: "${reason.trim()}"` : "";
    const rejectText = `${brandName} declined your request for "${campaignTitle}"${declineReasonText}.`;

    // Add rejection reason to chat history if conversation exists
    try {
      const conv = await Conversation.findOne({
        creatorId: connection.creatorId,
        brandId: connection.brandId,
        campaignId: connection.campaignId,
      });
      if (conv) {
        await Message.create({
          conversationId: conv._id,
          senderId: connection.brandId,
          text: `[Collaboration Declined] ${brandName} declined this collaboration${reason && reason.trim() ? `. Reason: "${reason.trim()}"` : ""}.`,
          messageType: "system",
          read: false,
        });
      }
    } catch (chatErr) {
      console.warn("Could not post rejection message to chat:", chatErr);
    }

    await Notification.create({
      recipientId: connection.creatorId,
      senderId: connection.brandId,
      type: "campaign_request_rejected",
      text: rejectText,
      targetUrl: "/dashboard/influencer",
      createdAt: Date.now(),
    });

    sendPushToUser(connection.creatorId, {
      title: "Campaign Request Update",
      body: rejectText,
      url: "/dashboard/influencer",
    }).catch((err) => console.error("Request rejection push error:", err.message));

    res.status(200).json({
      success: true,
      message: "Request declined.",
      data: connection,
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

    if (role === "brand") {
      count = await Connection.countDocuments({
        brandId: profileId,
        status: "pending",
      });
    } else if (role === "creator") {
      count = await Connection.countDocuments({
        creatorId: profileId,
        creatorNotificationSeen: false,
        status: { $in: ["accepted", "rejected"] },
      });
    }

    res.json({
      success: true,
      data: count,
    });
  } catch (error) {
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

    const requests = await Connection.find({
      brandId,
      status: "pending",
    }).lean();

    const data = await Promise.all(
      requests.map(async (request) => {
        const creatorProfile = await Profile.findById(
          request.creatorId
        ).lean();

        const campaign = request.campaignId
          ? await Campaign.findById(request.campaignId).lean()
          : null;

        const followersCount = creatorProfile
          ? (creatorProfile.instagramFollowers || 0) +
            (creatorProfile.facebookFollowers || 0) +
            (creatorProfile.linkedinFollowers || 0) +
            (creatorProfile.youtubeFollowers || 0) +
            (creatorProfile.quoraFollowers || 0) +
            (creatorProfile.twitterFollowers || 0)
          : 0;

        const socialConns = await SocialConnection.find({
          profileId: request.creatorId,
        }).lean();

        const platformStr =
          socialConns
            .map(
              (c) =>
                c.platform.charAt(0).toUpperCase() +
                c.platform.slice(1)
            )
            .join(", ") || "Instagram";

        let creatorRating = 0;
        let reviewCount = 0;
        if (request.creatorId) {
          const reviews = await Review.find({ creatorId: request.creatorId, visible: true }).select("rating").lean();
          if (reviews.length > 0) {
            const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
            creatorRating = Number((sum / reviews.length).toFixed(1));
            reviewCount = reviews.length;
          }
        }

        return {
          ...request,
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

    const requests = await Connection.find({ creatorId }).lean();

    const data = await Promise.all(
      requests.map(async (request) => ({
        ...request,
        brandProfile: await Profile.findById(request.brandId).lean(),
      }))
    );

    res.json({ success: true, data });
  } catch (error) {
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

    const connection = await Connection.findOne({
      creatorId,
      brandId,
    });

    res.json({
      success: true,
      data: connection,
    });
  } catch (error) {
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

    await Connection.updateMany(
      {
        creatorId,
        creatorNotificationSeen: false,
        status: { $in: ["accepted", "rejected"] },
      },
      {
        creatorNotificationSeen: true,
      }
    );

    res.json({
      success: true,
      message: "Notifications marked as seen.",
    });
  } catch (error) {
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

    const filter =
      role === "brand"
        ? { brandId: profileId }
        : { creatorId: profileId };

    const list = await Connection.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const data = await Promise.all(
      list.map(async (connection) => {
        const otherProfile = await Profile.findById(
          role === "brand"
            ? connection.creatorId
            : connection.brandId
        ).lean();

        return {
          ...connection,
          otherProfile,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
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

    const list = await Connection.find({ creatorId }).lean();

    const data = await Promise.all(
      list.map(async (connection) => {
        const brandProfile = await Profile.findById(
          connection.brandId
        ).lean();

        const campaign = connection.campaignId
          ? await Campaign.findById(connection.campaignId).lean()
          : null;

        let conversationId = null;

        if (connection.status === "accepted") {
          const filter = {
            creatorId: connection.creatorId,
            brandId: connection.brandId,
          };

          if (connection.campaignId) {
            filter.campaignId = connection.campaignId;
          } else {
            filter.campaignId = null;
          }

          const conversation = await Conversation.findOne(filter).lean();

          conversationId = conversation?._id || null;
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

    const list = await Connection.find({
      brandId,
      status: "accepted",
    }).lean();

    const data = await Promise.all(
      list.map(async (connection) => {
        const creatorProfile = await Profile.findById(
          connection.creatorId
        ).lean();

        const campaign = connection.campaignId
          ? await Campaign.findById(connection.campaignId).lean()
          : null;

        const filter = {
          creatorId: connection.creatorId,
          brandId: connection.brandId,
        };

        if (connection.campaignId) {
          filter.campaignId = connection.campaignId;
        } else {
          filter.campaignId = null;
        }

        const conversation = await Conversation.findOne(filter).lean();

        return {
          ...connection,
          creatorProfile,
          campaign,
          conversationId: conversation?._id || null,
          conversationStatus: conversation?.status || "inactive",
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
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

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID.",
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Agreed creator amount must be greater than ₹0.",
      });
    }

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration record not found.",
      });
    }

    // Security check: User must be part of this collaboration (brand or creator)
    if (req.user) {
      const isBrand = String(connection.brandId) === String(req.user._id);
      const isCreator = String(connection.creatorId) === String(req.user._id);

      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not a participant in this collaboration.",
        });
      }
    }

    // If campaign linked, check budget constraints
    if (connection.campaignId) {
      const campaign = await Campaign.findById(connection.campaignId);
      if (campaign) {
        // 1. Check max budget per creator
        if (campaign.maxBudgetPerCreator && campaign.maxBudgetPerCreator > 0) {
          if (numericAmount > campaign.maxBudgetPerCreator) {
            return res.status(400).json({
              success: false,
              message: `Amount exceeds campaign maximum allowed budget per creator (₹${campaign.maxBudgetPerCreator.toLocaleString()}).`,
            });
          }
        }

        // 2. Check total committed creator amounts for this campaign (excluding this collaboration)
        if (campaign.totalBudget && campaign.totalBudget > 0) {
          const agreedConnections = await Connection.find({
            campaignId: campaign._id,
            collaborationStatus: "AMOUNT_AGREED",
            _id: { $ne: connection._id },
          }).lean();

          const totalCommitted = agreedConnections.reduce(
            (acc, curr) => acc + (curr.creatorAmount || 0),
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

    const senderProfileId = req.user ? req.user._id : (connection.brandId);
    const recipientId = String(senderProfileId) === String(connection.brandId)
      ? connection.creatorId
      : connection.brandId;

    connection.proposedAmount = numericAmount;
    connection.proposedBy = senderProfileId;
    connection.collaborationStatus = "NEGOTIATING";
    connection.updatedAt = Date.now();
    await connection.save();

    // Send notification to the other party
    const senderProfile = await Profile.findById(senderProfileId).select("fullName").lean();
    const senderName = senderProfile?.fullName || "Collaboration partner";
    let campaign = null;
    if (connection.campaignId) {
      campaign = await Campaign.findById(connection.campaignId).select("title").lean();
    }
    const campaignTitle = campaign?.title || "campaign";

    await Notification.create({
      recipientId,
      senderId: senderProfileId,
      type: "campaign_amount_proposed",
      text: `${senderName} proposed a creator payment of ₹${numericAmount.toLocaleString()} for "${campaignTitle}".`,
      createdAt: Date.now(),
    });

    res.status(200).json({
      success: true,
      message: "Offer proposed successfully.",
      data: connection,
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

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID.",
      });
    }

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration record not found.",
      });
    }

    // Security check: User must be part of this collaboration
    if (req.user) {
      const isBrand = String(connection.brandId) === String(req.user._id);
      const isCreator = String(connection.creatorId) === String(req.user._id);

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

    // If campaign linked, re-validate budget constraints
    if (connection.campaignId) {
      const campaign = await Campaign.findById(connection.campaignId);
      if (campaign) {
        // 1. Check max budget per creator
        if (campaign.maxBudgetPerCreator && campaign.maxBudgetPerCreator > 0) {
          if (finalAmount > campaign.maxBudgetPerCreator) {
            return res.status(400).json({
              success: false,
              message: `Amount exceeds campaign maximum allowed budget per creator (₹${campaign.maxBudgetPerCreator.toLocaleString()}).`,
            });
          }
        }

        // 2. Check total committed creator amounts for this campaign
        if (campaign.totalBudget && campaign.totalBudget > 0) {
          const agreedConnections = await Connection.find({
            campaignId: campaign._id,
            collaborationStatus: "AMOUNT_AGREED",
            _id: { $ne: connection._id },
          }).lean();

          const totalCommitted = agreedConnections.reduce(
            (acc, curr) => acc + (curr.brandTotal || curr.creatorAmount || 0),
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

    // Exact calculations:
    // Brand Total Budget = finalAmount (e.g. ₹1,000)
    // Pravixo Commission = 20% of brand budget (e.g. ₹200)
    // Creator Net Earnings = 80% (e.g. ₹800)
    const brandTotal = Math.round(finalAmount);
    const pravixoFee = Math.round(brandTotal * 0.20);
    const creatorAmount = brandTotal - pravixoFee;

    connection.creatorAmount = creatorAmount;
    connection.pravixoFee = pravixoFee;
    connection.brandTotal = brandTotal;
    connection.collaborationStatus = "AMOUNT_AGREED";
    connection.agreedAt = Date.now();
    connection.updatedAt = Date.now();
    await connection.save();

    // Send notification
    const agreeingUser = req.user ? req.user._id : (connection.brandId);
    const recipientId = String(agreeingUser) === String(connection.brandId)
      ? connection.creatorId
      : connection.brandId;

    const agreeingProfile = await Profile.findById(agreeingUser).select("fullName").lean();
    const agreeingName = agreeingProfile?.fullName || "Collaboration partner";
    let campaign = null;
    if (connection.campaignId) {
      campaign = await Campaign.findById(connection.campaignId).select("title").lean();
    }
    const campaignTitle = campaign?.title || "campaign";

    await Notification.create({
      recipientId,
      senderId: agreeingUser,
      type: "campaign_amount_agreed",
      text: `${agreeingName} agreed to collaboration budget ₹${brandTotal.toLocaleString()} (Creator receives ₹${creatorAmount.toLocaleString()} after 20% platform fee) for "${campaignTitle}".`,
      createdAt: Date.now(),
    });

    res.status(200).json({
      success: true,
      message: "Collaboration payment amount agreed successfully.",
      data: connection,
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
    if (connectionId && mongoose.Types.ObjectId.isValid(connectionId)) {
      connection = await Connection.findById(connectionId).lean();
    } else if (creatorId && brandId) {
      const filter = { creatorId, brandId };
      if (campaignId) filter.campaignId = campaignId;
      connection = await Connection.findOne(filter).lean();
    }

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found.",
      });
    }

    // Security check: User must be part of this collaboration (or admin)
    if (req.user && req.user.role !== "admin") {
      const isBrand = String(connection.brandId) === String(req.user._id);
      const isCreator = String(connection.creatorId) === String(req.user._id);
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not a participant in this collaboration.",
        });
      }
    }

    let campaign = null;
    if (connection.campaignId) {
      campaign = await Campaign.findById(connection.campaignId).lean();
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

// 15. Task 5: Get Deliverables Tracking for a Collaboration
export const getCollaborationDeliverables = async (req, res) => {
  try {
    const { connectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID.",
      });
    }

    let connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found.",
      });
    }

    // Security check: User must be part of this collaboration (brand or creator) or admin
    if (req.user && req.user.role !== "admin") {
      const isBrand = String(connection.brandId) === String(req.user._id);
      const isCreator = String(connection.creatorId) === String(req.user._id);
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have access to this collaboration's deliverables.",
        });
      }
    }

    // Fallback: If deliverablesTracking is empty but campaign exists, snapshot it now
    if ((!connection.deliverablesTracking || connection.deliverablesTracking.length === 0) && connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).lean();
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
        connection.deliverablesTracking = delivs;
        await connection.save();
      }
    }

    // Calculate progress summary
    const deliverables = connection.deliverablesTracking || [];
    const totalRequired = deliverables.reduce((sum, d) => sum + (d.requiredQuantity || 0), 0);
    const totalCompleted = deliverables.reduce((sum, d) => sum + (d.completedQuantity || 0), 0);
    const progressPercent = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        connectionId: connection._id,
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

// Delete / Dismiss connection request
export const deleteConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID.",
      });
    }

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found.",
      });
    }

    // Permission check: Brand owner, Creator owner, or Admin
    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user._id);
      const isBrandOwner = String(connection.brandId) === userProfileId;
      const isCreatorOwner = String(connection.creatorId) === userProfileId;

      if (!isBrandOwner && !isCreatorOwner) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to delete this connection request.",
        });
      }
    }

    await Connection.findByIdAndDelete(connectionId);

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

// Update Shipping Address by Creator
export const updateShippingAddress = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { fullName, phone, addressLine1, city, state, pincode } = req.body;

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found." });
    }

    if (!connection.barterDetails) {
      connection.barterDetails = { isBarter: true };
    } else {
      connection.barterDetails.isBarter = true;
    }

    connection.barterDetails.creatorShippingAddress = {
      fullName: fullName || "",
      phone: phone || "",
      addressLine1: addressLine1 || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
    };

    connection.updatedAt = Date.now();
    await connection.save();

    return res.status(200).json({
      success: true,
      message: "Shipping address updated successfully.",
      data: connection,
    });
  } catch (error) {
    console.error("Update shipping address error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Barter Shipment / Tracking by Brand
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

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found." });
    }

    if (!connection.barterDetails) {
      connection.barterDetails = {};
    }

    connection.barterDetails.isBarter = true;
    if (productName) connection.barterDetails.productName = productName;
    if (productValue != null) connection.barterDetails.productValue = Number(productValue);
    if (productDescription) connection.barterDetails.productDescription = productDescription;
    if (courierPartner) connection.barterDetails.courierPartner = courierPartner;
    if (trackingNumber) connection.barterDetails.trackingNumber = trackingNumber;
    if (trackingUrl) connection.barterDetails.trackingUrl = trackingUrl;

    if (shippingStatus) {
      connection.barterDetails.shippingStatus = shippingStatus;
      if (shippingStatus === "DISPATCHED" && !connection.barterDetails.shippedAt) {
        connection.barterDetails.shippedAt = Date.now();
      }
      if (shippingStatus === "DELIVERED" && !connection.barterDetails.deliveredAt) {
        connection.barterDetails.deliveredAt = Date.now();
      }
    }

    connection.updatedAt = Date.now();
    await connection.save();

    return res.status(200).json({
      success: true,
      message: "Barter shipping details updated successfully.",
      data: connection,
    });
  } catch (error) {
    console.error("Update barter shipping error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm Product Received by Creator
export const confirmProductReceived = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found." });
    }

    if (!connection.barterDetails) {
      connection.barterDetails = {};
    }

    connection.barterDetails.shippingStatus = "CONFIRMED_BY_CREATOR";
    connection.barterDetails.creatorConfirmedAt = Date.now();
    connection.updatedAt = Date.now();
    await connection.save();

    return res.status(200).json({
      success: true,
      message: "Product reception confirmed! You can now proceed with deliverables.",
      data: connection,
    });
  } catch (error) {
    console.error("Confirm product received error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};