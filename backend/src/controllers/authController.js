import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Profile from "../models/Profile.js";
import Otp from "../models/Otp.js";
import ResetToken from "../models/ResetToken.js";
import Notification from "../models/Notification.js";
import SubscriptionPackage from "../models/SubscriptionPackage.js";
import UserSubscription from "../models/UserSubscription.js";
import { getUniqueReferralCode } from "../utils/referralCode.js";
import { recordReferralOnSignup } from "../services/referralService.js";

export const registerController = async (req, res) => {
  try {
    console.log("=========================================");
    console.log("REGISTER REQUEST:", req.body);
    console.log("=========================================");

    const {
      name,
      fullName,
      email,
      password,
      role,
      gender,
      avatarUrl,
    } = req.body;

    const finalName = (fullName || name || "").trim();
    const finalGender = ["male", "female", "other"].includes(gender?.toLowerCase())
      ? gender.toLowerCase()
      : "";

    if (!finalName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!["creator", "brand"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // CHECK EXISTING USER
    const existingProfile = await Profile.findOne({
      email: normalizedEmail,
    });

    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message:
          "An account with this email already exists. Please sign in.",
      });
    }

    // CHECK VERIFIED OTP
    const verifiedOtp = await Otp.findOne({
      email: normalizedEmail,
      verified: true,
    }).sort({
      createdAt: -1,
    });

    if (!verifiedOtp) {
      return res.status(400).json({
        success: false,
        message:
          "Please verify your email before registering.",
      });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // USER ID
    const userId =
      `user_${Buffer.from(normalizedEmail)
        .toString("base64")
        .replace(/=/g, "")}`;

    // GENERATE REFERRAL CODE FOR CREATORS
    let creatorReferralCode = "";
    if (role === "creator") {
      creatorReferralCode = await getUniqueReferralCode();
    }

    // DEFAULT GENDER-APPROPRIATE AVATAR
    let initialAvatar = avatarUrl || "";
    if (!initialAvatar) {
      if (finalGender === "female") {
        initialAvatar = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(finalName)}`;
      } else if (finalGender === "male") {
        initialAvatar = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(finalName)}`;
      } else if (role === "brand") {
        initialAvatar = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(finalName)}`;
      } else {
        initialAvatar = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(finalName)}`;
      }
    }

    // CREATE PROFILE
    const profile = await Profile.create({
      userId,
      fullName: finalName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      gender: finalGender,
      avatarUrl: initialAvatar,
      referralCode: creatorReferralCode || undefined,
      verificationStatus: "pending",
    });

    // SYNC NEW PROFILE DIRECTLY TO SUPABASE POSTGRESQL
    try {
      const { query } = await import("../config/postgres.js");
      await query(
        `
        INSERT INTO profiles (
          user_id, full_name, email, password, role, gender, avatar_url, verification_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = NOW();
        `,
        [
          profile.userId || `usr_${profile._id}`,
          profile.fullName,
          profile.email,
          profile.password,
          profile.role,
          profile.gender || "",
          profile.avatarUrl || "",
          profile.verificationStatus || "pending",
        ]
      );
    } catch (pgErr) {
      console.warn("[PostgreSQL Sync Notice]:", pgErr.message);
    }

    // 3-MONTH PRO PACKAGE PROMOTIONAL OFFER FOR NEW USERS
    try {
      let proPackage = await SubscriptionPackage.findOne({ name: /^Pro$/i });
      if (!proPackage) {
        proPackage = await SubscriptionPackage.create({
          name: "Pro",
          price: 999,
          billingPeriod: "year",
          badge: "3 Months Free Trial",
          features: [
            "Campaign Limits: 15/month",
            "Verified Blue Badge & Unlimited Chat",
            "Support Tier: Priority Support",
            "Refer & Earn Income: 7.5%",
            "Complimentary 3-Month Free Welcome for Creators",
            "High Discovery Visibility & Advanced Analytics"
          ],
          sortOrder: 2,
          active: true,
        });
      }

      const threeMonthsInMs = 90 * 24 * 60 * 60 * 1000;
      await UserSubscription.create({
        profileId: profile._id,
        packageId: proPackage._id,
        startDate: Date.now(),
        expiryDate: Date.now() + threeMonthsInMs,
        status: "active",
      });
    } catch (promoErr) {
      console.error("[Register] Error activating 3-month Pro offer:", promoErr);
    }

    // CREATE THANK YOU & WELCOME NOTIFICATION
    try {
      await Notification.create({
        recipientId: profile._id,
        senderId: profile._id,
        type: "admin_broadcast",
        text: `Welcome to Pravixo, ${finalName}! Thank you for creating your account. You have been granted a complimentary 3-Month Pro Plan! Explore, connect, and elevate your collaboration journey.`,
        targetUrl: role === "brand" ? "/dashboard/customer" : "/dashboard/influencer",
        metadata: {
          welcome: true,
          role,
        },
        createdAt: Date.now(),
      });
    } catch (notifErr) {
      console.error("[Register] Error creating welcome notification:", notifErr);
    }

    // PROCESS REFERRAL CODE IF PROVIDED
    const incomingRefCode = req.body.referralCode || req.body.ref;
    if (incomingRefCode && role === "creator") {
      try {
        await recordReferralOnSignup({
          referralCode: incomingRefCode,
          newCreatorProfile: profile,
        });
      } catch (refErr) {
        console.error("[Register] Error recording referral:", refErr);
      }
    }

    // DELETE OTP
    await Otp.deleteMany({
      email: normalizedEmail,
    });

    // JWT
    const token = jwt.sign(
      {
        userId: profile.userId,
        email: profile.email,
        role: profile.role,
        profileId: profile._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    console.log("=========================================");
    console.log("REGISTER SUCCESS");
    console.log("PROFILE MONGO ID:", profile._id);
    console.log("USER ID:", profile.userId);
    console.log("EMAIL:", profile.email);
    console.log("ROLE:", profile.role);
    console.log("NAME:", profile.fullName);
    console.log("=========================================");

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",

      token,

      user: {
        _id: profile._id,
        userId: profile.userId,
        email: profile.email,
        role: profile.role,
        fullName: profile.fullName,
      },

      profile: {
        _id: profile._id,
        userId: profile.userId,
        email: profile.email,
        role: profile.role,
        gender: profile.gender,
        fullName: profile.fullName,
        verificationStatus: profile.verificationStatus,

        handle: profile.handle,
        category: profile.category,
        location: profile.location,
        bio: profile.bio,
        startingPrice: profile.startingPrice,
        phone: profile.phone,

        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,

        profileViews: profile.profileViews,
        clicks: profile.clicks,
        bookings: profile.bookings,

        instagramHandle: profile.instagramHandle,
        instagramFollowers: profile.instagramFollowers,

        facebookHandle: profile.facebookHandle,
        facebookFollowers: profile.facebookFollowers,

        linkedinHandle: profile.linkedinHandle,
        linkedinFollowers: profile.linkedinFollowers,

        youtubeHandle: profile.youtubeHandle,
        youtubeFollowers: profile.youtubeFollowers,

        quoraHandle: profile.quoraHandle,
        quoraFollowers: profile.quoraFollowers,

        twitterHandle: profile.twitterHandle,
        twitterFollowers: profile.twitterFollowers,

        prefNiches: profile.prefNiches,
        prefBudget: profile.prefBudget,
        prefReach: profile.prefReach,
        prefRegions: profile.prefRegions,

        website: profile.website,
        companySize: profile.companySize,
        isBarterAllowed: Boolean(profile.isBarterAllowed),

        gstNumber: profile.gstNumber,
        gstCertificateStorageId:
          profile.gstCertificateStorageId,
        gstCertificateUrl:
          profile.gstCertificateUrl,

        aadharStorageId: profile.aadharStorageId,
        panStorageId: profile.panStorageId,

        aadharUrl: profile.aadharUrl,
        panUrl: profile.panUrl,

        referralCode: profile.referralCode,
        referralCount: profile.referralCount || 0,

        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error("=========================================");
    console.error("REGISTER ERROR:", error);
    console.error("=========================================");

    return res.status(500).json({
      success: false,
      message: "Registration failed.",
      error: error.message,
    });
  }
};



// ================================
// LOGIN
// POST /api/auth/login
// ================================
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const profile = await Profile.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!profile) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!profile.password) {
      return res.status(401).json({
        success: false,
        message: "Account was created via a different method (like Google). Please sign in using that method, or reset your password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      profile.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        userId: profile.userId,
        email: profile.email,
        role: profile.role,
        profileId: profile._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",

      token,

      user: {
        _id: profile._id,
        userId: profile.userId,
        email: profile.email,
        role: profile.role,
        fullName: profile.fullName,
      },

      profile: {
        _id: profile._id,
        userId: profile.userId,
        email: profile.email,
        role: profile.role,
        gender: profile.gender || "",
        fullName: profile.fullName,
        verificationStatus: profile.verificationStatus,

        handle: profile.handle,
        category: profile.category,
        location: profile.location,
        bio: profile.bio,
        startingPrice: profile.startingPrice,
        phone: profile.phone,

        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,

        profileViews: profile.profileViews,
        clicks: profile.clicks,
        bookings: profile.bookings,

        instagramHandle: profile.instagramHandle,
        instagramFollowers: profile.instagramFollowers,

        facebookHandle: profile.facebookHandle,
        facebookFollowers: profile.facebookFollowers,

        linkedinHandle: profile.linkedinHandle,
        linkedinFollowers: profile.linkedinFollowers,

        youtubeHandle: profile.youtubeHandle,
        youtubeFollowers: profile.youtubeFollowers,

        quoraHandle: profile.quoraHandle,
        quoraFollowers: profile.quoraFollowers,

        twitterHandle: profile.twitterHandle,
        twitterFollowers: profile.twitterFollowers,

        prefNiches: profile.prefNiches,
        prefBudget: profile.prefBudget,
        prefReach: profile.prefReach,
        prefRegions: profile.prefRegions,

        website: profile.website,
        companySize: profile.companySize,
        isBarterAllowed: Boolean(profile.isBarterAllowed),

        gstNumber: profile.gstNumber,
        gstCertificateStorageId:
          profile.gstCertificateStorageId,
        gstCertificateUrl:
          profile.gstCertificateUrl,

        aadharStorageId: profile.aadharStorageId,
        panStorageId: profile.panStorageId,

        aadharUrl: profile.aadharUrl,
        panUrl: profile.panUrl,

        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
      error: error.message,
    });
  }
};


// ================================
// GET CURRENT USER
// GET /api/auth/me
// ================================
export const getMeController = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const profile = await Profile.findById(
      decoded.profileId
    ).select("-password");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,

      user: {
        _id: profile._id,
        userId: profile.userId,
        email: profile.email,
        role: profile.role,
        fullName: profile.fullName,
      },

      profile: {
        _id: profile._id,
        userId: profile.userId,
        email: profile.email,
        role: profile.role,
        gender: profile.gender || "",
        fullName: profile.fullName,

        verificationStatus: profile.verificationStatus,

        handle: profile.handle,
        category: profile.category,
        location: profile.location,
        bio: profile.bio,
        startingPrice: profile.startingPrice,
        phone: profile.phone,

        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,

        profileViews: profile.profileViews,
        clicks: profile.clicks,
        bookings: profile.bookings,

        instagramHandle: profile.instagramHandle,
        instagramFollowers: profile.instagramFollowers,

        facebookHandle: profile.facebookHandle,
        facebookFollowers: profile.facebookFollowers,

        linkedinHandle: profile.linkedinHandle,
        linkedinFollowers: profile.linkedinFollowers,

        youtubeHandle: profile.youtubeHandle,
        youtubeFollowers: profile.youtubeFollowers,

        quoraHandle: profile.quoraHandle,
        quoraFollowers: profile.quoraFollowers,

        twitterHandle: profile.twitterHandle,
        twitterFollowers: profile.twitterFollowers,

        prefNiches: profile.prefNiches,
        prefBudget: profile.prefBudget,
        prefReach: profile.prefReach,
        prefRegions: profile.prefRegions,

        website: profile.website,
        companySize: profile.companySize,
        isBarterAllowed: Boolean(profile.isBarterAllowed),

        gstNumber: profile.gstNumber,
        gstCertificateStorageId:
          profile.gstCertificateStorageId,
        gstCertificateUrl:
          profile.gstCertificateUrl,

        aadharStorageId: profile.aadharStorageId,
        panStorageId: profile.panStorageId,

        aadharUrl: profile.aadharUrl,
        panUrl: profile.panUrl,

        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET ME ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

// ================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ================================
export const resetPasswordController = async (req, res) => {
  try {
    const { token, password, email } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // Find the token record
    const resetRecord = await ResetToken.findOne({ token });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    if (new Date() > new Date(resetRecord.expiresAt)) {
      await ResetToken.deleteOne({ _id: resetRecord._id });
      return res.status(400).json({
        success: false,
        message: "Reset link has expired. Please request a new one.",
      });
    }

    if (email && resetRecord.email.toLowerCase() !== email.toLowerCase().trim()) {
      return res.status(400).json({
        success: false,
        message: "Reset token does not match the provided email address.",
      });
    }

    // Find profile by email
    const profile = await Profile.findOne({
      email: resetRecord.email.toLowerCase(),
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "No account found associated with this email address.",
      });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(password, 10);
    profile.password = hashedPassword;
    await profile.save();

    // Consume and delete the token
    await ResetToken.deleteMany({ email: resetRecord.email.toLowerCase() });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password.",
      error: error.message,
    });
  }
};

// ================================
// LOGOUT
// POST/GET /api/auth/logout
// ================================
export const logoutController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed.",
    });
  }
};