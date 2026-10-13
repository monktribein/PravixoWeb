import express from "express";

import {
  listPortfolioImages,
  createPortfolioImage,
  updatePortfolioImage,
  deletePortfolioImage,
  reorderPortfolioImages,
} from "../controllers/profileImageController.js";

const router = express.Router();

router.get("/", listPortfolioImages);
router.post("/", createPortfolioImage);
router.patch("/:id", updatePortfolioImage);
router.delete("/:id", deletePortfolioImage);
router.patch("/reorder/all", reorderPortfolioImages);

export default router;