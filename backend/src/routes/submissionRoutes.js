import express from "express";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  submitDeliverableContent,
  getCollaborationSubmissions,
  approveDeliverableSubmission,
  rejectDeliverableSubmission,
  resubmitDeliverableContent,
  deleteDeliverableSubmission,
} from "../controllers/submissionController.js";

const router = express.Router();

// Creator submits initial deliverable content
router.post(
  "/:connectionId/submit",
  protect,
  upload.single("file"),
  submitDeliverableContent
);

// Creator reworks & resubmits rejected deliverable (Task 8)
router.post(
  "/:submissionId/resubmit",
  protect,
  upload.single("file"),
  resubmitDeliverableContent
);

// Get submissions for a collaboration
router.get(
  "/:connectionId/submissions",
  protect,
  getCollaborationSubmissions
);

// Brand approves deliverable submission
router.patch(
  "/:submissionId/approve",
  protect,
  approveDeliverableSubmission
);

// Brand rejects deliverable submission (requires reason)
router.patch(
  "/:submissionId/reject",
  protect,
  rejectDeliverableSubmission
);

// Delete deliverable submission
router.delete(
  "/:submissionId",
  protect,
  deleteDeliverableSubmission
);

export default router;

