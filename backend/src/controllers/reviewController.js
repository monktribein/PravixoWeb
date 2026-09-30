// Ye file review se related saari business logic handle karti hai. 5 function: canReview, submitReview, listReviewsForCreator, getAvegrageRating,toggleReviewVisibility


import mongoose from "mongoose";
import Review from "../models/Review.js";
import Profile from "../models/Profile.js";
import Conversation from "../models/Conversation.js";
import Connection from "../models/Connection.js";
import Campaign from "../models/Campaign.js";

// Check karta hai ki user (brand ya creator) kisi doosre party ko review kar sakta hai ya nahi.
// Sirf vhi review kar sakta hai jiske sath collaboration hui hai (accepted/amount_agreed/paid connection).
export const canReview = async (req, res) => {
  try {
    const { targetId } = req.params;
    const { reviewerId } = req.query;

    if (!reviewerId || !targetId) {
      return res.status(200).json({
        success: true,
        data: { canReview: false, campaigns: [], reason: "Missing reviewer or target profile" },
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(targetId) ||
      !mongoose.Types.ObjectId.isValid(reviewerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid target or reviewer ID.",
      });
    }

    const reviewer = await Profile.findById(reviewerId);
    const target = await Profile.findById(targetId);

    if (!reviewer || !target) {
      return res.status(200).json({
        success: true,
        data: { canReview: false, campaigns: [], reason: "Profile not found" },
      });
    }

    if (reviewer._id.toString() === target._id.toString()) {
      return res.status(200).json({
        success: true,
        data: { canReview: false, campaigns: [], reason: "Cannot review own profile" },
      });
    }

    // Find accepted/active collaborations between reviewer and target
    const connections = await Connection.find({
      $or: [
        { brandId: reviewer._id, creatorId: target._id },
        { brandId: target._id, creatorId: reviewer._id },
      ],
      $or: [
        { status: "accepted" },
        { collaborationStatus: "AMOUNT_AGREED" },
        { paymentStatus: { $in: ["PAID", "PAYMENT_INITIATED"] } },
      ],
    }).populate("campaignId", "title").lean();

    if (connections.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          canReview: false,
          campaigns: [],
          reason: "You can only review brands or creators you have collaborated with.",
        },
      });
    }

    // Collect verified campaigns from collaborations
    const campaignsMap = new Map();
    for (const conn of connections) {
      if (conn.campaignId && conn.campaignId.title) {
        campaignsMap.set(conn.campaignId._id.toString(), {
          id: conn.campaignId._id,
          title: conn.campaignId.title,
        });
      }
    }

    // If no specific campaign linked, allow generic collaboration reference
    const campaigns = Array.from(campaignsMap.values());
    if (campaigns.length === 0) {
      campaigns.push({ id: "collab_direct", title: "Direct Collaboration" });
    }

    // Check if reviewer has already reviewed this target
    const existingReview = await Review.findOne({
      reviewerId: reviewer._id,
      targetId: target._id,
    });

    if (existingReview) {
      return res.status(200).json({
        success: true,
        data: {
          canReview: false,
          alreadyReviewed: true,
          campaigns,
          reason: "You have already reviewed this profile.",
        },
      });
    }

    // Find conversation ID if available
    const conversation = await Conversation.findOne({
      $or: [
        { brandId: reviewer._id, creatorId: target._id },
        { brandId: target._id, creatorId: reviewer._id },
      ],
    }).lean();

    return res.status(200).json({
      success: true,
      data: {
        canReview: true,
        campaigns,
        conversationId: conversation?._id || undefined,
      },
    });
  } catch (error) {
    console.error("Can review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check review eligibility.",
    });
  }
};

// Brand ya Creator review submit karta hai
export const submitReview = async (req, res) => {
  try {
    const {
      targetId,
      reviewerId,
      creatorId,
      brandId,
      conversationId,
      rating,
      title,
      text,
      campaignRef,
    } = req.body;

    const actualReviewerId = reviewerId || (creatorId && brandId ? brandId : null);
    const actualTargetId = targetId || (creatorId && brandId ? creatorId : null);

    if (!actualReviewerId || !actualTargetId || rating === undefined || !title || !text) {
      return res.status(400).json({
        success: false,
        message: "Required review fields are missing.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(actualReviewerId) ||
      !mongoose.Types.ObjectId.isValid(actualTargetId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID provided.",
      });
    }

    if (actualReviewerId.toString() === actualTargetId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot write a review for your own profile.",
      });
    }

    const reviewer = await Profile.findById(actualReviewerId);
    const target = await Profile.findById(actualTargetId);

    if (!reviewer || !target) {
      return res.status(404).json({
        success: false,
        message: "Reviewer or Target profile not found.",
      });
    }

    // Verify collaboration exists between the two parties
    const hasCollab = await Connection.findOne({
      $or: [
        { brandId: reviewer._id, creatorId: target._id },
        { brandId: target._id, creatorId: reviewer._id },
      ],
      $or: [
        { status: "accepted" },
        { collaborationStatus: "AMOUNT_AGREED" },
        { paymentStatus: { $in: ["PAID", "PAYMENT_INITIATED"] } },
      ],
    });

    if (!hasCollab) {
      return res.status(403).json({
        success: false,
        message: "Only brands and creators who have collaborated can submit a review.",
      });
    }

    // Check optional conversation
    let validConversationId = undefined;
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        validConversationId = conversation._id;
      }
    }

    // Check duplicate review
    const duplicateQuery = {
      reviewerId: reviewer._id,
      targetId: target._id,
    };
    if (validConversationId) {
      duplicateQuery.conversationId = validConversationId;
    }

    const existingReview = await Review.findOne(duplicateQuery);

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a review for this profile.",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5 stars.",
      });
    }

    const targetIsCreator = target.role !== "brand";
    const targetCreatorId = targetIsCreator ? target._id : reviewer._id;
    const targetBrandId = targetIsCreator ? reviewer._id : target._id;

    // Create review with 'approved' status
    const review = await Review.create({
      targetId: target._id,
      reviewerId: reviewer._id,
      reviewerRole: reviewer.role || (targetIsCreator ? "brand" : "creator"),
      creatorId: targetCreatorId,
      brandId: targetBrandId,
      conversationId: validConversationId,
      rating: Number(rating),
      title: title.trim(),
      text: text.trim(),
      campaignRef: campaignRef ? campaignRef.trim() : undefined,
      status: "approved",
      visible: true,
      createdAt: Date.now(),
    });

    // Recalculate target's average rating and reviewsCount in Profile
    try {
      const allApprovedReviews = await Review.find({
        targetId: target._id,
        reviewerId: { $ne: target._id },
        status: { $ne: "rejected" },
        visible: true,
      });
      const totalRating = allApprovedReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const avgRating = allApprovedReviews.length > 0 ? (totalRating / allApprovedReviews.length).toFixed(1) : "0";

      await Profile.findByIdAndUpdate(target._id, {
        rating: parseFloat(avgRating),
        reviewsCount: allApprovedReviews.length,
      });
    } catch (profileUpdateErr) {
      console.warn("Failed to update profile rating stats:", profileUpdateErr);
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully!",
      data: review,
    });
  } catch (error) {
    console.error("Submit review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit review.",
    });
  }
};

// Creator ya Brand ke reviews fetch karta hai
export const listReviewsForTarget = async (req, res) => {
  try {
    const targetId = req.params.targetId || req.params.creatorId;
    const includePending = req.query.includePending === "true";

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target profile ID.",
      });
    }

    const targetObjId = new mongoose.Types.ObjectId(targetId);

    // Reviews received by this target (must NOT be written by the target themselves)
    const filter = {
      $or: [
        { targetId: targetObjId },
        { targetId: targetId },
        { creatorId: targetObjId, targetId: { $exists: false } },
        { brandId: targetObjId, targetId: { $exists: false } },
      ],
      reviewerId: { $nin: [targetObjId, targetId] },
      visible: true,
    };

    if (!includePending) {
      // Show approved and pending reviews (not rejected)
      filter.status = { $in: ["approved", "pending"] };
    }

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Attach reviewer profile details
    const results = await Promise.all(
      reviews.map(async (review) => {
        let revProfileId = review.reviewerId;
        if (!revProfileId) {
          revProfileId = review.creatorId?.toString() === targetId.toString() ? review.brandId : review.creatorId;
        }

        const reviewerProfile = revProfileId ? await Profile.findById(revProfileId).lean() : null;

        const cleanHandle = reviewerProfile?.handle ? (reviewerProfile.handle.startsWith("@") ? reviewerProfile.handle.slice(1) : reviewerProfile.handle) : "";
        const finalName = reviewerProfile?.fullName || reviewerProfile?.companyName || reviewerProfile?.brandName || reviewerProfile?.name || review.brandName || "Verified User";
        const finalAvatar = reviewerProfile?.avatarUrl || reviewerProfile?.logoUrl || reviewerProfile?.image || review.brandAvatar || null;
        const finalRole = review.reviewerRole || reviewerProfile?.role || "brand";
        const finalGender = reviewerProfile?.gender || "male";
        const finalCompany = reviewerProfile?.companyName || reviewerProfile?.brandName || (finalRole === "brand" ? "Brand Partner" : "Verified Creator");

        return {
          ...review,
          reviewerId: reviewerProfile?._id || revProfileId,
          reviewerHandle: cleanHandle,
          reviewerName: finalName,
          reviewerAvatar: finalAvatar,
          reviewerRole: finalRole,
          reviewerGender: finalGender,
          reviewerCompany: finalCompany,
          brandName: finalName,
          brandAvatar: finalAvatar,
          brandHandle: cleanHandle,
          reviewer: {
            _id: reviewerProfile?._id || revProfileId,
            fullName: finalName,
            name: finalName,
            brandName: finalName,
            handle: cleanHandle,
            avatarUrl: finalAvatar,
            gender: finalGender,
            role: finalRole,
            companyName: finalCompany,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("List reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
};

// Average rating calculation for target profile
export const getAverageRating = async (req, res) => {
  try {
    const targetId = req.params.targetId || req.params.creatorId;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target ID.",
      });
    }

    const targetObjId = new mongoose.Types.ObjectId(targetId);

    const reviews = await Review.find({
      $or: [
        { targetId: targetObjId },
        { targetId: targetId },
        { creatorId: targetObjId, targetId: { $exists: false } },
        { brandId: targetObjId, targetId: { $exists: false } },
      ],
      reviewerId: { $nin: [targetObjId, targetId] },
      status: "approved",
      visible: true,
    }).lean();

    if (reviews.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          rating: 5.0,
          reviewsCount: 0,
        },
      });
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = Math.round((totalRating / reviews.length) * 10) / 10;

    return res.status(200).json({
      success: true,
      data: {
        rating: avgRating,
        reviewsCount: reviews.length,
      },
    });
  } catch (error) {
    console.error("Average rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate average rating.",
    });
  }
};

// ADMIN: Get all reviews with status filter
export const getAdminReviews = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const reviews = await Review.find(filter).sort({ createdAt: -1 }).lean();

    const populated = await Promise.all(
      reviews.map(async (rev) => {
        const reviewer = rev.reviewerId ? await Profile.findById(rev.reviewerId).lean() : null;
        const target = rev.targetId ? await Profile.findById(rev.targetId).lean() : (rev.creatorId ? await Profile.findById(rev.creatorId).lean() : (rev.brandId ? await Profile.findById(rev.brandId).lean() : null));

        const reviewerGender = reviewer?.gender || "male";
        const targetGender = target?.gender || "female";
        const revName = reviewer?.fullName || reviewer?.companyName || reviewer?.brandName || reviewer?.name || "User";
        const revRole = rev.reviewerRole || reviewer?.role || "brand";
        const revAvatar = reviewer?.avatarUrl || reviewer?.logoUrl || null;
        const tgtName = target?.fullName || target?.companyName || target?.brandName || target?.name || "Target User";
        const tgtRole = target?.role || (revRole === "brand" ? "creator" : "brand");
        const tgtAvatar = target?.avatarUrl || target?.logoUrl || null;

        return {
          ...rev,
          feedback: rev.text || rev.content || rev.feedback || "",
          content: rev.text || rev.content || rev.feedback || "",
          reviewerName: revName,
          reviewerRole: revRole,
          reviewerAvatar: revAvatar,
          reviewerGender,
          targetName: tgtName,
          targetUserName: tgtName,
          targetRole: tgtRole,
          targetUserRole: tgtRole,
          targetAvatar: tgtAvatar,
          targetUserAvatar: tgtAvatar,
          targetGender,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    console.error("Admin get reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin reviews.",
    });
  }
};

// ADMIN: Approve review
export const approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { status: "approved", visible: true },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Review approved successfully and is now visible on display!",
      data: review,
    });
  } catch (error) {
    console.error("Approve review error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve review." });
  }
};

// ADMIN: Reject review
export const rejectReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { status: "rejected" },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Review rejected.",
      data: review,
    });
  } catch (error) {
    console.error("Reject review error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject review." });
  }
};

// Toggle visibility
export const toggleReviewVisibility = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    review.visible = !review.visible;
    await review.save();

    return res.status(200).json({
      success: true,
      data: { visible: review.visible },
    });
  } catch (error) {
    console.error("Toggle visibility error:", error);
    return res.status(500).json({ success: false, message: "Failed to update visibility." });
  }
};