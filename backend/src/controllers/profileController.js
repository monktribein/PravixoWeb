import mongoose from "mongoose";
import crypto from "crypto";

import Profile from "../models/Profile.js";
import Review from "../models/Review.js";
import Otp from "../models/Otp.js";
import PricingTier from "../models/PricingTier.js";
import SocialConnection from "../models/SocialConnection.js";

// =====================================================
// LIST PROFILES
// Convex: profiles.list
// =====================================================

export const listProfiles = async (req, res) => {
  try {
    const { search, category, role } = req.query;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (category && category !== "All") {
      filter.category = { $regex: category.trim(), $options: "i" };
    }

    // Always exclude soft-deleted and suspended profiles
    filter.isDeleted = { $ne: true };
    filter.isSuspended = { $ne: true };
    filter.email = { $not: /@pravixo\.test|@test\.com/i };

    let profiles = await Profile.find(filter).sort({ createdAt: -1 }).lean();

    // Filter out dummy/test profile names
    profiles = profiles.filter(
      (p) =>
        !/task20|impostor|suspended|test brand|dummy|alice referrer|bob creator|charlie creator/i.test(
          p.fullName || ""
        )
    );

    // Search fullName, handle, category, and barter deals
    if (search) {
      const s = search.toLowerCase().trim();

      profiles = profiles.filter((profile) => {
        const matchesBarter = s === "barter" || s === "barter deals" || s === "barter deal" ? Boolean(profile.isBarterAllowed) : false;
        return (
          matchesBarter ||
          profile.fullName?.toLowerCase().includes(s) ||
          profile.handle?.toLowerCase().includes(s) ||
          profile.category?.toLowerCase().includes(s) ||
          (Boolean(profile.isBarterAllowed) && s.includes("barter"))
        );
      });
    }

    const results = await Promise.all(
      profiles.map(async (profile) => {
        const reviews = await Review.find({
          creatorId: profile._id,
          visible: true,
        }).lean();

        if (reviews.length === 0) {
          return {
            ...profile,
            rating: 5.0,
            reviewsCount: 0,
          };
        }

        const totalRating = reviews.reduce(
          (sum, review) => sum + Number(review.rating || 0),
          0
        );

        const rating =
          Math.round(
            (totalRating / reviews.length) * 10
          ) / 10;

        return {
          ...profile,
          rating,
          reviewsCount: reviews.length,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("List profiles error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profiles.",
    });
  }
};

// =====================================================
// GET PROFILE BY USER ID
// Convex: profiles.getByUserId
// =====================================================

export const getByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const profile = await Profile.findOne({
      userId,
    }).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    let brandCampaigns = [];
    let hiredCount = 0;
    if (profile.role === "brand") {
      const Campaign = mongoose.model("Campaign");
      const Connection = mongoose.model("Connection");
      brandCampaigns = await Campaign.find({
        brandId: profile._id,
      }).sort({ createdAt: -1 }).lean();

      hiredCount = await Connection.countDocuments({
        brandId: profile._id,
        status: { $in: ["accepted", "completed"] },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        campaigns: brandCampaigns,
        campaignsCount: brandCampaigns.length,
        hiredCount,
      },
    });
  } catch (error) {
    console.error("Get profile by user ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
    });
  }
};

// =====================================================
// GET PROFILE BY ID
// Convex: profiles.getById
// =====================================================

export const getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID.",
      });
    }

    const profile = await Profile.findById(id).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    // If profile is a brand, attach live campaigns and counts
    let brandCampaigns = [];
    let hiredCount = 0;
    if (profile.role === "brand") {
      const Campaign = mongoose.model("Campaign");
      const Connection = mongoose.model("Connection");
      brandCampaigns = await Campaign.find({
        brandId: profile._id,
      }).sort({ createdAt: -1 }).lean();

      hiredCount = await Connection.countDocuments({
        brandId: profile._id,
        status: { $in: ["accepted", "completed"] },
      });
    }

    const reviews = await Review.find({
      creatorId: profile._id,
      visible: true,
    }).lean();

    const pricingTiers = await PricingTier.find({
      profileId: profile._id,
    })
      .sort({ sortOrder: 1 })
      .lean();

    const rating =
      reviews.length === 0
        ? 5.0
        : Math.round(
            (
              reviews.reduce(
                (sum, review) =>
                  sum + Number(review.rating || 0),
                0
              ) / reviews.length
            ) * 10
          ) / 10;

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        campaigns: brandCampaigns,
        campaignsCount: brandCampaigns.length,
        hiredCount,
        rating,
        reviewsCount: reviews.length,
        pricingTiers: pricingTiers || [],
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
    });
  }
};

// =====================================================
// GET PROFILE BY HANDLE (FOR MEDIA KIT / PUBLIC PORTFOLIO)
// GET /api/profiles/handle/:handle
// =====================================================

export const getByHandle = async (req, res) => {
  try {
    let { handle } = req.params;
    if (!handle) {
      return res.status(400).json({
        success: false,
        message: "Handle parameter is required.",
      });
    }

    handle = handle.trim().replace(/^@/, "");

    // Search by handle (case insensitive) or if not found and is valid ObjectId, search by ID
    let profile = await Profile.findOne({
      handle: { $regex: new RegExp(`^@?${handle}$`, "i") },
    }).lean();

    if (!profile && mongoose.Types.ObjectId.isValid(handle)) {
      profile = await Profile.findById(handle).lean();
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: `Creator profile with handle @${handle} was not found.`,
      });
    }

    // Attach reviews & ratings
    const reviews = await Review.find({
      creatorId: profile._id,
      visible: true,
    }).lean();

    const pricingTiers = await PricingTier.find({
      profileId: profile._id,
    })
      .sort({ sortOrder: 1 })
      .lean();

    const rating =
      reviews.length === 0
        ? 5.0
        : Math.round(
            (
              reviews.reduce(
                (sum, review) => sum + Number(review.rating || 0),
                0
              ) / reviews.length
            ) * 10
          ) / 10;

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        rating,
        reviewsCount: reviews.length,
        reviews,
        pricingTiers: pricingTiers || [],
      },
    });
  } catch (error) {
    console.error("Get profile by handle error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch creator profile by handle.",
      error: error.message,
    });
  }
};

// =====================================================
// CREATE PROFILE
// Convex: profiles.create
// =====================================================

export const createProfile = async (req, res) => {
  try {
    const {
      userId,
      fullName,
      role,
      isLogin,
      email,
      otpCode,
    } = req.body;

    // Basic validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: "Full name is required.",
      });
    }

    if (!role || !["creator", "brand"].includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          "Role must be either creator or brand.",
      });
    }

    // -------------------------------------------------
    // CHECK EXISTING PROFILE
    // -------------------------------------------------

    const existing = await Profile.findOne({
      userId,
    });

    // -------------------------------------------------
    // LOGIN FLOW
    // Convex:
    // if (args.isLogin)
    // -------------------------------------------------

    if (isLogin) {
      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "This email is not registered. Please create an account first.",
        });
      }

      if (existing.role !== role) {
        return res.status(400).json({
          success: false,
          message:
            `This account is registered as a ${existing.role}. ` +
            `Please log in as a ${existing.role}.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: existing,
      });
    }

    // -------------------------------------------------
    // SIGNUP - PROFILE ALREADY EXISTS
    // -------------------------------------------------

    if (existing) {
      return res.status(200).json({
        success: true,
        data: existing,
      });
    }

    // -------------------------------------------------
    // SIGNUP REQUIRES EMAIL + OTP
    // -------------------------------------------------

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message:
          "Email and verification code are required for registration.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // -------------------------------------------------
    // FIND OTP
    // -------------------------------------------------

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message:
          "No verification code request was found for this email.",
      });
    }

    // -------------------------------------------------
    // CHECK OTP EXPIRY
    // -------------------------------------------------

    if (
      Date.now() >
      new Date(otpRecord.expiresAt).getTime()
    ) {
      await Otp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message:
          "Verification code has expired. Please request a new one.",
      });
    }

    // -------------------------------------------------
    // HASH ENTERED OTP
    // -------------------------------------------------

    const inputHash = crypto
      .createHash("sha256")
      .update(String(otpCode))
      .digest("hex");

    // -------------------------------------------------
    // VERIFY OTP
    // -------------------------------------------------

    if (inputHash !== otpRecord.codeHash) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid verification code. Please try again.",
      });
    }

    // -------------------------------------------------
    // DELETE OTP AFTER SUCCESSFUL VERIFICATION
    // Prevent OTP reuse
    // -------------------------------------------------

    await Otp.deleteOne({
      _id: otpRecord._id,
    });

    // -------------------------------------------------
    // CREATE PROFILE
    // -------------------------------------------------

    const profile = await Profile.create({
      userId,
      fullName,
      role,
      email: normalizedEmail,
      profileViews: 0,
      clicks: 0,
      bookings: 0,
    });

    return res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Create profile error:", error);

    // Duplicate userId
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A profile already exists for this user.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to create profile.",
    });
  }
};

// =====================================================
// UPDATE PROFILE
// Convex: profiles.update
// =====================================================

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID.",
      });
    }

    // Fields allowed by Convex profiles.update
    const allowedFields = [
      "fullName",
      "handle",
      "gender",
      "phone",
      "category",
      "location",
      "bio",
      "startingPrice",
      "avatarUrl",
      "coverUrl",

      // Stats
      "profileViews",
      "clicks",
      "bookings",

      // Instagram
      "instagramHandle",
      "instagramFollowers",

      // Facebook
      "facebookHandle",
      "facebookFollowers",

      // LinkedIn
      "linkedinHandle",
      "linkedinFollowers",

      // YouTube
      "youtubeHandle",
      "youtubeFollowers",

      // Quora
      "quoraHandle",
      "quoraFollowers",

      // Twitter
      "twitterHandle",
      "twitterFollowers",

      // Brand preferences
      "prefNiches",
      "prefBudget",
      "prefReach",
      "prefRegions",

      "mediaKitBio",
      "mediaKitTagline",
      "audienceHighlights",
      "pastBrandsWorkedWith",
      "customSocialFeeds",

      "website",
      "companySize",
      "isBarterAllowed",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update.",
      });
    }

    const profile =
      await Profile.findByIdAndUpdate(
        id,
        updates,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to update profile.",
    });
  }
};

// =====================================================
// UPLOAD AVATAR IMAGE
// POST /api/profiles/:id/avatar
// =====================================================
export const uploadAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar image file is required.",
      });
    }

    const getFileUrl = (file) => {
      if (!file) return null;
      if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
        return file.path;
      }
      return `/uploads/${file.filename}`;
    };

    const avatarUrl = getFileUrl(req.file);

    const profile = await Profile.findByIdAndUpdate(
      id,
      { avatarUrl },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Avatar updated successfully.",
      avatarUrl,
      data: profile,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload avatar.",
      error: error.message,
    });
  }
};

// =====================================================
// UPLOAD COVER IMAGE
// POST /api/profiles/:id/cover
// =====================================================
export const uploadCover = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Cover image file is required.",
      });
    }

    const getFileUrl = (file) => {
      if (!file) return null;
      if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
        return file.path;
      }
      return `/uploads/${file.filename}`;
    };

    const coverUrl = getFileUrl(req.file);

    const profile = await Profile.findByIdAndUpdate(
      id,
      { coverUrl },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cover photo updated successfully.",
      coverUrl,
      data: profile,
    });
  } catch (error) {
    console.error("Upload cover error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload cover image.",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE / RESET AVATAR
// DELETE /api/profiles/:id/avatar
// =====================================================
export const deleteAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID.",
      });
    }

    const profile = await Profile.findByIdAndUpdate(
      id,
      { avatarUrl: "" },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Avatar removed successfully.",
      data: profile,
    });
  } catch (error) {
    console.error("Delete avatar error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove avatar.",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE / RESET COVER BANNER
// DELETE /api/profiles/:id/cover
// =====================================================
export const deleteCover = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID.",
      });
    }

    const profile = await Profile.findByIdAndUpdate(
      id,
      { coverUrl: "" },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cover banner removed successfully.",
      data: profile,
    });
  } catch (error) {
    console.error("Delete cover error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove cover banner.",
      error: error.message,
    });
  }
};

// =====================================================
// UPLOAD KYC DOCUMENTS
// POST /api/profiles/:id/kyc-documents
// =====================================================
export const uploadKycDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID.",
      });
    }

    const getFileUrl = (file) => {
      if (!file) return null;
      if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
        return file.path;
      }
      return `/uploads/${file.filename}`;
    };

    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    const updates = {};

    if (req.files) {
      if (req.files.aadhar && req.files.aadhar[0]) {
        updates.aadharUrl = getFileUrl(req.files.aadhar[0]);
        updates.aadharStorageId = req.files.aadhar[0].filename;
      }
      if (req.files.pan && req.files.pan[0]) {
        updates.panUrl = getFileUrl(req.files.pan[0]);
        updates.panStorageId = req.files.pan[0].filename;
      }
      if (req.files.gstCertificate && req.files.gstCertificate[0]) {
        updates.gstCertificateUrl = getFileUrl(req.files.gstCertificate[0]);
        updates.gstCertificateStorageId = req.files.gstCertificate[0].filename;
      }
    }

    if (req.body.gstNumber) {
      updates.gstNumber = req.body.gstNumber;
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "KYC documents uploaded successfully for verification.",
      data: updatedProfile,
    });

  } catch (error) {
    console.error("Upload KYC documents error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload KYC documents.",
      error: error.message,
    });
  }
};

// =====================================================
// UNSUBSCRIBE EMAIL NOTIFICATIONS
// POST or GET /api/profiles/unsubscribe
// =====================================================
export const unsubscribeEmailNotifications = async (req, res) => {
  try {
    const { email, token } = req.query.email ? req.query : req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to unsubscribe.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const query = { email: normalizedEmail };

    if (token) {
      query.$or = [{ unsubscribeToken: token }, { _id: mongoose.Types.ObjectId.isValid(token) ? token : null }];
    }

    const profile = await Profile.findOneAndUpdate(
      query,
      { $set: { emailNotificationsEnabled: false } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found or invalid token.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "You have been successfully unsubscribed from campaign email notifications.",
      data: { email: profile.email, emailNotificationsEnabled: false },
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process unsubscribe request.",
      error: error.message,
    });
  }
};

// =====================================================
// TOGGLE EMAIL NOTIFICATIONS PREFERENCE (Authenticated)
// PATCH /api/profiles/email-notifications
// =====================================================
export const toggleEmailNotifications = async (req, res) => {
  try {
    const profileId = req.user?._id || req.user?.profileId;
    const { enabled } = req.body;

    if (!profileId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const profile = await Profile.findByIdAndUpdate(
      profileId,
      { $set: { emailNotificationsEnabled: Boolean(enabled) } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Campaign email notifications have been ${enabled ? "enabled" : "disabled"}.`,
      data: { emailNotificationsEnabled: profile.emailNotificationsEnabled },
    });
  } catch (error) {
    console.error("Toggle email notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update email notification preferences.",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORT CREATOR MEDIA KIT AS DIRECT DOWNLOADABLE PDF
// GET /api/profiles/handle/:handle/pdf
// =====================================================
export const exportMediaKitPdf = async (req, res) => {
  try {
    const { handle } = req.params;
    if (!handle) {
      return res.status(400).json({ success: false, message: "Handle is required." });
    }

    const cleanHandle = handle.trim().replace(/^@/, "");
    let profile = await Profile.findOne({
      handle: { $regex: new RegExp(`^@?${cleanHandle}$`, "i") },
    }).lean();

    if (!profile && mongoose.Types.ObjectId.isValid(cleanHandle)) {
      profile = await Profile.findById(cleanHandle).lean();
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: "Creator not found." });
    }

    // Fetch pricing tiers & social connections for complete data
    let pricingTiers = [];
    let socialConnections = [];
    if (profile._id) {
      try {
        const [pricingDocs, socialDocs] = await Promise.all([
          PricingTier.find({ profileId: profile._id }).sort({ sortOrder: 1, price: 1 }).lean(),
          SocialConnection.find({ profileId: profile._id }).lean(),
        ]);
        pricingTiers = pricingDocs || [];
        socialConnections = socialDocs || [];
      } catch (e) {
        console.warn("Could not fetch extra profile data for PDF:", e);
      }
    }

    const PDFDocument = (await import("pdfkit")).default;
    // A4 dimensions: 595.28 x 841.89 points
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 32, bottom: 32, left: 36, right: 36 },
      bufferPages: true,
      autoFirstPage: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${cleanHandle}-Media-Kit.pdf"`
    );

    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const mLeft = 36;
    const mRight = 36;
    const contentW = pageW - mLeft - mRight; // 523.28

    // 1. FULL BACKGROUND
    doc.rect(0, 0, pageW, pageH).fill("#090d16");

    // Subtle ambient gradient / highlight bar at top
    doc.rect(0, 0, pageW, 5).fill("#ff5e62");

    // 2. HEADER CONTAINER (Hero banner card)
    const headerH = 92;
    doc.roundedRect(mLeft, 24, contentW, headerH, 10).fillAndStroke("#0f172a", "#1e293b");

    // Header Accent Line & Badge
    doc.roundedRect(mLeft + 14, 34, 120, 18, 9).fill("#1e293b");
    doc.fillColor("#ff5e62").fontSize(8).font("Helvetica-Bold").text("⚡ PRAVIXO VERIFIED", mLeft + 22, 39, { characterSpacing: 1 });

    // Live URL pill on right
    doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(`pravixo.com/c/${cleanHandle}`, mLeft + contentW - 180, 39, { width: 165, align: "right" });

    // Creator Name
    const creatorName = profile.fullName || profile.displayName || cleanHandle;
    doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text(creatorName, mLeft + 14, 58);

    // Tagline / Category & Handle
    const categoryText = profile.category || "Digital Creator";
    const locText = profile.location ? ` • ${profile.location}` : "";
    doc.fillColor("#94a3b8").fontSize(9.5).font("Helvetica").text(`@${cleanHandle} • ${categoryText}${locText}`, mLeft + 14, 82);

    // Starting price pill on right
    if (profile.startingPrice && profile.startingPrice > 0) {
      const priceBoxW = 110;
      const priceBoxX = mLeft + contentW - priceBoxW - 14;
      doc.roundedRect(priceBoxX, 60, priceBoxW, 44, 8).fillAndStroke("#131c2e", "#334155");
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica-Bold").text("STARTING AT", priceBoxX + 10, 67);
      doc.fillColor("#38bdf8").fontSize(12).font("Helvetica-Bold").text(`INR ${profile.startingPrice.toLocaleString("en-IN")}`, priceBoxX + 10, 81);
    }

    // 3. KEY METRICS 4-COLUMN STATS GRID
    let curY = 126;
    const statH = 58;
    const numCols = 4;
    const gap = 8;
    const statW = (contentW - (numCols - 1) * gap) / numCols;

    const totalFollowers =
      (profile.instagramFollowers || 0) +
      (profile.youtubeFollowers || 0) +
      (profile.facebookFollowers || 0) +
      (profile.twitterFollowers || 0) +
      (profile.linkedinFollowers || 0);

    const formatNum = (num) => {
      if (!num || num === 0) return "1K+";
      if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
      if (num >= 1000) return (num / 1000).toFixed(1) + "K";
      return String(num);
    };

    const verifiedConn = socialConnections.find((c) => c.verified && c.engagementRate > 0);
    const avgEr = verifiedConn?.engagementRate ? `${verifiedConn.engagementRate}%` : "4.8%";
    const avgViews = profile.audienceHighlights?.avgViewsPerReel || "25K - 70K";

    const statsData = [
      { label: "TOTAL AUDIENCE", val: formatNum(totalFollowers), color: "#ffffff", sub: "Cross-Platform" },
      { label: "AVG ENGAGEMENT", val: avgEr, color: "#10b981", sub: "Audited Rate" },
      { label: "AVG REEL VIEWS", val: avgViews, color: "#c084fc", sub: "Organic Reach" },
      { label: "DELIVERY TIME", val: "2-4 Days", color: "#f59e0b", sub: "Turnaround" },
    ];

    statsData.forEach((stat, i) => {
      const sx = mLeft + i * (statW + gap);
      doc.roundedRect(sx, curY, statW, statH, 8).fillAndStroke("#0f172a", "#1e293b");
      doc.fillColor("#64748b").fontSize(7).font("Helvetica-Bold").text(stat.label, sx + 8, curY + 8);
      doc.fillColor(stat.color).fontSize(14).font("Helvetica-Bold").text(stat.val, sx + 8, curY + 21);
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text(stat.sub, sx + 8, curY + 42);
    });

    curY += statH + 12;

    // 4. TWO-COLUMN MAIN CONTENT (Left: 56%, Right: 44%)
    const colGap = 12;
    const leftW = Math.floor(contentW * 0.56);
    const rightW = contentW - leftW - colGap;
    const rightX = mLeft + leftW + colGap;

    // --- LEFT COLUMN ---
    let leftY = curY;

    // BIO CARD
    const bioH = 135;
    const bioText = profile.mediaKitBio || profile.bio || `${creatorName} is a verified ${categoryText} creator creating engaging, high-retention content and high ROI campaigns for modern consumer brands.`;
    doc.roundedRect(mLeft, leftY, leftW, bioH, 8).fillAndStroke("#0f172a", "#1e293b");
    doc.fillColor("#38bdf8").fontSize(9).font("Helvetica-Bold").text("ABOUT THE CREATOR", mLeft + 12, leftY + 11);
    doc.fillColor("#cbd5e1").fontSize(8).font("Helvetica").text(bioText, mLeft + 12, leftY + 27, {
      width: leftW - 24,
      height: 68,
      ellipsis: true,
      lineGap: 2.5,
    });

    // Categories Pill Tags
    const tags = (profile.category ? profile.category.split(",") : ["Creator", "Collaborations"]).slice(0, 4);
    let tagX = mLeft + 12;
    tags.forEach((tag) => {
      const t = tag.trim();
      const tw = doc.fontSize(7).widthOfString(`#${t}`) + 14;
      doc.roundedRect(tagX, leftY + 104, tw, 18, 9).fillAndStroke("#1e293b", "#334155");
      doc.fillColor("#e2e8f0").fontSize(7).font("Helvetica-Bold").text(`#${t}`, tagX + 7, leftY + 109);
      tagX += tw + 5;
    });

    leftY += bioH + 10;

    // AUDIENCE DEMOGRAPHICS CARD
    const demoH = 145;
    const topAge = profile.audienceHighlights?.topAgeGroup || "18–24 (48%)";
    const topGender = profile.audienceHighlights?.topGender || "62% Female / 38% Male";
    const topCities = profile.audienceHighlights?.topLocations || "Mumbai, Delhi, Bangalore";

    doc.roundedRect(mLeft, leftY, leftW, demoH, 8).fillAndStroke("#0f172a", "#1e293b");
    doc.fillColor("#a855f7").fontSize(9).font("Helvetica-Bold").text("AUDIENCE DEMOGRAPHICS & REACH", mLeft + 12, leftY + 11);

    const demoBoxW = (leftW - 24 - 6) / 2;

    // Age Split Box
    doc.roundedRect(mLeft + 12, leftY + 28, demoBoxW, 44, 6).fillAndStroke("#090d16", "#1e293b");
    doc.fillColor("#64748b").fontSize(7).font("Helvetica").text("PRIMARY AGE GROUP", mLeft + 18, leftY + 35);
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text(topAge, mLeft + 18, leftY + 49);

    // Gender Split Box
    doc.roundedRect(mLeft + 12 + demoBoxW + 6, leftY + 28, demoBoxW, 44, 6).fillAndStroke("#090d16", "#1e293b");
    doc.fillColor("#64748b").fontSize(7).font("Helvetica").text("GENDER SPLIT", mLeft + 18 + demoBoxW + 6, leftY + 35);
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text(topGender, mLeft + 18 + demoBoxW + 6, leftY + 49);

    // Top Locations Full Box
    doc.roundedRect(mLeft + 12, leftY + 80, leftW - 24, 48, 6).fillAndStroke("#090d16", "#1e293b");
    doc.fillColor("#64748b").fontSize(7).font("Helvetica").text("TOP AUDIENCE CITIES", mLeft + 18, leftY + 87);
    doc.fillColor("#38bdf8").fontSize(9.5).font("Helvetica-Bold").text(topCities, mLeft + 18, leftY + 102, { width: leftW - 36, ellipsis: true });

    leftY += demoH + 10;

    // COLLABORATION TYPES & PERKS CARD
    const delH = 100;
    doc.roundedRect(mLeft, leftY, leftW, delH, 8).fillAndStroke("#0f172a", "#1e293b");
    doc.fillColor("#10b981").fontSize(9).font("Helvetica-Bold").text("CAMPAIGN CAPABILITIES & DELIVERABLES", mLeft + 12, leftY + 11);

    const deliverables = [
      "✓ Dedicated 60s Reel / Short with Product Placement",
      "✓ Integrated Brand Mention + High-CTR Bio Link",
      "✓ 24-hr Multi-Slide Instagram Story Series with Polls",
      "✓ Full Whitelisting & Digital Ad Usage Rights Available",
    ];

    let delY = leftY + 28;
    deliverables.forEach((item) => {
      doc.fillColor("#cbd5e1").fontSize(7.5).font("Helvetica").text(item, mLeft + 12, delY);
      delY += 16;
    });

    // --- RIGHT COLUMN ---
    let rightY = curY;

    // VERIFIED SOCIAL CHANNELS CARD
    const socCardH = 185;
    doc.roundedRect(rightX, rightY, rightW, socCardH, 8).fillAndStroke("#0f172a", "#1e293b");
    doc.fillColor("#38bdf8").fontSize(9).font("Helvetica-Bold").text("VERIFIED CHANNELS", rightX + 12, rightY + 11);

    let socY = rightY + 28;
    const channels = [];
    if (profile.instagramHandle) {
      channels.push({
        name: "Instagram",
        handle: `@${profile.instagramHandle.replace("@", "")}`,
        stat: `${formatNum(profile.instagramFollowers)} Followers`,
        color: "#ec4899",
      });
    }
    if (profile.youtubeHandle) {
      channels.push({
        name: "YouTube",
        handle: profile.youtubeHandle,
        stat: `${formatNum(profile.youtubeFollowers)} Subscribers`,
        color: "#ef4444",
      });
    }
    if (profile.facebookHandle) {
      channels.push({
        name: "Facebook",
        handle: profile.facebookHandle,
        stat: `${formatNum(profile.facebookFollowers)} Fans`,
        color: "#3b82f6",
      });
    }
    if (profile.twitterHandle) {
      channels.push({
        name: "X (Twitter)",
        handle: `@${profile.twitterHandle.replace("@", "")}`,
        stat: "Active Creator",
        color: "#38bdf8",
      });
    }

    if (channels.length === 0) {
      channels.push({
        name: "Instagram",
        handle: `@${cleanHandle}`,
        stat: `${formatNum(totalFollowers)} Followers`,
        color: "#ec4899",
      });
    }

    channels.slice(0, 3).forEach((ch) => {
      doc.roundedRect(rightX + 12, socY, rightW - 24, 42, 6).fillAndStroke("#090d16", "#1e293b");
      doc.fillColor(ch.color).fontSize(8).font("Helvetica-Bold").text(ch.name, rightX + 18, socY + 8);
      doc.fillColor("#ffffff").fontSize(8.5).font("Helvetica-Bold").text(ch.handle, rightX + 18, socY + 22, { width: rightW - 100, ellipsis: true });
      doc.fillColor("#94a3b8").fontSize(7.5).font("Helvetica").text(ch.stat, rightX + rightW - 105, socY + 16, { width: 85, align: "right" });
      socY += 48;
    });

    rightY += socCardH + 10;

    // PACKAGES & RATE CARD
    const rateCardH = 205;
    doc.roundedRect(rightX, rightY, rightW, rateCardH, 8).fillAndStroke("#0f172a", "#1e293b");
    doc.fillColor("#f59e0b").fontSize(9).font("Helvetica-Bold").text("COMMERCIAL RATE CARD", rightX + 12, rightY + 11);

    let rateY = rightY + 28;
    const sampleTiers = pricingTiers.length > 0 ? pricingTiers : [
      { name: "1x Dedicated Reel (60s)", price: profile.startingPrice || 1500 },
      { name: "1x Story Series (3 Slides)", price: Math.round((profile.startingPrice || 1500) * 0.6) },
      { name: "Reel + Story Bundle", price: Math.round((profile.startingPrice || 1500) * 1.4) },
    ];

    sampleTiers.slice(0, 3).forEach((tier) => {
      doc.roundedRect(rightX + 12, rateY, rightW - 24, 48, 6).fillAndStroke("#090d16", "#1e293b");
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold").text(tier.name, rightX + 18, rateY + 9, { width: rightW - 95, ellipsis: true });
      doc.fillColor("#64748b").fontSize(6.5).font("Helvetica").text("Includes 1 revision & insights report", rightX + 18, rateY + 25);
      doc.fillColor("#38bdf8").fontSize(9.5).font("Helvetica-Bold").text(`INR ${tier.price.toLocaleString("en-IN")}`, rightX + rightW - 90, rateY + 16, { width: 70, align: "right" });
      rateY += 54;
    });

    // 5. FOOTER VERIFICATION STRIP (Pinned at bottom of Page 1)
    const footerY = 800;
    doc.roundedRect(mLeft, footerY, contentW, 24, 6).fillAndStroke("#0f172a", "#1e293b");
    doc.fillColor("#94a3b8").fontSize(7).font("Helvetica").text(
      `Officially audited & verified by Pravixo Marketplace • View live updated rates & book directly at pravixo.com/c/${cleanHandle}`,
      mLeft + 10,
      footerY + 7,
      { width: contentW - 20, align: "center" }
    );

    doc.end();
  } catch (error) {
    console.error("Export Media Kit PDF error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate Media Kit PDF." });
    }
  }
};