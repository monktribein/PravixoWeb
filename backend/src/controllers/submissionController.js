import mongoose from "mongoose";
import Connection from "../models/Connection.js";
import Campaign from "../models/Campaign.js";
import Profile from "../models/Profile.js";
import Submission from "../models/Submission.js";
import Notification from "../models/Notification.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { sendPushToUser, sendPushToUsers } from "../utils/webPush.js";

const getFileUrl = (file) => {
  if (!file) return null;
  if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

// 1. Submit Deliverable Content (Creator only)
export const submitDeliverableContent = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { deliverableType, caption } = req.body;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID.",
      });
    }

    if (!deliverableType || !["REEL", "POST", "STORY", "VIDEO"].includes(deliverableType)) {
      return res.status(400).json({
        success: false,
        message: "Valid deliverable type (REEL, POST, STORY, VIDEO) is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Deliverable content file (image or video) is required.",
      });
    }

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration record not found.",
      });
    }

    // Security Check: User must be authenticated creator of this collaboration
    if (req.user) {
      if (req.user.role !== "creator" && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only Creators can submit campaign deliverables.",
        });
      }

      if (String(connection.creatorId) !== String(req.user._id) && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this collaboration.",
        });
      }
    }

    // Payment requirement check: Must be PAID
    if (connection.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Cannot submit deliverables: Collaboration payment is not yet completed (must be PAID).",
      });
    }

    // Ensure deliverables tracking exists on connection
    if (!connection.deliverablesTracking || connection.deliverablesTracking.length === 0) {
      if (connection.campaignId) {
        const camp = await Campaign.findById(connection.campaignId).lean();
        if (camp && camp.deliverables) {
          const delivs = [];
          const nowTime = Date.now();
          if (camp.deliverables.reels > 0) delivs.push({ type: "REEL", requiredQuantity: camp.deliverables.reels, completedQuantity: 0, status: "PENDING", createdAt: nowTime, updatedAt: nowTime });
          if (camp.deliverables.posts > 0) delivs.push({ type: "POST", requiredQuantity: camp.deliverables.posts, completedQuantity: 0, status: "PENDING", createdAt: nowTime, updatedAt: nowTime });
          if (camp.deliverables.stories > 0) delivs.push({ type: "STORY", requiredQuantity: camp.deliverables.stories, completedQuantity: 0, status: "PENDING", createdAt: nowTime, updatedAt: nowTime });
          if (camp.deliverables.videos > 0) delivs.push({ type: "VIDEO", requiredQuantity: camp.deliverables.videos, completedQuantity: 0, status: "PENDING", createdAt: nowTime, updatedAt: nowTime });
          connection.deliverablesTracking = delivs;
        }
      }
    }

    const deliverableItem = connection.deliverablesTracking.find((d) => d.type === deliverableType);
    if (!deliverableItem) {
      return res.status(400).json({
        success: false,
        message: `Deliverable type ${deliverableType} is not part of this campaign's required deliverables.`,
      });
    }

    // Quantity enforcement: Count current submissions for this deliverable type
    const existingSubmissionsCount = await Submission.countDocuments({
      connectionId: connection._id,
      deliverableType,
      status: { $ne: "REJECTED" },
    });

    if (existingSubmissionsCount >= deliverableItem.requiredQuantity) {
      return res.status(400).json({
        success: false,
        message: `Required quantity (${deliverableItem.requiredQuantity}) for ${deliverableType} deliverables has already been submitted.`,
      });
    }

    const contentUrl = getFileUrl(req.file);
    const now = Date.now();

    // Create Submission document
    const submission = await Submission.create({
      connectionId: connection._id,
      campaignId: connection.campaignId,
      brandId: connection.brandId,
      creatorId: connection.creatorId,
      deliverableId: deliverableItem._id || null,
      deliverableType,
      contentUrl,
      cloudinaryPublicId: req.file.filename || null,
      caption: caption || "",
      status: "SUBMITTED",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Calculate approved count so completedQuantity only reflects approved work
    const approvedCountForType = await Submission.countDocuments({
      connectionId: connection._id,
      deliverableType,
      status: "APPROVED",
    });

    // Update deliverable tracking item status and completed quantity
    deliverableItem.status = "SUBMITTED";
    deliverableItem.completedQuantity = approvedCountForType;
    deliverableItem.updatedAt = now;
    connection.updatedAt = now;
    await connection.save();

    // Notify Brand
    const creatorProfile = await Profile.findById(connection.creatorId).select("fullName").lean();
    const creatorName = creatorProfile?.fullName || "Creator";
    let campaignTitle = "campaign";
    if (connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).select("title").lean();
      if (camp) campaignTitle = camp.title;
    }

    await Notification.create({
      recipientId: connection.brandId,
      senderId: connection.creatorId,
      type: "deliverable_submitted",
      text: `${creatorName} submitted a ${deliverableType} for "${campaignTitle}".`,
      targetUrl: "/collaborations",
      createdAt: now,
    });

    sendPushToUser(connection.brandId, {
      title: "Deliverable Submitted! 🎬",
      body: `${creatorName} submitted a ${deliverableType} for "${campaignTitle}".`,
      url: "/collaborations",
    }).catch((err) => console.error("Deliverable submission push error:", err.message));

    // Notify Admin
    const admins = await Profile.find({ role: "admin" }).select("_id").lean();
    for (const admin of admins) {
      await Notification.create({
        recipientId: admin._id,
        senderId: connection.creatorId,
        type: "deliverable_submitted",
        text: `Creator ${creatorName} submitted campaign work (${deliverableType}) for "${campaignTitle}".`,
        targetUrl: "/admin/tasks",
        createdAt: now,
      });
    }

    // Integrate submission card into conversation chat
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
          senderId: connection.creatorId,
          text: `[Deliverable Submission] ${creatorName} submitted ${deliverableType} #${existingSubmissionsCount + 1}`,
          messageType: "deliverable_submission",
          metadata: {
            submissionId: submission._id,
            deliverableType,
            contentUrl,
            caption: caption || "",
            status: "SUBMITTED",
            submittedAt: now,
            sequenceNumber: existingSubmissionsCount + 1,
            requiredQuantity: deliverableItem.requiredQuantity,
          },
          read: false,
        });
      }
    } catch (chatErr) {
      console.warn("Could not post submission message to chat:", chatErr);
    }

    res.status(201).json({
      success: true,
      message: "Deliverable submitted successfully.",
      data: {
        submission,
        deliverablesTracking: connection.deliverablesTracking,
      },
    });
  } catch (error) {
    console.error("Submit deliverable error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit deliverable content.",
      error: error.message,
    });
  }
};

// 2. Get Submissions for a Collaboration (Brand or Creator or Admin)
export const getCollaborationSubmissions = async (req, res) => {
  try {
    const { connectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection ID.",
      });
    }

    const connection = await Connection.findById(connectionId).lean();
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found.",
      });
    }

    // Security Check: Caller must be participant (creator or brand) or admin
    if (req.user && req.user.role !== "admin") {
      const isBrand = String(connection.brandId) === String(req.user._id);
      const isCreator = String(connection.creatorId) === String(req.user._id);
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have access to these submissions.",
        });
      }
    }

    const submissions = await Submission.find({ connectionId })
      .sort({ createdAt: -1 })
      .lean();

    const creatorProfile = await Profile.findById(connection.creatorId)
      .select("fullName avatarUrl handle email")
      .lean();
    const campaign = connection.campaignId
      ? await Campaign.findById(connection.campaignId)
          .select("title description deliverables totalBudget category")
          .lean()
      : null;

    res.status(200).json({
      success: true,
      data: {
        connectionId: connection._id,
        paymentStatus: connection.paymentStatus,
        collaboration: {
          ...connection,
          creatorProfile,
          campaign,
        },
        deliverablesTracking: connection.deliverablesTracking || [],
        campaignDeliverables: campaign?.deliverables || null,
        submissions: submissions.map((sub) => ({
          ...sub,
          creator: creatorProfile,
          campaignTitle: campaign?.title || "Campaign",
        })),
      },
    });
  } catch (error) {
    console.error("Get collaboration submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collaboration submissions.",
      error: error.message,
    });
  }
};

// 3. Approve Deliverable Submission (Brand only)
export const approveDeliverableSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    const connection = await Connection.findById(submission.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Associated collaboration not found.",
      });
    }

    // Security Check: Caller must be the Brand owning this campaign/collaboration
    if (req.user && req.user.role !== "admin") {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can review and approve deliverables.",
        });
      }

      if (String(connection.brandId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this campaign/collaboration.",
        });
      }
    }

    // State transition protection: only SUBMITTED or RESUBMITTED can be APPROVED
    if (submission.status !== "SUBMITTED" && submission.status !== "RESUBMITTED") {
      return res.status(400).json({
        success: false,
        message: `Submission is already ${submission.status} and cannot be approved.`,
      });
    }

    const now = Date.now();
    submission.status = "APPROVED";
    submission.approvedAt = now;
    submission.updatedAt = now;
    await submission.save();

    // Recalculate and update deliverablesTracking on connection
    // Completed/approved count for this deliverable type
    const approvedCountForType = await Submission.countDocuments({
      connectionId: connection._id,
      deliverableType: submission.deliverableType,
      status: "APPROVED",
    });

    const deliverableItem = connection.deliverablesTracking.find(
      (d) => d.type === submission.deliverableType
    );

    if (deliverableItem) {
      deliverableItem.completedQuantity = approvedCountForType;
      if (approvedCountForType >= deliverableItem.requiredQuantity) {
        deliverableItem.status = "COMPLETED";
      } else {
        deliverableItem.status = "IN_PROGRESS";
      }
      deliverableItem.updatedAt = now;
    }

    // Check if ALL campaign deliverables are now approved
    const allApproved =
      connection.deliverablesTracking &&
      connection.deliverablesTracking.length > 0 &&
      connection.deliverablesTracking.every(
        (deliv) => (deliv.completedQuantity || 0) >= (deliv.requiredQuantity || 1)
      );

    const wasAlreadyCompleted = connection.allDeliverablesCompleted;
    if (allApproved) {
      connection.allDeliverablesCompleted = true;
      if (!connection.workCompletedAt) {
        connection.workCompletedAt = now;
      }

      // Task 10: 72-Hour Review Period Timer initialization
      if (!connection.approvalCompletedAt) {
        connection.approvalCompletedAt = now;
        connection.paymentReleaseEligibleAt = now + 72 * 60 * 60 * 1000;
        connection.paymentReleaseStatus = "WAITING_72_HOURS";
        connection.adminNotifiedOfEligibility = false;
      }
    } else {
      connection.allDeliverablesCompleted = false;
      connection.workCompletedAt = null;
      connection.approvalCompletedAt = null;
      connection.paymentReleaseEligibleAt = null;
      connection.paymentReleaseStatus = "NOT_APPLICABLE";
      connection.adminNotifiedOfEligibility = false;
    }

    connection.updatedAt = now;
    await connection.save();

    // Fetch Profile and Campaign details for rich notification data
    const brandProfile = await Profile.findById(connection.brandId).select("fullName avatarUrl").lean();
    const creatorProfile = await Profile.findById(connection.creatorId).select("fullName avatarUrl").lean();
    const brandName = brandProfile?.fullName || "Brand";
    const creatorName = creatorProfile?.fullName || "Creator";
    let campaignTitle = "campaign";
    if (connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).select("title").lean();
      if (camp) campaignTitle = camp.title;
    }

    // 1. Send Deliverable Approval Notification to Creator
    const approvalText = `${brandName} approved your submitted ${submission.deliverableType} (v${submission.version || 1}) for "${campaignTitle}".`;
    await Notification.create({
      recipientId: connection.creatorId,
      senderId: connection.brandId,
      type: "deliverable_approved",
      text: approvalText,
      targetUrl: "/collaborations",
      createdAt: now,
    });

    sendPushToUser(connection.creatorId, {
      title: "Deliverable Approved! ✅",
      body: approvalText,
      url: "/collaborations",
    }).catch((err) => console.error("Deliverable approval push error:", err.message));

    // 2. Send Deliverable Approval Notification to Admins
    const admins = await Profile.find({ role: "admin" }).select("_id").lean();
    for (const admin of admins) {
      await Notification.create({
        recipientId: admin._id,
        senderId: connection.brandId,
        type: "deliverable_approved",
        text: `${brandName} approved ${submission.deliverableType} (v${submission.version || 1}) by ${creatorName} for "${campaignTitle}".`,
        targetUrl: "/admin/tasks",
        createdAt: now,
      });
    }

    // 3. If ALL deliverables are completed, send All Deliverables Approved Notification & Chat message
    if (allApproved && !wasAlreadyCompleted) {
      // Notify Creator that entire campaign work is completed and 72-hour review period has begun
      const creatorAllDoneText = `🎉 Congratulations! All required campaign deliverables for "${campaignTitle}" have been approved by ${brandName}. 72-hour review period has started.`;
      await Notification.create({
        recipientId: connection.creatorId,
        senderId: connection.brandId,
        type: "all_deliverables_approved",
        text: creatorAllDoneText,
        targetUrl: "/collaborations",
        createdAt: now,
      });

      sendPushToUser(connection.creatorId, {
        title: "All Deliverables Approved! 🎉",
        body: creatorAllDoneText,
        url: "/collaborations",
      }).catch((err) => console.error("All deliverables push error:", err.message));

      // Notify Brand that work is fully completed
      const brandAllDoneText = `All deliverables for "${campaignTitle}" with ${creatorName} are now fully approved. 72-hour review period is now active.`;
      await Notification.create({
        recipientId: connection.brandId,
        senderId: connection.creatorId,
        type: "all_deliverables_approved",
        text: brandAllDoneText,
        targetUrl: "/collaborations",
        createdAt: now,
      });

      sendPushToUser(connection.brandId, {
        title: "Campaign Work Complete! 🌟",
        body: brandAllDoneText,
        url: "/collaborations",
      }).catch((err) => console.error("Brand all deliverables push error:", err.message));

      // Notify Admins that collaboration work is completed
      for (const admin of admins) {
        await Notification.create({
          recipientId: admin._id,
          senderId: connection.brandId,
          type: "all_deliverables_approved",
          text: `All campaign deliverables for "${campaignTitle}" between ${brandName} and ${creatorName} are now 100% approved. 72-hour review period started.`,
          createdAt: now,
        });
      }
    }

    // Post review status message in conversation chat
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
          senderId: connection.brandId,
          text: `[Deliverable Approved] ${brandName} approved ${submission.deliverableType} submission (v${submission.version || 1}) (${approvedCountForType}/${deliverableItem?.requiredQuantity || 1} approved).`,
          messageType: "deliverable_submission",
          metadata: {
            submissionId: submission._id,
            deliverableType: submission.deliverableType,
            contentUrl: submission.contentUrl,
            status: "APPROVED",
            version: submission.version || 1,
            reviewedAt: now,
            approvedCount: approvedCountForType,
            requiredQuantity: deliverableItem?.requiredQuantity || 1,
          },
          read: false,
        });

        if (allApproved && !wasAlreadyCompleted) {
          await Message.create({
            conversationId: conversation._id,
            senderId: connection.brandId,
            text: `[Campaign Work Completed] 🎉 All campaign deliverables for "${campaignTitle}" have been approved by ${brandName}! The 72-hour review period has commenced.`,
            messageType: "system",
            metadata: {
              connectionId: connection._id,
              allDeliverablesCompleted: true,
              completedAt: now,
              paymentReleaseEligibleAt: connection.paymentReleaseEligibleAt,
            },
            read: false,
          });
        }
      }
    } catch (chatErr) {
      console.warn("Could not post approval message to chat:", chatErr);
    }

    res.status(200).json({
      success: true,
      message: allApproved
        ? "Deliverable approved and all required deliverables for this collaboration are now completed! 72-hour review period started."
        : "Deliverable submission approved successfully.",
      data: {
        submission,
        deliverablesTracking: connection.deliverablesTracking,
        allDeliverablesCompleted: connection.allDeliverablesCompleted,
        workCompletedAt: connection.workCompletedAt,
        approvalCompletedAt: connection.approvalCompletedAt,
        paymentReleaseEligibleAt: connection.paymentReleaseEligibleAt,
        paymentReleaseStatus: connection.paymentReleaseStatus,
        paymentStatus: connection.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Approve deliverable submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve deliverable submission.",
      error: error.message,
    });
  }
};

// 4. Reject Deliverable Submission (Brand only)
export const rejectDeliverableSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const reasonText = (req.body.reason || req.body.rejectionReason || "").trim();

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
    }

    if (!reasonText) {
      return res.status(400).json({
        success: false,
        message: "Rejection feedback reason is required.",
      });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    const connection = await Connection.findById(submission.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Associated collaboration not found.",
      });
    }

    // Security Check: Caller must be the Brand owning this campaign/collaboration
    if (req.user && req.user.role !== "admin") {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can review and reject deliverables.",
        });
      }

      if (String(connection.brandId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this campaign/collaboration.",
        });
      }
    }

    // State transition protection: only SUBMITTED or RESUBMITTED can be REJECTED
    if (submission.status !== "SUBMITTED" && submission.status !== "RESUBMITTED") {
      return res.status(400).json({
        success: false,
        message: `Submission is already ${submission.status} and cannot be rejected.`,
      });
    }

    const now = Date.now();
    submission.status = "REJECTED";
    submission.rejectionReason = reasonText;
    submission.rejectedAt = now;
    submission.updatedAt = now;
    await submission.save();

    // Recalculate deliverablesTracking on connection
    const approvedCountForType = await Submission.countDocuments({
      connectionId: connection._id,
      deliverableType: submission.deliverableType,
      status: "APPROVED",
    });

    const deliverableItem = connection.deliverablesTracking.find(
      (d) => d.type === submission.deliverableType
    );

    if (deliverableItem) {
      deliverableItem.completedQuantity = approvedCountForType;
      deliverableItem.status = "REJECTED";
      deliverableItem.updatedAt = now;
    }

    connection.updatedAt = now;
    await connection.save();

    // Send Notification to Creator
    const brandProfile = await Profile.findById(connection.brandId).select("fullName").lean();
    const brandName = brandProfile?.fullName || "Brand";
    let campaignTitle = "campaign";
    if (connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).select("title").lean();
      if (camp) campaignTitle = camp.title;
    }

    const rejectText = `${brandName} requested changes on your ${submission.deliverableType} (v${submission.version || 1}) for "${campaignTitle}". Reason: ${reasonText}`;
    await Notification.create({
      recipientId: connection.creatorId,
      senderId: connection.brandId,
      type: "deliverable_rejected",
      text: rejectText,
      targetUrl: "/collaborations",
      createdAt: now,
    });

    sendPushToUser(connection.creatorId, {
      title: "Deliverable Feedback / Changes Requested ⚠️",
      body: rejectText,
      url: "/collaborations",
    }).catch((err) => console.error("Deliverable rejection push error:", err.message));

    // Post review status message in conversation chat
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
          senderId: connection.brandId,
          text: `[Deliverable Rejected] ${brandName} requested rework on ${submission.deliverableType} (v${submission.version || 1}). Feedback: "${reasonText}".`,
          messageType: "deliverable_submission",
          metadata: {
            submissionId: submission._id,
            deliverableType: submission.deliverableType,
            contentUrl: submission.contentUrl,
            status: "REJECTED",
            version: submission.version || 1,
            rejectionReason: reasonText,
            reviewedAt: now,
          },
          read: false,
        });
      }
    } catch (chatErr) {
      console.warn("Could not post rejection message to chat:", chatErr);
    }

    res.status(200).json({
      success: true,
      message: "Deliverable submission rejected.",
      data: {
        submission,
        deliverablesTracking: connection.deliverablesTracking,
      },
    });
  } catch (error) {
    console.error("Reject deliverable submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject deliverable submission.",
      error: error.message,
    });
  }
};

// 5. Creator Rework & Resubmission (Creator only) - Task 8
export const resubmitDeliverableContent = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { caption } = req.body;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Corrected deliverable file is required for resubmission.",
      });
    }

    const previousSubmission = await Submission.findById(submissionId);
    if (!previousSubmission) {
      return res.status(404).json({
        success: false,
        message: "Previous submission not found.",
      });
    }

    const connection = await Connection.findById(previousSubmission.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Associated collaboration record not found.",
      });
    }

    // Security Check: User must be authenticated creator of this collaboration
    if (req.user) {
      if (req.user.role !== "creator" && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only Creators can resubmit campaign deliverables.",
        });
      }

      if (String(connection.creatorId) !== String(req.user._id) && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this collaboration/submission.",
        });
      }
    }

    // Rework Eligibility Check: Only REJECTED submissions can enter rework
    if (previousSubmission.status !== "REJECTED") {
      return res.status(400).json({
        success: false,
        message: `Cannot rework submission with status "${previousSubmission.status}". Only REJECTED submissions can be reworked and resubmitted.`,
      });
    }

    // Prevent duplicate simultaneous resubmissions: Check if a child resubmission is already pending review
    const pendingResubmission = await Submission.findOne({
      parentSubmissionId: previousSubmission._id,
      status: { $in: ["SUBMITTED", "RESUBMITTED"] },
    });

    if (pendingResubmission) {
      return res.status(400).json({
        success: false,
        message: "A resubmission for this deliverable is already awaiting Brand review.",
      });
    }

    // Payment requirement check: Must be PAID
    if (connection.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Cannot resubmit deliverable: Collaboration is not in PAID status.",
      });
    }

    const newVersionNumber = (previousSubmission.version || 1) + 1;
    const reworkCount = (previousSubmission.reworkCount || 0) + 1;
    const contentUrl = getFileUrl(req.file);
    const now = Date.now();

    // Create new Submission version document
    const newSubmission = await Submission.create({
      connectionId: connection._id,
      campaignId: connection.campaignId,
      brandId: connection.brandId,
      creatorId: connection.creatorId,
      deliverableId: previousSubmission.deliverableId,
      deliverableType: previousSubmission.deliverableType,
      contentUrl,
      cloudinaryPublicId: req.file.filename || null,
      caption: caption !== undefined ? caption : previousSubmission.caption,
      status: "RESUBMITTED",
      version: newVersionNumber,
      parentSubmissionId: previousSubmission._id,
      reworkCount,
      rejectionReason: "", // Clear reason for new submission
      resubmittedAt: now,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Update deliverable item tracking status to RESUBMITTED without changing completedQuantity
    const approvedCountForType = await Submission.countDocuments({
      connectionId: connection._id,
      deliverableType: previousSubmission.deliverableType,
      status: "APPROVED",
    });

    const deliverableItem = connection.deliverablesTracking.find(
      (d) => d.type === previousSubmission.deliverableType
    );

    if (deliverableItem) {
      deliverableItem.status = "RESUBMITTED";
      deliverableItem.completedQuantity = approvedCountForType;
      deliverableItem.updatedAt = now;
    }

    connection.updatedAt = now;
    await connection.save();

    // Send Notification to Brand
    const creatorProfile = await Profile.findById(connection.creatorId).select("fullName").lean();
    const creatorName = creatorProfile?.fullName || "Creator";
    let campaignTitle = "campaign";
    if (connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).select("title").lean();
      if (camp) campaignTitle = camp.title;
    }

    await Notification.create({
      recipientId: connection.brandId,
      senderId: connection.creatorId,
      type: "deliverable_resubmitted",
      text: `${creatorName} resubmitted ${previousSubmission.deliverableType} (v${newVersionNumber}) after rework for "${campaignTitle}".`,
      targetUrl: "/collaborations",
      createdAt: now,
    });

    // Notify Admin
    const admins = await Profile.find({ role: "admin" }).select("_id").lean();
    for (const admin of admins) {
      await Notification.create({
        recipientId: admin._id,
        senderId: connection.creatorId,
        type: "deliverable_resubmitted",
        text: `Creator ${creatorName} resubmitted ${previousSubmission.deliverableType} (v${newVersionNumber}) after rework for "${campaignTitle}".`,
        createdAt: now,
      });
    }

    // Post resubmission status message in conversation chat
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
          senderId: connection.creatorId,
          text: `[Deliverable Resubmitted] ${creatorName} resubmitted ${previousSubmission.deliverableType} (v${newVersionNumber}) after rework. Status: RESUBMITTED.`,
          messageType: "deliverable_submission",
          metadata: {
            submissionId: newSubmission._id,
            parentSubmissionId: previousSubmission._id,
            deliverableType: previousSubmission.deliverableType,
            contentUrl,
            caption: caption || "",
            status: "RESUBMITTED",
            version: newVersionNumber,
            reworkCount,
            resubmittedAt: now,
          },
          read: false,
        });
      }
    } catch (chatErr) {
      console.warn("Could not post resubmission message to chat:", chatErr);
    }

    res.status(201).json({
      success: true,
      message: `Deliverable ${previousSubmission.deliverableType} v${newVersionNumber} resubmitted successfully.`,
      data: {
        submission: newSubmission,
        deliverablesTracking: connection.deliverablesTracking,
      },
    });
  } catch (error) {
    console.error("Resubmit deliverable error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resubmit deliverable content.",
      error: error.message,
    });
  }
};

// 6. Delete Deliverable Submission (Creator can delete their own submitted/rejected submissions; Brand/Admin can delete if needed)
export const deleteDeliverableSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    const connection = await Connection.findById(submission.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Associated collaboration record not found.",
      });
    }

    // Security Check: Creator of submission, Brand or Admin can delete
    if (req.user) {
      const isCreator = String(submission.creatorId) === String(req.user._id);
      const isBrand = String(submission.brandId) === String(req.user._id);
      const isAdmin = req.user.role === "admin";

      if (!isCreator && !isBrand && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have permission to delete this submission.",
        });
      }

      // If submission is APPROVED, only admin or brand can delete it to avoid accidental state inconsistency
      if (submission.status === "APPROVED" && isCreator && !isAdmin) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete an approved deliverable. Please contact the brand or support.",
        });
      }
    }

    await Submission.findByIdAndDelete(submissionId);

    // Recalculate deliverables tracking and approval status on connection
    const now = Date.now();
    const approvedCountForType = await Submission.countDocuments({
      connectionId: connection._id,
      deliverableType: submission.deliverableType,
      status: "APPROVED",
    });

    const submittedCountForType = await Submission.countDocuments({
      connectionId: connection._id,
      deliverableType: submission.deliverableType,
      status: { $in: ["SUBMITTED", "RESUBMITTED"] },
    });

    const deliverableItem = connection.deliverablesTracking?.find(
      (d) => d.type === submission.deliverableType
    );

    if (deliverableItem) {
      deliverableItem.completedQuantity = approvedCountForType;
      if (approvedCountForType >= deliverableItem.requiredQuantity) {
        deliverableItem.status = "COMPLETED";
      } else if (submittedCountForType > 0) {
        deliverableItem.status = "SUBMITTED";
      } else if (approvedCountForType > 0) {
        deliverableItem.status = "IN_PROGRESS";
      } else {
        deliverableItem.status = "PENDING";
      }
      deliverableItem.updatedAt = now;
    }

    // Recalculate overall completion
    const allApproved =
      connection.deliverablesTracking &&
      connection.deliverablesTracking.length > 0 &&
      connection.deliverablesTracking.every(
        (deliv) => (deliv.completedQuantity || 0) >= (deliv.requiredQuantity || 1)
      );

    connection.allDeliverablesCompleted = allApproved;
    if (!allApproved) {
      connection.approvalCompletedAt = null;
      connection.paymentReleaseEligibleAt = null;
      connection.paymentReleaseStatus = "NOT_STARTED";
    }
    connection.updatedAt = now;
    await connection.save();

    res.status(200).json({
      success: true,
      message: "Submission deleted successfully.",
      data: {
        deletedSubmissionId: submissionId,
        deliverablesTracking: connection.deliverablesTracking,
        allDeliverablesCompleted: connection.allDeliverablesCompleted,
      },
    });
  } catch (error) {
    console.error("Delete submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete submission.",
      error: error.message,
    });
  }
};


