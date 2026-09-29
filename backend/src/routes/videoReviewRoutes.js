import express from "express";
import upload from "../middleware/upload.js";
import {
  getVideoReviews,
  getVideoReviewById,
  createVideoReview,
  updateVideoReview,
  deleteVideoReview,
  checkReviewEligibility,
} from "../controllers/videoReviewController.js";

const router = express.Router();

const videoUploadMiddleware = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// Check if user is eligible to review (must be collaborated)
router.get("/check-eligibility", checkReviewEligibility);

// Get all video/text reviews
router.get("/", getVideoReviews);

// Get single video review
router.get("/:id", getVideoReviewById);

// Create video review (supports multipart file upload or JSON)
router.post("/", videoUploadMiddleware, createVideoReview);

// Update video review (supports multipart file upload or JSON)
router.put("/:id", videoUploadMiddleware, updateVideoReview);

// Delete video review
router.delete("/:id", deleteVideoReview);

export default router;