import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

// ROUTES

import reviewRoutes from "./routes/reviweRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import popupSettingsRoutes from "./routes/popupSettingsRoutes.js";
import offerAnalyticsRoutes from "./routes/offerAnalyticsRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import proTipRoutes from "./routes/proTipRoutes.js";
import videoReviewRoutes from "./routes/videoReviewRoutes.js";
import trustReviewRoutes from "./routes/trustReviewRoutes.js";
import addonServicesRoutes from "./routes/addonServicesRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import favouriteRoutes from "./routes/favouriteRoutes.js";
import connectionRoutes from "./routes/connectionRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import profileImageRoutes from "./routes/profileImageRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import agreementRoutes from "./routes/agreementRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import pushRouter from "./routes/push.js";
import referralRoutes from "./routes/referralRoutes.js";
import internalRoutes from "./routes/internalRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
// const { router: pushRouter } = require('./routes/push');

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // Allow all vercel preview domains, localhost, or live production domains
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());

// Serve uploaded media and avatars
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

const avatarsDir = path.join(process.cwd(), "public", "avatars");
if (fs.existsSync(avatarsDir)) {
  app.use("/avatars", express.static(avatarsDir));
}


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Lemen Backend API is running",
  });
});

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/agreements", agreementRoutes);
app.use("/api/wallet", walletRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/subscriptions", subscriptionRoutes);

app.use("/api/popup-settings", popupSettingsRoutes);

app.use("/api/offer-analytics", offerAnalyticsRoutes);

app.use("/api/blogs", blogRoutes);

app.use("/api/pro-tips", proTipRoutes);

app.use("/api/video-reviews", videoReviewRoutes);

app.use("/api/trust-reviews", trustReviewRoutes);

app.use("/api/addons", addonServicesRoutes);

app.use("/api/campaigns", campaignRoutes);

app.use("/api/pricing", pricingRoutes);

app.use("/api/favourites", favouriteRoutes);
app.use("/api/favorites", favouriteRoutes);

app.use("/api/connections", connectionRoutes);

app.use("/api/conversations", conversationRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/portfolio", portfolioRoutes);

app.use("/api/profiles", profileRoutes);
app.use("/api/profile-images", profileImageRoutes);

app.use("/api/social", socialRoutes);

app.use("/api/tasks", taskRoutes);

app.use("/api/otp", otpRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use("/api/submissions", submissionRoutes);

app.use("/api/offers", offerRoutes);

app.use("/api/referrals", referralRoutes);
app.use("/api/v1/referrals", referralRoutes);

app.use("/api/follows", followRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/ai", aiRoutes);

app.use("/internal", internalRoutes);
app.use("/api/internal", internalRoutes);

app.use("/api/push", pushRouter );

export default app;