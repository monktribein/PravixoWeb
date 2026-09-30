import mongoose from "mongoose";
import Profile from "../models/Profile.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Favorite from "../models/Favorite.js";
import PricingTier from "../models/PricingTier.js";
import Portfolio from "../models/Portfolio.js";
import Campaign from "../models/Campaign.js";
import CampaignTask from "../models/CampaignTask.js";
import Payment from "../models/Payment.js";
import PaymentAuditLog from "../models/PaymentAuditLog.js";
import CreatorBankDetails from "../models/CreatorBankDetails.js";
import WebhookLog from "../models/WebhookLog.js";
import Notification from "../models/Notification.js";
import UserSubscription from "../models/UserSubscription.js";
import Connection from "../models/Connection.js";
import Payout from "../models/Payout.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Withdrawal from "../models/Withdrawal.js";
import AddonService from "../models/AddonService.js";
import AddonBooking from "../models/AddonBooking.js";
import { creditCreatorWallet } from "./walletController.js";
import { sendPushToUser, sendPushToUsers } from "../utils/webPush.js";
import { processReferralQualification, processProjectPayoutWithReferral, reversePayoutAndReferralCommission } from "../services/referralService.js";

// =====================================================
// AGGREGATE STATS
// GET /api/admin/stats
// =====================================================
export const getStats = async (req, res) => {
  try {
    const totalUsers = await Profile.countDocuments();
    const creators = await Profile.countDocuments({ role: "creator" });
    const brands = await Profile.countDocuments({ role: "brand" });
    const conversations = await Conversation.countDocuments();
    const messages = await Message.countDocuments();
    const favorites = await Favorite.countDocuments();

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        creators,
        brands,
        conversations,
        messages,
        favorites,
      },
    });
  } catch (error) {
    console.error("Admin getStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch aggregate stats.",
      error: error.message,
    });
  }
};

// =====================================================
// LIST ALL CONVERSATIONS
// GET /api/admin/conversations
// =====================================================
export const listAllConversations = async (req, res) => {
  try {
    const { type } = req.query;

    const filter = {};
    if (type) {
      filter.conversationType = type;
    }

    const conversations = await Conversation.find(filter)
      .populate("creatorId", "fullName email handle avatarUrl avatar gender role")
      .populate("brandId", "fullName email handle avatarUrl avatar gender role companyName brandName")
      .populate("adminId", "fullName email handle avatarUrl avatar gender role")
      .populate("campaignId", "title budget category")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const results = await Promise.all(
      conversations.map(async (c) => {
        const messages = await Message.find({ conversationId: c._id })
          .sort({ createdAt: -1 })
          .limit(1)
          .lean();

        const messageCount = await Message.countDocuments({ conversationId: c._id });

        return {
          ...c,
          creator: c.creatorId,
          brand: c.brandId,
          admin: c.adminId,
          campaign: c.campaignId,
          lastMessage: messages[0] || null,
          messageCount,
        };
      })
    );

    // Sort by recent activity / lastMessage so latest chats always appear at the top
    const sortedResults = results.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      data: sortedResults,
    });
  } catch (error) {
    console.error("Admin listAllConversations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list conversations.",
      error: error.message,
    });
  }
};

// =====================================================
// LIST MESSAGES FOR A CONVERSATION
// GET /api/admin/conversations/:id/messages
// =====================================================
export const listMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id)
      .populate("creatorId", "fullName email handle avatarUrl role")
      .populate("brandId", "fullName email handle avatarUrl role")
      .populate("adminId", "fullName email handle avatarUrl role")
      .populate("campaignId", "title budget category totalBudget deliverables")
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    const messages = await Message.find({ conversationId: id })
      .populate("senderId", "fullName email handle avatarUrl role")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        creator: conversation?.creatorId || null,
        brand: conversation?.brandId || null,
        admin: conversation?.adminId || null,
        campaign: conversation?.campaignId || null,
        messages,
      },
    });
  } catch (error) {
    console.error("Admin listMessages error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list messages.",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE PROFILE (CASCADE / PERMANENT PURGE)
// DELETE /api/admin/profiles/:id
// =====================================================
export const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, permanent } = req.body || {}; // Reason and permanent flag from admin

    const isPermanent = permanent === true || permanent === "true" || req.query?.permanent === "true";

    // Delete pricing tiers
    await PricingTier.deleteMany({ profileId: id });

    // Delete portfolio
    await Portfolio.deleteMany({ profileId: id });

    // Delete favorites
    await Favorite.deleteMany({ $or: [{ brandId: id }, { creatorId: id }] });

    // Delete conversations & messages
    const convs = await Conversation.find({
      $or: [{ creatorId: id }, { brandId: id }, { adminId: id }],
    });
    const convIds = convs.map((c) => c._id);

    await Message.deleteMany({ conversationId: { $in: convIds } });
    await Conversation.deleteMany({ _id: { $in: convIds } });

    // Delete creator/brand addons & bookings
    await AddonService.deleteMany({ creatorId: id });
    await AddonBooking.deleteMany({ $or: [{ profileId: id }] });

    // Delete connections, bank details, subscriptions
    await Connection.deleteMany({ $or: [{ requesterId: id }, { recipientId: id }] });
    await CreatorBankDetails.deleteMany({ profileId: id });
    await UserSubscription.deleteMany({ profileId: id });
    await WalletTransaction.deleteMany({ profileId: id });
    await Wallet.deleteMany({ profileId: id });
    await Withdrawal.deleteMany({ creatorId: id });

    if (isPermanent) {
      // PERMANENT PURGE: Completely remove profile and notifications from database
      await Notification.deleteMany({ $or: [{ recipientId: id }, { senderId: id }] });
      await Profile.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        permanent: true,
        message: "User and all associated data permanently deleted from database.",
      });
    }

    // SOFT DELETE: Mark as isDeleted so it moves to Deleted Users tab
    const profile = await Profile.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deleteReason: reason || "Violation of platform terms.",
      },
      { new: true }
    );

    await Notification.create({
      recipientId: id,
      senderId: req.user?.profileId || id, 
      type: "account_deleted",
      text: `Your account has been deleted. Reason: ${reason || "Violation of platform terms."}`,
    });

    return res.status(200).json({
      success: true,
      permanent: false,
      message: "Profile moved to deleted users.",
    });
  } catch (error) {
    console.error("Admin deleteProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete profile.",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE CONVERSATION
// DELETE /api/admin/conversations/:id
// =====================================================
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    await Message.deleteMany({ conversationId: id });
    await Conversation.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (error) {
    console.error("Admin deleteConversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete conversation.",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE PROFILE ROLE
// PATCH /api/admin/profiles/:id/role
// =====================================================
export const updateProfileRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["creator", "brand"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'creator' or 'brand'.",
      });
    }

    const profile = await Profile.findByIdAndUpdate(id, { role }, { new: true });

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Admin updateProfileRole error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile role.",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE VERIFICATION STATUS (KYC APPROVE/REJECT)
// PATCH /api/admin/profiles/:id/verification
// =====================================================
export const updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;

    if (!["unverified", "pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status.",
      });
    }

    const profile = await Profile.findByIdAndUpdate(
      id,
      { verificationStatus: status },
      { new: true }
    );

    if (profile) {
      const senderId = req.user?.profileId || req.user?._id || req.user?.id || profile._id;
      const userDashboardUrl = profile.role === "creator" ? "/dashboard/influencer" : "/dashboard/customer";

      if (status === "rejected") {
        const rejText = `Your verification request was rejected. Reason: ${rejectReason || "Does not meet guidelines."}`;
        await Notification.create({
          recipientId: profile._id,
          senderId,
          type: "verification_rejected",
          text: rejText,
        }).catch((e) => console.warn("Failed to create rejection notification:", e.message));

        sendPushToUser(profile._id, {
          title: "Verification Update ⚠️",
          body: rejText,
          url: userDashboardUrl,
        }).catch((err) => console.error("Verification reject push error:", err.message));

      } else if (status === "verified") {
        const appText = `Congratulations! Your ${profile.role === "creator" ? "Creator" : "Brand"} profile has been verified. 🎉`;
        await Notification.create({
          recipientId: profile._id,
          senderId,
          type: "verification_approved",
          text: appText,
        }).catch((e) => console.warn("Failed to create approval notification:", e.message));

        sendPushToUser(profile._id, {
          title: "Profile Verified! 🎖️",
          body: appText,
          url: userDashboardUrl,
        }).catch((err) => console.error("Verification approve push error:", err.message));

        // Process referral qualification if profile is creator
        if (profile.role === "creator") {
          try {
            await processReferralQualification({
              referredCreatorId: profile._id,
              triggerType: "profile_verified",
            });
          } catch (refErr) {
            console.error("[Verification] Error processing referral qualification:", refErr);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Verification status updated to ${status}.`,
      data: profile,
    });
  } catch (error) {
    console.error("Admin updateVerificationStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update verification status.",
      error: error.message,
    });
  }
};

// =====================================================
// GET PENDING CREATORS KYC
// GET /api/admin/verification/creators/pending
// =====================================================
export const getPendingCreators = async (req, res) => {
  try {
    const creators = await Profile.find({
      role: "creator",
      verificationStatus: "pending",
    }).lean();

    return res.status(200).json({
      success: true,
      data: creators,
    });
  } catch (error) {
    console.error("Admin getPendingCreators error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending creators.",
      error: error.message,
    });
  }
};

// =====================================================
// GET PENDING BRANDS KYC
// GET /api/admin/verification/brands/pending
// =====================================================
export const getPendingBrands = async (req, res) => {
  try {
    const brands = await Profile.find({
      role: "brand",
      verificationStatus: "pending",
    }).lean();

    return res.status(200).json({
      success: true,
      data: brands,
    });
  } catch (error) {
    console.error("Admin getPendingBrands error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending brands.",
      error: error.message,
    });
  }
};

// =====================================================
// =====================================================
// GET CREATOR VERIFICATION HISTORY
// GET /api/admin/verification/creators/history
// =====================================================
export const getCreatorVerificationHistory = async (req, res) => {
  try {
    const creators = await Profile.find({
      role: "creator",
      verificationStatus: { $in: ["verified", "rejected", "unverified"] },
    }).lean();

    return res.status(200).json({
      success: true,
      data: creators,
    });
  } catch (error) {
    console.error("Admin getCreatorVerificationHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch creator history.",
      error: error.message,
    });
  }
};

// =====================================================
// GET BRAND VERIFICATION HISTORY
// GET /api/admin/verification/brands/history
// =====================================================
export const getBrandVerificationHistory = async (req, res) => {
  try {
    const brands = await Profile.find({
      role: "brand",
      verificationStatus: { $in: ["verified", "rejected", "unverified"] },
    }).lean();

    return res.status(200).json({
      success: true,
      data: brands,
    });
  } catch (error) {
    console.error("Admin getBrandVerificationHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch brand history.",
      error: error.message,
    });
  }
};

// =====================================================
// SUSPEND PROFILE
// POST /api/admin/profiles/:id/suspend
// =====================================================
export const suspendProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, durationDays } = req.body;

    const days = Number(durationDays) || 7;
    const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const profile = await Profile.findByIdAndUpdate(
      id,
      {
        isSuspended: true,
        suspensionReason: reason || "Violation of platform guidelines.",
        suspendedUntil,
      },
      { new: true }
    );

    await Notification.create({
      recipientId: profile._id,
      senderId: req.user.profileId, // Admin ID
      type: "account_suspended",
      text: `Your account has been suspended for ${days} days. Reason: ${reason || "Violation of platform guidelines."}`,
    });

    return res.status(200).json({
      success: true,
      message: `Profile suspended for ${days} days.`,
      data: profile,
    });
  } catch (error) {
    console.error("Admin suspendProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to suspend profile.",
      error: error.message,
    });
  }
};

// =====================================================
// UNSUSPEND PROFILE
// POST /api/admin/profiles/:id/unsuspend
// =====================================================
export const unsuspendProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await Profile.findByIdAndUpdate(
      id,
      {
        isSuspended: false,
        suspensionReason: "",
        suspendedUntil: null,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile unsuspended successfully.",
      data: profile,
    });
  } catch (error) {
    console.error("Admin unsuspendProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unsuspend profile.",
      error: error.message,
    });
  }
};

// =====================================================
// LIST ALL TASKS
// =====================================================
// LIST ALL TASKS
// GET /api/admin/tasks
// =====================================================
export const listAllTasks = async (req, res) => {
  try {
    const tasks = await CampaignTask.find()
      .populate("campaignId", "title budget category")
      .populate("creatorId", "fullName email handle avatarUrl")
      .populate("brandId", "fullName email handle avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    const formattedTasks = tasks.map((t) => ({
      ...t,
      campaign: t.campaignId || t.campaign || null,
      creator: t.creatorId || t.creator || null,
      brand: t.brandId || t.brand || null,
    }));

    // Also fetch connections that track deliverables
    const connections = await Connection.find({
      $or: [
        { deliverablesTracking: { $exists: true, $not: { $size: 0 } } },
        { allDeliverablesCompleted: true },
        { paymentReleaseStatus: { $in: ["WAITING_72_HOURS", "ELIGIBLE_FOR_RELEASE", "RELEASED"] } },
      ],
    })
      .populate("campaignId", "title budget category")
      .populate("creatorId", "fullName email handle avatarUrl")
      .populate("brandId", "fullName email handle avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    const connectionTasks = [];
    const existingTaskConnectionIds = new Set(
      tasks.map((t) => t.connectionId?.toString()).filter(Boolean)
    );

    for (const c of connections) {
      const cIdStr = c._id.toString();

      // Determine default overall status for deliverables in this connection
      let derivedStatus = "in_progress";
      if (c.paymentReleaseStatus === "RELEASED" || c.approvalCompletedAt) {
        derivedStatus = "approved";
      } else if (c.allDeliverablesCompleted || c.workCompletedAt) {
        derivedStatus = "completed";
      }

      if (c.deliverablesTracking && c.deliverablesTracking.length > 0) {
        for (const deliv of c.deliverablesTracking) {
          let delivStatus = derivedStatus;
          if (deliv.status === "COMPLETED" || deliv.status === "APPROVED") {
            delivStatus = c.paymentReleaseStatus === "RELEASED" ? "approved" : "completed";
          } else if (deliv.status === "IN_PROGRESS" || deliv.status === "SUBMITTED") {
            delivStatus = "in_progress";
          } else if (deliv.status === "REJECTED") {
            delivStatus = "revision_requested";
          }

          connectionTasks.push({
            _id: deliv._id || `${cIdStr}-${deliv.type}`,
            campaignId: c.campaignId?._id || null,
            creatorId: c.creatorId?._id || null,
            brandId: c.brandId?._id || null,
            connectionId: c._id,
            campaign: c.campaignId || null,
            creator: c.creatorId || null,
            brand: c.brandId || null,
            title: `${deliv.type || "Deliverable"} (${deliv.completedQuantity || 0}/${deliv.requiredQuantity || 1} completed)`,
            description: `Deliverable requirement for ${c.campaignId?.title || "Campaign"}`,
            deliverables: `${deliv.requiredQuantity || 1} ${deliv.type || "Deliverable"}`,
            priority: "medium",
            status: delivStatus,
            dueDate: c.campaignId?.endDate || deliv.updatedAt || deliv.createdAt || c.createdAt || Date.now(),
            startedAt: deliv.createdAt || c.agreedAt || c.createdAt || null,
            completedAt: (deliv.status === "COMPLETED" || deliv.status === "APPROVED" || c.allDeliverablesCompleted) ? (deliv.updatedAt || c.payoutReleasedAt || c.approvalCompletedAt || c.workCompletedAt || deliv.createdAt) : null,
            createdAt: deliv.createdAt || c.createdAt || Date.now(),
            updatedAt: deliv.updatedAt || c.updatedAt || Date.now(),
          });
        }
      } else if (!existingTaskConnectionIds.has(cIdStr)) {
        // Fallback for connections without explicit deliverablesTracking array
        connectionTasks.push({
          _id: c._id,
          campaignId: c.campaignId?._id || null,
          creatorId: c.creatorId?._id || null,
          brandId: c.brandId?._id || null,
          connectionId: c._id,
          campaign: c.campaignId || null,
          creator: c.creatorId || null,
          brand: c.brandId || null,
          title: `Collaboration Deliverable - ${c.campaignId?.title || "Direct Collaboration"}`,
          description: c.pitch || "Collaboration deliverables",
          deliverables: "Collaboration Deliverables",
          priority: "medium",
          status: derivedStatus,
          dueDate: c.campaignId?.endDate || c.updatedAt || c.createdAt || Date.now(),
          startedAt: c.agreedAt || c.createdAt || null,
          completedAt: c.payoutReleasedAt || c.approvalCompletedAt || c.workCompletedAt || null,
          createdAt: c.createdAt || Date.now(),
          updatedAt: c.updatedAt || Date.now(),
        });
      }
    }

    const allCombined = [...formattedTasks, ...connectionTasks].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      data: allCombined,
    });
  } catch (error) {
    console.error("Admin listAllTasks error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list tasks.",
      error: error.message,
    });
  }
};

// =====================================================
// HELPER: SYNC 72-HOUR PAYMENT RELEASE ELIGIBILITY (TASK 10)
// =====================================================
export const syncCollaboration72HourEligibility = async () => {
  try {
    const now = Date.now();
    // Find all collaborations that are PAID, completed deliverables, and currently WAITING_72_HOURS or missing status
    const waitingCollabs = await Connection.find({
      paymentStatus: "PAID",
      allDeliverablesCompleted: true,
      paymentReleaseEligibleAt: { $ne: null },
      paymentReleaseStatus: { $in: ["WAITING_72_HOURS", "NOT_APPLICABLE"] },
    });

    const admins = await Profile.find({ role: "admin" }).select("_id").lean();

    for (const collab of waitingCollabs) {
      if (now >= collab.paymentReleaseEligibleAt) {
        collab.paymentReleaseStatus = "ELIGIBLE_FOR_RELEASE";
        
        // If admin hasn't been notified yet, dispatch payment_release_eligible notification
        if (!collab.adminNotifiedOfEligibility) {
          const brand = await Profile.findById(collab.brandId).select("fullName").lean();
          const creator = await Profile.findById(collab.creatorId).select("fullName").lean();
          let campaignTitle = "Campaign";
          if (collab.campaignId) {
            const camp = await Campaign.findById(collab.campaignId).select("title").lean();
            if (camp) campaignTitle = camp.title;
          }

          const brandName = brand?.fullName || "Brand";
          const creatorName = creator?.fullName || "Creator";
          const creatorAmt = (collab.creatorAmount || 0).toLocaleString("en-IN");
          const brandPaid = (collab.brandTotal || 0).toLocaleString("en-IN");

          for (const admin of admins) {
            await Notification.create({
              recipientId: admin._id,
              senderId: collab.creatorId,
              type: "payment_release_eligible",
              text: `Creator payment (₹${creatorAmt}) for "${campaignTitle}" (${creatorName} & ${brandName}) is now eligible for release after the 72-hour review period.`,
              createdAt: now,
            });
          }

          collab.adminNotifiedOfEligibility = true;
        }

        collab.updatedAt = now;
        await collab.save();
      } else if (collab.paymentReleaseStatus !== "WAITING_72_HOURS") {
        collab.paymentReleaseStatus = "WAITING_72_HOURS";
        collab.updatedAt = now;
        await collab.save();
      }
    }
  } catch (err) {
    console.error("Error in syncCollaboration72HourEligibility:", err);
  }
};

// =====================================================
// LIST ALL PAYMENTS & ESCROW
// GET /api/admin/payments
// =====================================================
export const listAllPayments = async (req, res) => {
  try {
    // Run lightweight eligibility sync on demand
    await syncCollaboration72HourEligibility();

    const payments = await Payment.find()
      .populate("campaignId", "title budget")
      .populate("creatorId", "fullName email handle avatarUrl")
      .populate("brandId", "fullName email handle avatarUrl")
      .populate("taskId", "title deliverables status")
      .sort({ createdAt: -1 })
      .lean();

    const withAudit = await Promise.all(
      payments.map(async (p) => {
        const auditLogs = await PaymentAuditLog.find({ paymentId: p._id })
          .sort({ createdAt: -1 })
          .lean();
        return {
          ...p,
          campaign: p.campaignId,
          creator: p.creatorId,
          brand: p.brandId,
          task: p.taskId,
          auditLogs,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: withAudit,
    });
  } catch (error) {
    console.error("Admin listAllPayments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list payments.",
      error: error.message,
    });
  }
};

// =====================================================
// LIST COLLABORATION 72-HOUR PAYMENT RELEASES (TASK 10)
// GET /api/admin/payments/collaborations
// =====================================================
export const listCollaborationPaymentReleases = async (req, res) => {
  try {
    // Run sync before querying
    await syncCollaboration72HourEligibility();

    const { status } = req.query; // "WAITING_72_HOURS", "ELIGIBLE_FOR_RELEASE", or empty for all paid/completed
    const filter = {
      paymentStatus: "PAID",
      allDeliverablesCompleted: true,
    };

    if (status) {
      filter.paymentReleaseStatus = status;
    }

    const collabs = await Connection.find(filter)
      .populate("campaignId", "title deliverables minBudgetPerCreator maxBudgetPerCreator totalBudget")
      .populate("creatorId", "fullName email handle avatarUrl phone location")
      .populate("brandId", "fullName email handle avatarUrl website location")
      .populate("paymentId")
      .sort({ workCompletedAt: -1, createdAt: -1 })
      .lean();

    const now = Date.now();

    const enriched = collabs.map((c) => {
      const isEligible = c.paymentReleaseEligibleAt && now >= c.paymentReleaseEligibleAt;
      const releaseStatus = isEligible ? "ELIGIBLE_FOR_RELEASE" : (c.paymentReleaseStatus || "WAITING_72_HOURS");
      const remainingMs = c.paymentReleaseEligibleAt ? Math.max(0, c.paymentReleaseEligibleAt - now) : 0;

      return {
        _id: c._id,
        campaign: c.campaignId,
        creator: c.creatorId,
        brand: c.brandId,
        payment: c.paymentId,
        creatorAmount: c.creatorAmount || 0,
        pravixoFee: c.pravixoFee || 0,
        brandTotal: c.brandTotal || 0,
        paymentStatus: c.paymentStatus,
        allDeliverablesCompleted: c.allDeliverablesCompleted,
        deliverablesTracking: c.deliverablesTracking || [],
        workCompletedAt: c.workCompletedAt,
        approvalCompletedAt: c.approvalCompletedAt,
        paymentReleaseEligibleAt: c.paymentReleaseEligibleAt,
        paymentReleaseStatus: releaseStatus,
        remainingMs,
        createdAt: c.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("Admin listCollaborationPaymentReleases error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list collaboration payment releases.",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE COLLABORATION PAYMENT RELEASE DETAILS (TASK 10)
// GET /api/admin/payments/collaborations/:id
// =====================================================
export const getCollaborationPaymentReleaseDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid collaboration ID." });
    }

    await syncCollaboration72HourEligibility();

    const collab = await Connection.findById(id)
      .populate("campaignId")
      .populate("creatorId", "fullName email handle avatarUrl phone location")
      .populate("brandId", "fullName email handle avatarUrl website location")
      .populate("paymentId")
      .lean();

    if (!collab) {
      return res.status(404).json({ success: false, message: "Collaboration not found." });
    }

    const now = Date.now();
    const isEligible = collab.paymentReleaseEligibleAt && now >= collab.paymentReleaseEligibleAt;
    const releaseStatus = isEligible ? "ELIGIBLE_FOR_RELEASE" : (collab.paymentReleaseStatus || "WAITING_72_HOURS");
    const remainingMs = collab.paymentReleaseEligibleAt ? Math.max(0, collab.paymentReleaseEligibleAt - now) : 0;

    return res.status(200).json({
      success: true,
      data: {
        ...collab,
        paymentReleaseStatus: releaseStatus,
        remainingMs,
      },
    });
  } catch (error) {
    console.error("Admin getCollaborationPaymentReleaseDetails error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch collaboration payment release details.",
      error: error.message,
    });
  }
};

// =====================================================
// RELEASE CREATOR PAYOUT (TASK 11)
// POST /api/admin/payments/collaborations/:id/release
// =====================================================
export const releaseCreatorPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid collaboration ID.",
      });
    }

    // Security & Eligibility Check: Fetch Connection and populate necessary refs
    const connection = await Connection.findById(id);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found.",
      });
    }

    // 1. Payment requirement: Must be PAID
    if (connection.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Cannot release payout: Collaboration payment is not in PAID status.",
      });
    }

    // 2. Deliverables requirement: All required deliverables must be APPROVED
    const allApproved =
      connection.deliverablesTracking &&
      connection.deliverablesTracking.length > 0 &&
      connection.deliverablesTracking.every(
        (deliv) => (deliv.completedQuantity || 0) >= (deliv.requiredQuantity || 1)
      );

    if (!connection.allDeliverablesCompleted || !allApproved) {
      return res.status(400).json({
        success: false,
        message: "Cannot release payout: Not all required campaign deliverables are approved.",
      });
    }

    // 3. Review period requirement: 72 hours must be completed
    const now = Date.now();
    if (!connection.paymentReleaseEligibleAt || now < connection.paymentReleaseEligibleAt) {
      return res.status(400).json({
        success: false,
        message: "Cannot release payout: 72-hour review period has not yet elapsed.",
      });
    }

    // 4. Idempotency Check: Cannot release if already RELEASED
    if (connection.paymentReleaseStatus === "RELEASED") {
      return res.status(400).json({
        success: false,
        message: "Payout has already been released for this collaboration.",
      });
    }

    // 5. Derive trusted financial data directly from stored records
    const creatorAmount = connection.creatorAmount;
    if (!creatorAmount || creatorAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or zero creator payout amount in collaboration record.",
      });
    }

    const adminId = req.user?._id || req.user?.profileId;
    const transactionReference = `PAYOUT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Fetch Campaign & Brand details for rich audit log and notifications
    let campaignTitle = "Collaboration Campaign";
    if (connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).select("title").lean();
      if (camp?.title) campaignTitle = camp.title;
    }

    const brandDoc = await Profile.findById(connection.brandId).select("fullName").lean();
    const brandName = brandDoc?.fullName || "Brand";

    // Create Payout Record
    const payout = await Payout.create({
      collaborationId: connection._id,
      paymentId: connection.paymentId || null,
      campaignId: connection.campaignId || null,
      brandId: connection.brandId,
      creatorId: connection.creatorId,
      amount: creatorAmount,
      currency: "INR",
      status: "COMPLETED",
      payoutMethod: "MANUAL_BANK_TRANSFER",
      transactionReference,
      initiatedBy: adminId,
      initiatedAt: now,
      completedAt: now,
      notes: notes || "Manual Admin Payout Release",
    });

    // Update Connection state
    connection.paymentReleaseStatus = "RELEASED";
    connection.payoutId = payout._id;
    connection.payoutReleasedAt = now;
    connection.updatedAt = now;
    await connection.save();

    // Update Payment record if present
    if (connection.paymentId) {
      const payment = await Payment.findById(connection.paymentId);
      if (payment) {
        payment.paymentStatus = "completed";
        payment.holdingStatus = "released";
        payment.payoutStatus = "processed";
        payment.releasedAt = now;
        payment.payoutReference = transactionReference;
        payment.updatedAt = now;
        await payment.save();

        // Add audit log entry
        await PaymentAuditLog.create({
          paymentId: payment._id,
          action: "Manual Payout Released",
          details: `Admin released Creator payout of ₹${creatorAmount.toLocaleString("en-IN")}. Ref: ${transactionReference}`,
          createdAt: now,
        });
      }
    }

    // Credit Creator Wallet (Referral hook: credits creator with full 80% earnings; credits referrer from Pravixo's commission share)
    let walletResult = null;
    let payoutBreakdown = null;
    try {
      const payoutRes = await processProjectPayoutWithReferral({
        creatorId: connection.creatorId,
        collaborationId: connection._id,
        campaignId: connection.campaignId || null,
        payoutId: payout._id,
        gross_payout_amount: creatorAmount,
        total_deal_amount: connection.brandTotal || (connection.pravixoFee ? creatorAmount + connection.pravixoFee : Math.round(creatorAmount / 0.8)),
        platform_fee: 0,
        transactionReference,
        description: `Payment released for collaboration (${campaignTitle})`,
      });
      walletResult = payoutRes.creatorResult;
      payoutBreakdown = payoutRes.breakdown;
    } catch (walletErr) {
      console.error("Wallet credit / referral commission error:", walletErr);
    }

    // Amount actually credited to creator after referral commission if applicable
    const finalCreatorCredited = payoutBreakdown?.creator_net_amount ?? creatorAmount;

    // Send Notification to Creator
    const creatorPayoutText = `₹${finalCreatorCredited.toLocaleString("en-IN")} has been added to your wallet from your completed collaboration for "${campaignTitle}" (Ref: ${transactionReference}).`;
    await Notification.create({
      recipientId: connection.creatorId,
      senderId: adminId || connection.brandId,
      type: "payment_released",
      text: creatorPayoutText,
      targetUrl: "/dashboard/influencer",
      metadata: { collaborationId: connection._id, amount: creatorAmount, reference: transactionReference },
      createdAt: now,
    });

    sendPushToUser(connection.creatorId, {
      title: "Payout Received in Wallet! 💰🎉",
      body: creatorPayoutText,
      url: "/dashboard/influencer",
    }).catch((err) => console.error("Creator payout push error:", err.message));

    // Send Notification to Brand
    const brandPayoutText = `Creator payout of ₹${creatorAmount.toLocaleString("en-IN")} for "${campaignTitle}" has been released and completed.`;
    await Notification.create({
      recipientId: connection.brandId,
      senderId: adminId || connection.creatorId,
      type: "payment_released",
      text: brandPayoutText,
      targetUrl: "/dashboard/customer",
      metadata: { collaborationId: connection._id, amount: creatorAmount, reference: transactionReference },
      createdAt: now,
    });

    sendPushToUser(connection.brandId, {
      title: "Collaboration Payout Released ✅",
      body: brandPayoutText,
      url: "/dashboard/customer",
    }).catch((err) => console.error("Brand payout push error:", err.message));

    // Post update in conversation chat if exists
    try {
      const convFilter = {
        creatorId: connection.creatorId,
        brandId: connection.brandId,
      };
      if (connection.campaignId) convFilter.campaignId = connection.campaignId;
      const conversation = await Conversation.findOne(convFilter);
      if (conversation) {
        await Message.create({
          conversationId: conversation._id,
          senderId: adminId || connection.brandId,
          text: `[Payout Released] Admin released creator payout of ₹${creatorAmount.toLocaleString("en-IN")}. Transaction Ref: ${transactionReference}. Collaboration complete.`,
          messageType: "system",
          metadata: {
            payoutId: payout._id,
            amount: creatorAmount,
            transactionReference,
            releasedAt: now,
          },
          read: false,
        });
      }
    } catch (chatErr) {
      console.warn("Could not post payout message to chat:", chatErr);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully released ₹${creatorAmount.toLocaleString("en-IN")} payout to creator.`,
      data: {
        payout,
        connection,
        wallet: walletResult?.wallet || null,
        transaction: walletResult?.transaction || null,
      },
    });
  } catch (error) {
    console.error("Admin releaseCreatorPayout error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to release creator payout.",
      error: error.message,
    });
  }
};

// =====================================================
// RESOLVE PAYMENT DISPUTE
// POST /api/admin/payments/:id/resolve-dispute
// =====================================================
export const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body; // "release" | "refund"

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    if (payment.paymentStatus !== "disputed") {
      return res.status(400).json({
        success: false,
        message: "Payment is not in disputed status.",
      });
    }

    const now = new Date();

    if (resolution === "release") {
      const bankDetails = await CreatorBankDetails.findOne({ creatorId: payment.creatorId });

      payment.paymentStatus = "completed";
      payment.holdingStatus = "released";
      payment.releasedAt = now;
      payment.payoutStatus = "processed";
      payment.payoutReference = "RESOLVE-" + Math.random().toString(36).substring(2, 9).toUpperCase();
      payment.creatorBankAccountId = bankDetails?._id || undefined;
      await payment.save();

      await PaymentAuditLog.create({
        paymentId: payment._id,
        action: "Released",
        details: "Dispute resolved by Admin. Funds released to Creator.",
        createdAt: now,
      });

      await Notification.create({
        recipientId: payment.brandId,
        senderId: payment.brandId,
        type: "payment_released",
        text: `Admin resolved dispute: Escrow payment of ₹${payment.grossAmount.toLocaleString()} released to Creator.`,
        taskId: payment.taskId,
        read: false,
      });

      await Notification.create({
        recipientId: payment.creatorId,
        senderId: payment.brandId,
        type: "payment_released",
        text: `Admin resolved dispute: Escrow payment of ₹${payment.creatorAmount.toLocaleString()} released to your account.`,
        taskId: payment.taskId,
        read: false,
      });
    } else {
      payment.paymentStatus = "refunded";
      payment.holdingStatus = "refunded";
      payment.refundStatus = "processed";
      payment.refundAmount = payment.grossAmount;
      payment.refundReason = "Admin Dispute Settlement Refund";
      await payment.save();

      await PaymentAuditLog.create({
        paymentId: payment._id,
        action: "Refund Initiated",
        details: "Admin resolved dispute. Refund processed back to Brand.",
        createdAt: now,
      });

      await Notification.create({
        recipientId: payment.brandId,
        senderId: payment.brandId,
        type: "payment_released",
        text: `Admin resolved dispute: Escrow payment of ₹${payment.grossAmount.toLocaleString()} refunded to your account.`,
        taskId: payment.taskId,
        read: false,
      });

      await Notification.create({
        recipientId: payment.creatorId,
        senderId: payment.brandId,
        type: "revision_requested",
        text: `Admin resolved dispute: Escrow payment of ₹${payment.creatorAmount.toLocaleString()} has been refunded to Brand.`,
        taskId: payment.taskId,
        read: false,
      });

      // Automatically reverse any payout and linked referral commission
      try {
        const payoutIdToReverse = payment.payoutReference || payment._id;
        // Also check if connection has an associated payout
        const connection = await Connection.findById(payment.connectionId);
        const targetPayoutId = connection?.payoutId || payoutIdToReverse;
        await reversePayoutAndReferralCommission({ payout_id: targetPayoutId });
      } catch (revErr) {
        console.warn("Dispute refund auto-reversal error:", revErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Dispute resolved with ${resolution}.`,
      data: payment,
    });
  } catch (error) {
    console.error("Admin resolveDispute error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve dispute.",
      error: error.message,
    });
  }
};

// =====================================================
// GET REVENUE STATS
// GET /api/admin/revenue-stats
// =====================================================
export const getRevenueStats = async (req, res) => {
  try {
    const payments = await Payment.find();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    let todayRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;
    let totalRevenue = 0;
    let platformCommissionEarned = 0;
    let paymentsInHolding = 0;
    let releasedPayments = 0;
    let disputedPayments = 0;

    for (const p of payments) {
      const isPaid =
        p.paymentStatus !== "pending" &&
        p.paymentStatus !== "invoice_generated" &&
        p.paymentStatus !== "refunded";

      if (isPaid) {
        totalRevenue += p.grossAmount || 0;
        platformCommissionEarned += p.platformCommissionAmount || 0;

        const timeDiff = now - new Date(p.createdAt).getTime();
        if (timeDiff <= oneDay) todayRevenue += p.grossAmount || 0;
        if (timeDiff <= oneWeek) weeklyRevenue += p.grossAmount || 0;
        if (timeDiff <= oneMonth) monthlyRevenue += p.grossAmount || 0;

        if (p.paymentStatus === "holding") {
          paymentsInHolding += p.grossAmount || 0;
        } else if (p.paymentStatus === "completed" || p.paymentStatus === "released") {
          releasedPayments += p.grossAmount || 0;
        } else if (p.paymentStatus === "disputed") {
          disputedPayments += p.grossAmount || 0;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        todayRevenue,
        weeklyRevenue,
        monthlyRevenue,
        totalRevenue,
        platformCommissionEarned,
        paymentsInHolding,
        releasedPayments,
        disputedPayments,
      },
    });
  } catch (error) {
    console.error("Admin getRevenueStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch revenue stats.",
      error: error.message,
    });
  }
};

// =====================================================
// GET WEBHOOK LOGS
// GET /api/admin/webhooks/logs
// =====================================================
export const getWebhookLogs = async (req, res) => {
  try {
    const logs = await WebhookLog.find().sort({ createdAt: -1 }).limit(100);

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("Admin getWebhookLogs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch webhook logs.",
      error: error.message,
    });
  }
};

// =====================================================
// LIST ALL PROFILES
// GET /api/admin/profiles
// =====================================================
export const listAllProfiles = async (req, res) => {
  try {
    // Exclude admin accounts from user management
    const profiles = await Profile.find({ role: { $in: ["creator", "brand"] } }).lean();
    return res.status(200).json({
      success: true,
      data: profiles,
    });
  } catch (error) {
    console.error("Admin listAllProfiles error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list profiles.",
      error: error.message,
    });
  }
};

// =====================================================
// RESTORE PROFILE (UNDO SOFT DELETE)
// POST /api/admin/profiles/:id/restore
// =====================================================
export const restoreProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await Profile.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deleteReason: "",
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    await Notification.create({
      recipientId: id,
      senderId: req.user?.profileId || id,
      type: "account_restored",
      text: "Your account has been restored by admin. You can now access the platform again.",
    });

    return res.status(200).json({
      success: true,
      message: "Profile restored successfully.",
    });
  } catch (error) {
    console.error("Admin restoreProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to restore profile.",
      error: error.message,
    });
  }
};

// =====================================================
// SEND ADMIN MESSAGE (notification) TO A USER
// POST /api/admin/profiles/:id/message
// =====================================================
export const sendAdminMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message cannot be empty." });
    }

    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    await Notification.create({
      recipientId: id,
      senderId: req.user?.profileId || id,
      type: "admin_message",
      text: `Message from Admin: ${message.trim()}`,
    });

    return res.status(200).json({ success: true, message: "Message sent successfully." });
  } catch (error) {
    console.error("Admin sendAdminMessage error:", error);
    return res.status(500).json({ success: false, message: "Failed to send message.", error: error.message });
  }
};

// =====================================================
// LIST ALL SUBSCRIPTIONS
// GET /api/admin/subscriptions
// =====================================================
export const listAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await UserSubscription.find()
      .populate("profileId", "fullName email handle avatarUrl role")
      .populate("packageId", "name billingPeriod durationMonths price")
      .populate("offerId", "name discountPercentage discountAmount")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = subscriptions.map((sub) => {
      const profile = sub.profileId || {};
      const pkg = sub.packageId || {};
      return {
        _id: sub._id,
        id: sub._id,
        profileId: profile._id || sub.profileId,
        user: profile.fullName || "Unknown User",
        email: profile.email || "",
        handle: profile.handle ? `@${profile.handle}` : "",
        avatarUrl: profile.avatarUrl || null,
        role: profile.role || "creator",
        currentPlan: pkg.name || "Custom Plan",
        packageId: pkg._id,
        packageName: pkg.name,
        packagePrice: pkg.price,
        billingPeriod: pkg.billingPeriod,
        startDate: sub.startDate,
        expiryDate: sub.expiryDate,
        status: sub.status,
        createdAt: sub.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Admin listAllSubscriptions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list subscriptions.",
      error: error.message,
    });
  }
};

// =====================================================
// APPROVE SUBSCRIPTION UPGRADE REQUEST
// PATCH /api/admin/subscriptions/:id/approve
// =====================================================
export const approveSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subscription ID." });
    }

    const subscription = await UserSubscription.findById(id)
      .populate("packageId")
      .populate("profileId", "fullName role email");

    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription request not found." });
    }

    if (subscription.status === "active") {
      return res.status(400).json({ success: false, message: "Subscription is already active." });
    }

    const profileId = subscription.profileId?._id || subscription.profileId;
    const pkg = subscription.packageId;

    // 1. Cancel any previous active subscriptions for this user
    await UserSubscription.updateMany(
      {
        profileId,
        _id: { $ne: subscription._id },
        status: "active",
      },
      {
        $set: { status: "cancelled" },
      }
    );

    // 2. Set this subscription to active starting from now
    const startDate = Date.now();
    let expiryDate;
    const billingPeriod = (pkg?.billingPeriod || "month").toLowerCase();

    if (billingPeriod.includes("year") || billingPeriod.includes("annual")) {
      expiryDate = startDate + 365 * 24 * 60 * 60 * 1000;
    } else if (billingPeriod.includes("month")) {
      expiryDate = startDate + 30 * 24 * 60 * 60 * 1000;
    } else if (billingPeriod.includes("week")) {
      expiryDate = startDate + 7 * 24 * 60 * 60 * 1000;
    } else if (billingPeriod.includes("day")) {
      expiryDate = startDate + 24 * 60 * 60 * 1000;
    } else {
      expiryDate = startDate + 30 * 24 * 60 * 60 * 1000;
    }

    subscription.startDate = startDate;
    subscription.expiryDate = expiryDate;
    subscription.status = "active";
    await subscription.save();

    // 3. Send notification to user that upgrade request was approved
    try {
      const adminId = req.user?._id || profileId;
      const packageName = pkg?.name || "Premium";
      await Notification.create({
        recipientId: profileId,
        senderId: adminId,
        type: "subscription_upgrade_approved",
        text: `Congratulations! Your upgrade request for the "${packageName}" plan has been approved by admin and is now active!`,
        targetUrl: subscription.profileId?.role === "brand" ? "/dashboard/brand" : "/dashboard/influencer",
        metadata: {
          subscriptionId: subscription._id,
          packageId: pkg?._id,
          packageName,
        },
        createdAt: Date.now(),
      });
    } catch (notifErr) {
      console.error("Error creating approval notification:", notifErr);
    }

    return res.status(200).json({
      success: true,
      message: `Subscription for ${subscription.profileId?.fullName || "User"} approved successfully.`,
      data: subscription,
    });
  } catch (error) {
    console.error("Admin approveSubscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve subscription.",
      error: error.message,
    });
  }
};

// =====================================================
// REJECT SUBSCRIPTION UPGRADE REQUEST
// PATCH /api/admin/subscriptions/:id/reject
// =====================================================
export const rejectSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subscription ID." });
    }

    const subscription = await UserSubscription.findById(id)
      .populate("packageId")
      .populate("profileId", "fullName role email");

    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription request not found." });
    }

    subscription.status = "rejected";
    await subscription.save();

    const profileId = subscription.profileId?._id || subscription.profileId;
    const pkg = subscription.packageId;

    // Send notification to user that upgrade request was rejected
    try {
      const adminId = req.user?._id || profileId;
      const packageName = pkg?.name || "Premium";
      const reasonMsg = reason ? ` Reason: ${reason}` : "";
      await Notification.create({
        recipientId: profileId,
        senderId: adminId,
        type: "subscription_upgrade_rejected",
        text: `Your upgrade request for the "${packageName}" plan was declined by admin.${reasonMsg}`,
        targetUrl: subscription.profileId?.role === "brand" ? "/dashboard/brand" : "/dashboard/influencer",
        metadata: {
          subscriptionId: subscription._id,
          packageId: pkg?._id,
          packageName,
          reason,
        },
        createdAt: Date.now(),
      });
    } catch (notifErr) {
      console.error("Error creating rejection notification:", notifErr);
    }

    return res.status(200).json({
      success: true,
      message: `Subscription upgrade request rejected.`,
      data: subscription,
    });
  } catch (error) {
    console.error("Admin rejectSubscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject subscription.",
      error: error.message,
    });
  }
};

// =====================================================
// SUBSCRIPTION PACKAGES CRUD
// =====================================================
import SubscriptionPackage from "../models/SubscriptionPackage.js";
import SubscriptionOffer from "../models/SubscriptionOffer.js";
import PopupSetting from "../models/PopupSetting.js";
import OfferAnalytics from "../models/OfferAnalytics.js";

export const getPackages = async (req, res) => {
  try {
    const pkgs = await SubscriptionPackage.find().sort({ sortOrder: 1 });
    res.status(200).json({ success: true, data: pkgs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPackage = async (req, res) => {
  try {
    const pkg = await SubscriptionPackage.create(req.body);
    res.status(201).json({ success: true, data: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePackage = async (req, res) => {
  try {
    const pkg = await SubscriptionPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePackage = async (req, res) => {
  try {
    await SubscriptionPackage.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const togglePackage = async (req, res) => {
  try {
    const pkg = await SubscriptionPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: "Not found" });
    pkg.active = !pkg.active;
    await pkg.save();
    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reorderPackages = async (req, res) => {
  try {
    const { packagesList } = req.body;
    await Promise.all(packagesList.map(p => SubscriptionPackage.findByIdAndUpdate(p.id, { sortOrder: p.sortOrder })));
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// SUBSCRIPTION OFFERS CRUD
// =====================================================
export const getOffers = async (req, res) => {
  try {
    const offers = await SubscriptionOffer.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOffer = async (req, res) => {
  try {
    const offer = await SubscriptionOffer.create(req.body);
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const offer = await SubscriptionOffer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    await SubscriptionOffer.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleOffer = async (req, res) => {
  try {
    const offer = await SubscriptionOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: "Not found" });
    offer.active = !offer.active;
    await offer.save();
    res.status(200).json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// POPUP SETTINGS
// =====================================================
export const getPopupSettings = async (req, res) => {
  try {
    let settings = await PopupSetting.findOne();
    if (!settings) settings = await PopupSetting.create({ showPopup: false, popupFrequency: "every_login", targetUsers: "both", popupExpiry: Date.now() });
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePopupSettings = async (req, res) => {
  try {
    let settings = await PopupSetting.findOne();
    if (settings) {
      settings = await PopupSetting.findByIdAndUpdate(settings._id, req.body, { new: true });
    } else {
      settings = await PopupSetting.create(req.body);
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// SUBSCRIPTION ANALYTICS
// =====================================================
export const getSubscriptionAnalytics = async (req, res) => {
  try {
    let analytics = await OfferAnalytics.findOne();
    if (!analytics) analytics = { popupViews: 0, popupClicks: 0, upgradeClicks: 0, conversionRate: 0, revenue: 0 };
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// CONTENT MANAGEMENT (CLIENT REVIEWS)
// =====================================================
import VideoReview from "../models/VideoReview.js";
import Blog from "../models/Blog.js";
import ProTip from "../models/ProTip.js";

export const getClientReviews = async (req, res) => {
  try {
    const reviews = await VideoReview.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getFileUrl = (file) => {
  if (!file) return null;
  if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

export const createClientReview = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.files?.video?.[0]) {
      payload.videoUrl = getFileUrl(req.files.video[0]);
    }
    if (req.files?.thumbnail?.[0]) {
      payload.thumbnailUrl = getFileUrl(req.files.thumbnail[0]);
    }
    if (payload.rating) {
      payload.rating = Number(payload.rating);
    }
    if (!payload.videoUrl) {
      return res.status(400).json({ success: false, message: "A video file or URL is required." });
    }
    const review = await VideoReview.create(payload);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClientReview = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.files?.video?.[0]) {
      updateData.videoUrl = getFileUrl(req.files.video[0]);
    }
    if (req.files?.thumbnail?.[0]) {
      updateData.thumbnailUrl = getFileUrl(req.files.thumbnail[0]);
    }
    if (updateData.rating) {
      updateData.rating = Number(updateData.rating);
    }
    const review = await VideoReview.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteClientReview = async (req, res) => {
  try {
    await VideoReview.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// CONTENT MANAGEMENT (BLOGS)
// =====================================================
export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBlog = async (req, res) => {
  try {
    const blog = await Blog.create(req.body);
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// CONTENT MANAGEMENT (PRO TIPS)
// =====================================================
export const getProTips = async (req, res) => {
  try {
    const tips = await ProTip.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProTip = async (req, res) => {
  try {
    const tip = await ProTip.create(req.body);
    res.status(201).json({ success: true, data: tip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProTip = async (req, res) => {
  try {
    const tip = await ProTip.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: tip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProTip = async (req, res) => {
  try {
    await ProTip.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// UPDATE ADMIN CREDENTIALS
// PUT /api/admin/credentials
// =====================================================
export const updateAdminCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // req.user is populated by adminProtect
    const adminId = req.user?._id || req.user?.profileId || req.profile?._id;
    
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    if (!email && !password) {
      return res.status(400).json({ success: false, message: "Provide email or password to update." });
    }

    const updates = {};
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      // Check if email is already used by another account
      const existing = await Profile.findOne({
        email: normalizedEmail,
        _id: { $ne: adminId },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "This email is already in use by another account.",
        });
      }
      updates.email = normalizedEmail;
    }
    
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
      }
      const bcrypt = (await import("bcryptjs")).default;
      updates.password = await bcrypt.hash(password, 10);
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      adminId,
      updates,
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: "Admin profile not found.",
      });
    }

    const jwt = (await import("jsonwebtoken")).default;
    const token = jwt.sign(
      {
        userId: updatedProfile.userId,
        email: updatedProfile.email,
        role: updatedProfile.role,
        profileId: updatedProfile._id.toString(),
      },
      process.env.JWT_SECRET || "default_jwt_secret",
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Admin credentials updated successfully.",
      token,
      user: {
        _id: updatedProfile._id,
        userId: updatedProfile.userId,
        email: updatedProfile.email,
        role: updatedProfile.role,
        fullName: updatedProfile.fullName,
      },
    });
  } catch (error) {
    console.error("Admin updateAdminCredentials error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update admin credentials.",
      error: error.message,
    });
  }
};
// =====================================================
// BULK DELETE MESSAGES
// POST /api/admin/messages/bulk-delete
// =====================================================
export const bulkDeleteMessages = async (req, res) => {
  try {
    const { messageIds, deleteType } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: "No messages selected." });
    }

    if (!["all", "creator", "brand"].includes(deleteType)) {
      return res.status(400).json({ success: false, message: "Invalid delete type." });
    }

    const updateFields = {
      deletedAt: new Date() // Set deletedAt for 7-day TTL auto-deletion
    };

    if (deleteType === "all") {
      updateFields.deletedByAdmin = true;
    } else if (deleteType === "creator") {
      updateFields.deletedForCreator = true;
    } else if (deleteType === "brand") {
      updateFields.deletedForBrand = true;
    }

    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: updateFields }
    );

    return res.status(200).json({ success: true, message: "Messages deleted successfully." });
  } catch (error) {
    console.error("Bulk Delete Messages error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete messages." });
  }
};


// =====================================================
// ADMIN ACTIVITY FEED
// GET /api/admin/activity
// =====================================================
export const getAdminActivityFeed = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const limit = parseInt(req.query.limit) || 50;
    const since = req.query.since ? parseInt(req.query.since) : null;

    const sinceDate = since ? new Date(since) : null;
    const sinceFilter = sinceDate ? { createdAt: { $gt: sinceDate } } : {};

    const newUsers = await Profile.find({ isDeleted: { $ne: true }, ...sinceFilter })
      .sort({ createdAt: -1 }).limit(20)
      .select("fullName avatarUrl role handle createdAt").lean();

    const signupEvents = newUsers.map((u) => ({
      _id: "signup_" + u._id,
      id: "signup_" + u._id,
      type: "signup",
      role: u.role,
      title: "New " + u.role + " joined",
      text: u.fullName + (u.handle ? " (@" + u.handle + ")" : "") + " created an account",
      body: u.fullName + (u.handle ? " (@" + u.handle + ")" : "") + " created an account",
      avatarUrl: u.avatarUrl || null,
      actorName: u.fullName,
      createdAt: new Date(u.createdAt).getTime(),
      timestamp: new Date(u.createdAt).getTime(),
    }));

    const recentConversations = await Conversation.find(sinceFilter)
      .sort({ createdAt: -1 }).limit(15)
      .populate("creatorId", "fullName handle avatarUrl")
      .populate("brandId", "fullName handle").lean();

    const collaborationEvents = recentConversations.map((c) => ({
      _id: "collab_" + c._id,
      id: "collab_" + c._id,
      type: "collaboration",
      title: "New collaboration started",
      text: (c.creatorId && c.creatorId.fullName ? c.creatorId.fullName : "A creator") + " connected with " + (c.brandId && c.brandId.fullName ? c.brandId.fullName : "a brand"),
      body: (c.creatorId && c.creatorId.fullName ? c.creatorId.fullName : "A creator") + " connected with " + (c.brandId && c.brandId.fullName ? c.brandId.fullName : "a brand"),
      avatarUrl: c.creatorId ? c.creatorId.avatarUrl : null,
      actorName: c.creatorId ? c.creatorId.fullName : "Creator",
      createdAt: new Date(c.createdAt).getTime(),
      timestamp: new Date(c.createdAt).getTime(),
    }));

    const recentPayments = await Payment.find(sinceFilter)
      .sort({ createdAt: -1 }).limit(10).lean();

    const paymentEvents = recentPayments.map((p) => ({
      _id: "payment_" + p._id,
      id: "payment_" + p._id,
      type: "payment",
      title: "Payment processed",
      text: "A payment of ₹" + ((p.amount || 0) / 100).toLocaleString("en-IN") + " was recorded",
      body: "A payment of ₹" + ((p.amount || 0) / 100).toLocaleString("en-IN") + " was recorded",
      avatarUrl: null,
      actorName: "Payment System",
      createdAt: new Date(p.createdAt).getTime(),
      timestamp: new Date(p.createdAt).getTime(),
    }));

    const systemNotifications = await Notification.find({
      $or: [
        { recipientId: adminId },
        { type: { $in: ["campaign_pending_verification", "campaign_approved", "campaign_rejected", "dispute_raised", "withdrawal_requested", "verification_requested", "payment_release_eligible", "subscription_upgrade_requested"] } }
      ],
      ...sinceFilter,
    }).sort({ createdAt: -1 }).limit(30)
      .populate("senderId", "fullName avatarUrl role")
      .populate("recipientId", "fullName avatarUrl role").lean();

    const notifEvents = systemNotifications.map((n) => {
      const time = n.createdAt ? (typeof n.createdAt === "number" ? n.createdAt : new Date(n.createdAt).getTime()) : Date.now();
      let title = "Platform Alert";
      if (n.type === "campaign_pending_verification") title = "New Campaign Submitted";
      else if (n.type === "subscription_upgrade_requested") title = "Subscription Upgrade Request";
      else if (n.type === "withdrawal_requested") title = "Withdrawal Request";
      else if (n.type === "verification_requested") title = "Verification Request";
      return {
        _id: String(n._id),
        id: String(n._id),
        type: n.type,
        title,
        text: n.text,
        body: n.text,
        targetUrl: n.targetUrl || "",
        avatarUrl: n.senderId?.avatarUrl || null,
        actorName: n.senderId?.fullName || "System",
        createdAt: time,
        timestamp: time,
        read: n.read || false,
      };
    });

    const allEvents = [...notifEvents, ...signupEvents, ...collaborationEvents, ...paymentEvents]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return res.status(200).json({ success: true, data: allEvents, count: allEvents.length });
  } catch (error) {
    console.error("Admin getAdminActivityFeed error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch activity feed.", error: error.message });
  }
};

// =====================================================
// LIST ADMIN CAMPAIGNS FOR VERIFICATION
// GET /api/admin/campaigns
// =====================================================
export const listAdminCampaigns = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const campaigns = await Campaign.find(filter)
      .populate("brandId", "fullName email handle avatarUrl role location category startingPrice website")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error("Admin listAdminCampaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list campaigns.",
      error: error.message,
    });
  }
};

// =====================================================
// VERIFY CAMPAIGN (APPROVE / REJECT)
// =====================================================
// VERIFY CAMPAIGN (APPROVE / REJECT / RESET TO PENDING / CLOSE)
// PATCH /api/admin/campaigns/:id/verify
// =====================================================
export const verifyCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationFeedback } = req.body;

    const normalizedStatus = status === "PENDING" ? "PENDING_VERIFICATION" : status;

    if (!["APPROVED", "REJECTED", "PENDING_VERIFICATION", "CLOSED"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED, REJECTED, PENDING_VERIFICATION, or CLOSED.",
      });
    }

    const campaign = await Campaign.findById(id).populate("brandId", "fullName email");
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
      });
    }

    campaign.status = normalizedStatus;
    if (verificationFeedback !== undefined) {
      campaign.verificationFeedback = verificationFeedback;
    }
    campaign.updatedAt = Date.now();
    await campaign.save();

    // Send notification to Brand
    const adminId = req.user?._id || req.user?.profileId;
    const notifType = normalizedStatus === "APPROVED" ? "campaign_approved" : normalizedStatus === "REJECTED" ? "campaign_rejected" : "campaign_updated";
    const notifText = normalizedStatus === "APPROVED"
      ? `Great news! Your campaign "${campaign.title}" has been approved by Admin and is now live for Creators.`
      : normalizedStatus === "REJECTED"
      ? `Your campaign "${campaign.title}" was not approved.${verificationFeedback ? ` Reason: ${verificationFeedback}` : ""}`
      : `Your campaign "${campaign.title}" status has been updated to ${normalizedStatus}.`;

    const brandId = campaign.brandId._id || campaign.brandId;

    await Notification.create({
      recipientId: brandId,
      senderId: adminId || brandId,
      type: notifType,
      text: notifText,
      createdAt: Date.now(),
    });

    // Send Web Push to Brand about approval status
    sendPushToUser(brandId, {
      title: normalizedStatus === "APPROVED" ? "Campaign Approved! 🎉" : "Campaign Verification Update",
      body: notifText,
      url: `/dashboard/customer`,
    }).catch((err) => console.error("Brand push error:", err.message));

    // IF APPROVED -> Send Web Push & In-App Notification to ALL CREATORS
    if (normalizedStatus === "APPROVED") {
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
        await Notification.insertMany(inAppNotifs).catch((err) => console.error("In-app creator notif error:", err));

        sendPushToUsers(creatorIds, {
          title: `${brandName} launched a new campaign! 🚀`,
          body: campaign.title,
          icon: brand?.avatarUrl || "/logo192.png",
          url: `/browse`,
        }).catch((err) => console.error("Creator push error:", err.message));
      }
    }

    return res.status(200).json({
      success: true,
      message: `Campaign status updated to ${normalizedStatus} successfully.`,
      data: campaign,
    });
  } catch (error) {
    console.error("Admin verifyCampaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify campaign.",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE CAMPAIGN (PERMANENTLY)
// DELETE /api/admin/campaigns/:id
// =====================================================
export const deleteAdminCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
      });
    }

    // Delete associated tasks, connections, favorites
    await CampaignTask.deleteMany({ campaignId: id }).catch(() => {});
    await Connection.deleteMany({ campaignId: id }).catch(() => {});
    await Favorite.deleteMany({ targetId: id }).catch(() => {});

    await Campaign.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Campaign deleted permanently from database.",
    });
  } catch (error) {
    console.error("Admin deleteAdminCampaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete campaign.",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE ALL TEST/DUMMY CAMPAIGNS
// POST /api/admin/campaigns/cleanup-test
// =====================================================
export const deleteTestCampaigns = async (req, res) => {
  try {
    const testPattern = /Task 20|Task 21|test|dummy|^Test Campaign/i;

    const testCampaigns = await Campaign.find({
      $or: [
        { title: { $regex: testPattern } },
        { description: { $regex: testPattern } },
        { category: { $regex: /^test$/i } },
      ],
    }).select("_id");

    const testIds = testCampaigns.map((c) => c._id);

    if (testIds.length > 0) {
      await CampaignTask.deleteMany({ campaignId: { $in: testIds } }).catch(() => {});
      await Connection.deleteMany({ campaignId: { $in: testIds } }).catch(() => {});
      await Favorite.deleteMany({ targetId: { $in: testIds } }).catch(() => {});
      const result = await Campaign.deleteMany({ _id: { $in: testIds } });

      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} test campaigns from database.`,
        deletedCount: result.deletedCount,
      });
    }

    return res.status(200).json({
      success: true,
      message: "No test campaigns found to delete.",
      deletedCount: 0,
    });
  } catch (error) {
    console.error("Admin deleteTestCampaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete test campaigns.",
      error: error.message,
    });
  }
};

// =====================================================
// OPEN OR CREATE ADMIN CONVERSATION (WITH BRAND OR CREATOR)
// POST /api/admin/conversations/open
// =====================================================
export const openAdminConversation = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { targetUserId, campaignId, initialMessage } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "targetUserId is required.",
      });
    }

    const targetProfile = await Profile.findById(targetUserId);
    if (!targetProfile) {
      return res.status(404).json({
        success: false,
        message: "Target user not found.",
      });
    }

    let convType = "admin_brand";
    let query = { adminId, conversationType: convType };

    if (targetProfile.role === "creator") {
      convType = "admin_creator";
      query = { adminId, creatorId: targetProfile._id, conversationType: convType };
    } else {
      convType = "admin_brand";
      query = { adminId, brandId: targetProfile._id, conversationType: convType };
    }

    if (campaignId) {
      query.campaignId = campaignId;
    }

    let conversation = await Conversation.findOne(query);

    if (!conversation) {
      conversation = await Conversation.create({
        adminId,
        creatorId: targetProfile.role === "creator" ? targetProfile._id : null,
        brandId: targetProfile.role === "brand" ? targetProfile._id : null,
        conversationType: convType,
        campaignId: campaignId || null,
        status: "active",
      });
    }

    if (initialMessage && initialMessage.trim()) {
      await Message.create({
        conversationId: conversation._id,
        senderId: adminId,
        text: initialMessage.trim(),
        read: false,
      });

      // Send in-app notification to target user
      await Notification.create({
        recipientId: targetProfile._id,
        senderId: adminId,
        type: "admin_message",
        text: `New message from Pravixo Admin: "${initialMessage.trim().slice(0, 60)}${initialMessage.trim().length > 60 ? "..." : ""}"`,
        createdAt: Date.now(),
      }).catch((notifErr) => console.warn("Could not dispatch message notification:", notifErr));
    }

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("creatorId", "fullName email handle avatarUrl role")
      .populate("brandId", "fullName email handle avatarUrl role")
      .populate("adminId", "fullName email handle avatarUrl role")
      .populate("campaignId", "title budget")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Admin conversation ready.",
      data: populatedConversation,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("Admin openAdminConversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to open admin conversation.",
      error: error.message,
    });
  }
};

// =====================================================
// LIST CREATOR WITHDRAWAL REQUESTS (TASK 14)
// GET /api/admin/withdrawals
// =====================================================
export const listWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const withdrawals = await Withdrawal.find(filter)
      .populate("creatorId", "fullName email handle avatarUrl phone location")
      .populate("processedBy", "fullName email")
      .sort({ requestedAt: -1, createdAt: -1 })
      .lean();

    // Enrich with creator bank details if needed
    const enriched = await Promise.all(
      withdrawals.map(async (w) => {
        let bank = null;
        if (w.creatorId?._id) {
          bank = await CreatorBankDetails.findOne({ creatorId: w.creatorId._id }).lean();
        }
        return {
          ...w,
          bankDetails: bank || w.bankDetailsSnapshot || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("Admin listWithdrawals error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load withdrawal requests.",
      error: error.message,
    });
  }
};

// =====================================================
// PROCESS / COMPLETE / REJECT CREATOR WITHDRAWAL (TASK 14)
// POST /api/admin/withdrawals/:id/process
// =====================================================
export const processWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes = "", failureReason = "" } = req.body;
    const adminId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal ID." });
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'APPROVE' or 'REJECT'." });
    }

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal request not found." });
    }

    // Idempotency: Can only process if PENDING or PROCESSING
    if (withdrawal.status !== "PENDING" && withdrawal.status !== "PROCESSING") {
      return res.status(400).json({
        success: false,
        message: `Withdrawal has already been processed with status: ${withdrawal.status}.`,
      });
    }

    const now = Date.now();
    const creatorId = withdrawal.creatorId;
    const amount = withdrawal.amount;

    if (action === "APPROVE") {
      const payoutReference = `TXN-WDR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Update withdrawal record
      withdrawal.status = "COMPLETED";
      withdrawal.payoutReference = payoutReference;
      withdrawal.adminNotes = notes;
      withdrawal.processedBy = adminId;
      withdrawal.processedAt = now;
      withdrawal.completedAt = now;
      await withdrawal.save();

      // Update Wallet: deduct reserved pendingWithdrawalBalance and increment totalWithdrawn
      await Wallet.findOneAndUpdate(
        { creatorId },
        {
          $inc: {
            pendingWithdrawalBalance: -amount,
            totalWithdrawn: amount,
          },
        }
      );

      // Update transaction ledger
      await WalletTransaction.findOneAndUpdate(
        { withdrawalId: withdrawal._id },
        {
          status: "COMPLETED",
          description: `Withdrawal of ₹${amount.toLocaleString("en-IN")} completed (Ref: ${payoutReference})`,
        }
      );

      // Notify creator
      await Notification.create({
        recipientId: creatorId,
        senderId: adminId,
        type: "withdrawal_completed",
        text: `Your ₹${amount.toLocaleString("en-IN")} withdrawal request has been completed (Ref: ${payoutReference}).`,
        targetUrl: "/dashboard/creator/wallet",
        metadata: { withdrawalId: withdrawal._id, amount, payoutReference },
        createdAt: now,
      });

      return res.status(200).json({
        success: true,
        message: `Withdrawal of ₹${amount.toLocaleString("en-IN")} successfully processed and completed.`,
        data: withdrawal,
      });
    } else if (action === "REJECT") {
      // Reject & Restore reserved funds
      withdrawal.status = "FAILED";
      withdrawal.failureReason = failureReason || notes || "Declined by administrator";
      withdrawal.adminNotes = notes;
      withdrawal.processedBy = adminId;
      withdrawal.processedAt = now;
      await withdrawal.save();

      // Restore wallet availableBalance atomically
      const restoredWallet = await Wallet.findOneAndUpdate(
        { creatorId },
        {
          $inc: {
            availableBalance: amount,
            pendingWithdrawalBalance: -amount,
          },
        },
        { new: true }
      );

      // Update transaction ledger
      await WalletTransaction.findOneAndUpdate(
        { withdrawalId: withdrawal._id },
        {
          status: "FAILED",
          description: `Withdrawal failed: ${withdrawal.failureReason}. Funds restored.`,
          balanceAfter: restoredWallet?.availableBalance || 0,
        }
      );

      // Notify creator
      await Notification.create({
        recipientId: creatorId,
        senderId: adminId,
        type: "withdrawal_failed",
        text: `Your withdrawal request of ₹${amount.toLocaleString("en-IN")} was not completed (${withdrawal.failureReason}). The funds have been restored to your available wallet balance.`,
        targetUrl: "/dashboard/creator/wallet",
        metadata: { withdrawalId: withdrawal._id, amount, reason: withdrawal.failureReason },
        createdAt: now,
      });

      return res.status(200).json({
        success: true,
        message: `Withdrawal rejected and ₹${amount.toLocaleString("en-IN")} restored to creator's available wallet balance.`,
        data: withdrawal,
      });
    }
  } catch (error) {
    console.error("Admin processWithdrawal error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process withdrawal.",
      error: error.message,
    });
  }
};




