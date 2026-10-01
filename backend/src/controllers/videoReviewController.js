import mongoose from "mongoose";
import VideoReview from "../models/VideoReview.js";
import Profile from "../models/Profile.js";
import Connection from "../models/Connection.js";

// =====================================
// CHECK IF USER CAN POST REVIEW (MUST BE COLLABORATED)
// GET /api/video-reviews/check-eligibility
// =====================================
export const checkReviewEligibility = async (req, res) => {
  try {
    const { reviewerId } = req.query;

    if (!reviewerId || !mongoose.Types.ObjectId.isValid(reviewerId)) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: "Please log in with an active account to post a review.",
        collaborations: [],
      });
    }

    const reviewer = await Profile.findById(reviewerId);
    if (!reviewer) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: "Profile not found.",
        collaborations: [],
      });
    }

    // Admins always have access
    if (reviewer.role === "brand" && (reviewer.fullName === "Admin" || reviewer.userId === "admin")) {
      return res.status(200).json({
        success: true,
        canReview: true,
        isAdmin: true,
        collaborations: [],
      });
    }

    // Find all accepted/active collaborations for this reviewer
    const connections = await Connection.find({
      $or: [{ brandId: reviewer._id }, { creatorId: reviewer._id }],
      $or: [
        { status: "accepted" },
        { collaborationStatus: "AMOUNT_AGREED" },
        { paymentStatus: { $in: ["PAID", "PAYMENT_INITIATED", "ESCROW_PAID", "RELEASED"] } },
      ],
    })
      .populate("brandId", "fullName avatar name companyName")
      .populate("creatorId", "fullName avatar name")
      .populate("campaignId", "title")
      .lean();

    if (connections.length === 0) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: "Only brands and creators who have collaborated together on Pravixo can post reviews.",
        collaborations: [],
      });
    }

    // Map list of collaborated partners
    const collabs = connections.map((c) => {
      const isReviewerBrand = c.brandId?._id?.toString() === reviewer._id.toString();
      const partner = isReviewerBrand ? c.creatorId : c.brandId;
      return {
        connectionId: c._id,
        partnerId: partner?._id,
        partnerName: partner?.fullName || partner?.name || partner?.companyName || "Collab Partner",
        partnerAvatar: partner?.avatar,
        campaignTitle: c.campaignId?.title || "Direct Collaboration",
        targetRole: isReviewerBrand ? "creator" : "brand",
      };
    });

    return res.status(200).json({
      success: true,
      canReview: true,
      role: reviewer.role,
      reviewerName: reviewer.fullName || reviewer.name,
      reviewerAvatar: reviewer.avatar,
      collaborations: collabs,
    });
  } catch (error) {
    console.error("Check review eligibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify review eligibility.",
    });
  }
};

// =====================================
// GET ALL VIDEO/TEXT REVIEWS
// GET /api/video-reviews
// =====================================

export const getVideoReviews = async (req, res) => {
  try {
    const { targetRole, reviewType } = req.query;

    const filter = {};

    if (targetRole) {
      filter.targetRole = targetRole;
    }
    if (reviewType) {
      filter.reviewType = reviewType;
    }

    const reviews = await VideoReview.find(filter)
      .populate("targetId", "fullName name companyName avatar avatarUrl role")
      .populate("reviewerId", "fullName name companyName avatar avatarUrl role")
      .sort({ createdAt: -1 })
      .lean();

    // Fill targetName and targetAvatar if missing or from populated profile
    const enhancedReviews = reviews.map((rev) => {
      const target = rev.targetId;
      const targetName =
        rev.targetName ||
        (target ? (target.fullName || target.name || target.companyName) : "") ||
        "";
      const targetAvatar =
        rev.targetAvatar ||
        (target ? (target.avatar || target.avatarUrl) : "") ||
        "";

      const reviewer = rev.reviewerId;
      const reviewerAvatar =
        rev.reviewerAvatar ||
        (reviewer ? (reviewer.avatar || reviewer.avatarUrl) : "") ||
        "";

      return {
        ...rev,
        targetName,
        targetAvatar,
        reviewerAvatar,
      };
    });

    return res.status(200).json({
      success: true,
      data: enhancedReviews,
    });
  } catch (error) {
    console.error("Get video reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
};

// =====================================
// GET VIDEO REVIEW BY ID
// GET /api/video-reviews/:id
// =====================================

export const getVideoReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID.",
      });
    }

    const review = await VideoReview.findById(id).lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Get review by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch review.",
    });
  }
};

const getFileUrl = (file) => {
  if (!file) return null;
  if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

// =====================================
// CREATE VIDEO / TEXT REVIEW
// POST /api/video-reviews
// =====================================

export const createVideoReview = async (req, res) => {
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

    // Default reviewType if not passed
    if (!payload.reviewType) {
      payload.reviewType = payload.videoUrl ? "video" : "text";
    }

    // If reviewType is video, require videoUrl
    if (payload.reviewType === "video" && !payload.videoUrl) {
      return res.status(400).json({
        success: false,
        message: "A video file or video link is required for video reviews.",
      });
    }

    if (!payload.reviewerName || !payload.reviewText) {
      return res.status(400).json({
        success: false,
        message: "Reviewer name and review text are required.",
      });
    }

    // Validate collaboration if reviewerId is provided and not admin
    if (payload.reviewerId && mongoose.Types.ObjectId.isValid(payload.reviewerId)) {
      const reviewer = await Profile.findById(payload.reviewerId);
      const isAdmin = reviewer?.role === "brand" && (reviewer?.fullName === "Admin" || reviewer?.userId === "admin");

      if (!isAdmin) {
        const hasCollab = await Connection.findOne({
          $or: [{ brandId: payload.reviewerId }, { creatorId: payload.reviewerId }],
          $or: [
            { status: "accepted" },
            { collaborationStatus: "AMOUNT_AGREED" },
            { paymentStatus: { $in: ["PAID", "PAYMENT_INITIATED", "ESCROW_PAID", "RELEASED"] } },
          ],
        });

        if (!hasCollab) {
          return res.status(403).json({
            success: false,
            message: "Only partners who have completed collaborations together can post reviews.",
          });
        }
      }
    }

    const review = await VideoReview.create(payload);

    return res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Create review error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create review.",
    });
  }
};

// =====================================
// UPDATE VIDEO REVIEW
// PUT /api/video-reviews/:id
// =====================================

export const updateVideoReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video review ID.",
      });
    }

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

    const review = await VideoReview.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Video review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Update video review error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update video review.",
    });
  }
};

// =====================================
// DELETE VIDEO REVIEW
// DELETE /api/video-reviews/:id
// =====================================

export const deleteVideoReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video review ID.",
      });
    }

    const review = await VideoReview.findByIdAndDelete(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Video review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Video review deleted successfully.",
    });
  } catch (error) {
    console.error("Delete video review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete video review.",
    });
  }
};