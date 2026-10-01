import mongoose from "mongoose";

const videoReviewSchema = new mongoose.Schema(
  {
    thumbnailUrl: {
      type: String,
    },

    videoUrl: {
      type: String,
      required: false,
    },

    reviewerName: {
      type: String,
      required: true,
      trim: true,
    },

    reviewerAvatar: {
      type: String,
      default: "",
    },

    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: false,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: false,
    },

    targetName: {
      type: String,
      default: "",
    },

    targetAvatar: {
      type: String,
      default: "",
    },

    campaignName: {
      type: String,
      default: "",
    },

    reviewType: {
      type: String,
      enum: ["video", "text"],
      default: "video",
    },

    reviewText: {
      type: String,
      required: true,
      trim: true,
    },

    rating: {
      type: Number,
      required: true,
      default: 5,
    },

    targetRole: {
      type: String,
      enum: ["brand", "creator"],
      required: true,
    },

    createdAt: {
      type: Number,
      required: true,
      default: () => Date.now(),
    },
  }
);

const VideoReview = mongoose.model("VideoReview", videoReviewSchema);

export default VideoReview;