import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/postgres.js";
import { getUniqueReferralCode } from "../utils/referralCode.js";

// ================================
// REGISTER
// POST /api/auth/register
// ================================
export const registerController = async (req, res) => {
  try {
    console.log("=========================================");
    console.log("REGISTER REQUEST:", req.body);
    console.log("=========================================");

    const { name, fullName, email, password, role, gender, avatarUrl } = req.body;

    const finalName = (fullName || name || "").trim();
    const finalGender = ["male", "female", "other"].includes(gender?.toLowerCase())
      ? gender.toLowerCase()
      : "";

    if (!finalName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Name, email, password and role are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!["creator", "brand"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    // CHECK EXISTING USER in Supabase PostgreSQL
    const existingResult = await query(
      "SELECT id FROM profiles WHERE email = $1",
      [normalizedEmail]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists. Please sign in.",
      });
    }

    // CHECK VERIFIED OTP in Supabase PostgreSQL
    const verifiedOtpResult = await query(
      "SELECT id FROM otps WHERE email = $1 AND verified = true ORDER BY created_at DESC LIMIT 1",
      [normalizedEmail]
    );

    if (verifiedOtpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before registering.",
      });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // USER ID
    const userId = `user_${Buffer.from(normalizedEmail).toString("base64").replace(/=/g, "")}`;

    // REFERRAL CODE for creators
    let creatorReferralCode = "";
    if (role === "creator") {
      creatorReferralCode = await getUniqueReferralCode();
    }

    // DEFAULT AVATAR
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

    // CREATE PROFILE in Supabase PostgreSQL
    const insertResult = await query(
      `INSERT INTO profiles (
        user_id, full_name, email, password, role, gender,
        avatar_url, verification_status, referral_code, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, user_id, full_name, email, role, gender, avatar_url, verification_status, referral_code, created_at, updated_at`,
      [
        userId,
        finalName,
        normalizedEmail,
        hashedPassword,
        role,
        finalGender,
        initialAvatar,
        "pending",
        creatorReferralCode || null,
        true,
      ]
    );

    const profile = insertResult.rows[0];

    // PROCESS REFERRAL
    const incomingRefCode = req.body.referralCode || req.body.ref;
    if (incomingRefCode && role === "creator") {
      try {
        const { recordReferralOnSignup } = await import("../services/referralService.js");
        await recordReferralOnSignup({
          referralCode: incomingRefCode,
          newCreatorProfile: { _id: profile.id, ...profile },
        });
      } catch (refErr) {
        console.error("[Register] Error recording referral:", refErr);
      }
    }

    // CREATE WELCOME NOTIFICATION in Supabase
    try {
      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          profile.id,
          profile.id,
          "admin_broadcast",
          `Welcome to Pravixo, ${finalName}! Thank you for creating your account. You have been granted a complimentary 3-Month Pro Plan! Explore, connect, and elevate your collaboration journey.`,
          role === "brand" ? "/dashboard/customer" : "/dashboard/influencer",
          JSON.stringify({ welcome: true, role }),
          Date.now(),
        ]
      );
    } catch (notifErr) {
      console.error("[Register] Error creating welcome notification:", notifErr);
    }

    // DELETE OTP after registration
    await query("DELETE FROM otps WHERE email = $1", [normalizedEmail]);

    // JWT
    const token = jwt.sign(
      {
        userId: profile.user_id,
        email: profile.email,
        role: profile.role,
        profileId: profile.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("=========================================");
    console.log("REGISTER SUCCESS");
    console.log("PROFILE ID:", profile.id);
    console.log("USER ID:", profile.user_id);
    console.log("EMAIL:", profile.email);
    console.log("ROLE:", profile.role);
    console.log("=========================================");

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        _id: profile.id,
        userId: profile.user_id,
        email: profile.email,
        role: profile.role,
        fullName: profile.full_name,
      },
      profile: {
        _id: profile.id,
        userId: profile.user_id,
        email: profile.email,
        role: profile.role,
        gender: profile.gender || "",
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        verificationStatus: profile.verification_status,
        referralCode: profile.referral_code,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
    });
  } catch (error) {
    console.error("=========================================");
    console.error("REGISTER ERROR:", error);
    console.error("=========================================");
    return res.status(500).json({ success: false, message: "Registration failed.", error: error.message });
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
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await query(
      "SELECT * FROM profiles WHERE email = $1",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const profile = result.rows[0];

    if (!profile.password) {
      return res.status(401).json({
        success: false,
        message: "Account was created via a different method. Please reset your password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, profile.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const token = jwt.sign(
      {
        userId: profile.user_id,
        email: profile.email,
        role: profile.role,
        profileId: profile.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        _id: profile.id,
        userId: profile.user_id,
        email: profile.email,
        role: profile.role,
        fullName: profile.full_name,
      },
      profile: {
        _id: profile.id,
        userId: profile.user_id,
        email: profile.email,
        role: profile.role,
        gender: profile.gender || "",
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        coverUrl: profile.cover_url,
        verificationStatus: profile.verification_status,
        handle: profile.handle,
        category: profile.category,
        location: profile.location,
        bio: profile.bio,
        startingPrice: profile.starting_price,
        phone: profile.phone,
        profileViews: profile.profile_views,
        clicks: profile.clicks,
        bookings: profile.bookings,
        instagramHandle: profile.instagram_handle,
        instagramFollowers: profile.instagram_followers,
        facebookHandle: profile.facebook_handle,
        facebookFollowers: profile.facebook_followers,
        linkedinHandle: profile.linkedin_handle,
        linkedinFollowers: profile.linkedin_followers,
        youtubeHandle: profile.youtube_handle,
        youtubeFollowers: profile.youtube_followers,
        quoraHandle: profile.quora_handle,
        quoraFollowers: profile.quora_followers,
        twitterHandle: profile.twitter_handle,
        twitterFollowers: profile.twitter_followers,
        website: profile.website,
        companySize: profile.company_size,
        isBarterAllowed: Boolean(profile.is_barter_allowed),
        referralCode: profile.referral_code,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Login failed.", error: error.message });
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
      return res.status(401).json({ success: false, message: "Authentication token is required." });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication token is required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      "SELECT * FROM profiles WHERE id = $1",
      [decoded.profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const profile = result.rows[0];

    return res.status(200).json({
      success: true,
      user: {
        _id: profile.id,
        userId: profile.user_id,
        email: profile.email,
        role: profile.role,
        fullName: profile.full_name,
      },
      profile: {
        _id: profile.id,
        userId: profile.user_id,
        email: profile.email,
        role: profile.role,
        gender: profile.gender || "",
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        coverUrl: profile.cover_url,
        verificationStatus: profile.verification_status,
        handle: profile.handle,
        category: profile.category,
        location: profile.location,
        bio: profile.bio,
        startingPrice: profile.starting_price,
        phone: profile.phone,
        profileViews: profile.profile_views,
        clicks: profile.clicks,
        bookings: profile.bookings,
        instagramHandle: profile.instagram_handle,
        instagramFollowers: profile.instagram_followers,
        facebookHandle: profile.facebook_handle,
        facebookFollowers: profile.facebook_followers,
        linkedinHandle: profile.linkedin_handle,
        linkedinFollowers: profile.linkedin_followers,
        youtubeHandle: profile.youtube_handle,
        youtubeFollowers: profile.youtube_followers,
        quoraHandle: profile.quora_handle,
        quoraFollowers: profile.quora_followers,
        twitterHandle: profile.twitter_handle,
        twitterFollowers: profile.twitter_followers,
        customSocialFeeds: profile.custom_social_feeds || [],
        customPricingPackages: profile.custom_pricing_packages || [],
        socialLinks: profile.social_links || {},
        website: profile.website,
        companySize: profile.company_size,
        isBarterAllowed: Boolean(profile.is_barter_allowed),
        gstNumber: profile.gst_number,
        aadharUrl: profile.aadhar_url,
        panUrl: profile.pan_url,
        referralCode: profile.referral_code,
        referralCount: profile.referral_count || 0,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
    });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return res.status(401).json({ success: false, message: "Invalid or expired authentication token." });
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
      return res.status(400).json({ success: false, message: "Token and new password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    // Find reset token in otps table
    const { createHash } = await import("crypto");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetResult = await query(
      "SELECT * FROM otps WHERE code_hash = $1 ORDER BY created_at DESC LIMIT 1",
      [tokenHash]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired password reset token." });
    }

    const resetRecord = resetResult.rows[0];

    if (new Date() > new Date(resetRecord.expires_at)) {
      await query("DELETE FROM otps WHERE id = $1", [resetRecord.id]);
      return res.status(400).json({ success: false, message: "Reset link has expired. Please request a new one." });
    }

    if (email && resetRecord.email.toLowerCase() !== email.toLowerCase().trim()) {
      return res.status(400).json({ success: false, message: "Reset token does not match the provided email address." });
    }

    // Find profile
    const profileResult = await query(
      "SELECT id FROM profiles WHERE email = $1",
      [resetRecord.email.toLowerCase()]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No account found associated with this email address." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      "UPDATE profiles SET password = $1, updated_at = NOW() WHERE email = $2",
      [hashedPassword, resetRecord.email.toLowerCase()]
    );

    await query("DELETE FROM otps WHERE email = $1", [resetRecord.email.toLowerCase()]);

    return res.status(200).json({ success: true, message: "Password has been reset successfully. You can now log in." });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to reset password.", error: error.message });
  }
};

// ================================
// LOGOUT
// POST/GET /api/auth/logout
// ================================
export const logoutController = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.status(500).json({ success: false, message: "Logout failed." });
  }
};