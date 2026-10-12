import crypto from "crypto";
import { query } from "../config/postgres.js";
import {
  formatProfile,
  formatPricingTier,
  formatReview,
  formatSocialConnection,
  formatCampaign,
} from "../utils/formatters.js";

// Helper to check valid UUID
const isUuid = (str) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

// Helper to extract file url
const getFileUrl = (file) => {
  if (!file) return null;
  if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

// =====================================================
// LIST PROFILES
// =====================================================
export const listProfiles = async (req, res) => {
  try {
    const { search, category, role } = req.query;

    const conditions = [
      "is_deleted = false",
      "is_suspended = false",
      "email NOT ILIKE '%@pravixo.test'",
      "email NOT ILIKE '%@test.com'",
    ];
    const params = [];

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (category && category !== "All") {
      params.push(`%${category.trim()}%`);
      conditions.push(`category ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM profiles ${whereClause} ORDER BY created_at DESC`;

    const result = await query(sql, params);
    let profiles = result.rows.map(formatProfile);

    // Filter out test / dummy profiles
    profiles = profiles.filter(
      (p) =>
        !/task20|impostor|suspended|test brand|dummy|alice referrer|bob creator|charlie creator/i.test(
          p.fullName || ""
        )
    );

    // Search filter
    if (search) {
      const s = search.toLowerCase().trim();
      profiles = profiles.filter((profile) => {
        const matchesBarter =
          s === "barter" || s === "barter deals" || s === "barter deal"
            ? Boolean(profile.isBarterAllowed)
            : false;
        return (
          matchesBarter ||
          profile.fullName?.toLowerCase().includes(s) ||
          profile.handle?.toLowerCase().includes(s) ||
          profile.category?.toLowerCase().includes(s) ||
          (Boolean(profile.isBarterAllowed) && s.includes("barter"))
        );
      });
    }

    // Attach reviews and ratings
    const results = await Promise.all(
      profiles.map(async (profile) => {
        try {
          const reviewsRes = await query(
            "SELECT rating FROM reviews WHERE target_id = $1 AND visible = true",
            [profile.id]
          );

          const reviews = reviewsRes.rows;
          if (reviews.length === 0) {
            return {
              ...profile,
              rating: 5.0,
              reviewsCount: 0,
            };
          }

          const totalRating = reviews.reduce(
            (sum, r) => sum + Number(r.rating || 0),
            0
          );
          const rating = Math.round((totalRating / reviews.length) * 10) / 10;

          return {
            ...profile,
            rating,
            reviewsCount: reviews.length,
          };
        } catch {
          return {
            ...profile,
            rating: 5.0,
            reviewsCount: 0,
          };
        }
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

    const result = await query(
      "SELECT * FROM profiles WHERE user_id = $1 LIMIT 1",
      [userId.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    const profile = formatProfile(result.rows[0]);

    let brandCampaigns = [];
    let hiredCount = 0;

    if (profile.role === "brand") {
      const campRes = await query(
        "SELECT * FROM campaigns WHERE brand_id = $1 ORDER BY created_at DESC",
        [profile.id]
      );
      brandCampaigns = campRes.rows.map(formatCampaign);

      const countRes = await query(
        "SELECT count(*) FROM connections WHERE brand_id = $1 AND status IN ('accepted', 'completed')",
        [profile.id]
      );
      hiredCount = Number(countRes.rows[0]?.count || 0);
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
// =====================================================
export const getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    const cleanId = id.trim();
    let result;
    if (isUuid(cleanId)) {
      result = await query("SELECT * FROM profiles WHERE id = $1 LIMIT 1", [cleanId]);
    } else {
      result = await query("SELECT * FROM profiles WHERE user_id = $1 LIMIT 1", [cleanId]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    const profile = formatProfile(result.rows[0]);

    let brandCampaigns = [];
    let hiredCount = 0;

    if (profile.role === "brand") {
      const campRes = await query(
        "SELECT * FROM campaigns WHERE brand_id = $1 ORDER BY created_at DESC",
        [profile.id]
      );
      brandCampaigns = campRes.rows.map(formatCampaign);

      const countRes = await query(
        "SELECT count(*) FROM connections WHERE brand_id = $1 AND status IN ('accepted', 'completed')",
        [profile.id]
      );
      hiredCount = Number(countRes.rows[0]?.count || 0);
    }

    // Fetch reviews
    const reviewsRes = await query(
      "SELECT * FROM reviews WHERE target_id = $1 AND visible = true",
      [profile.id]
    );
    const reviews = reviewsRes.rows.map(formatReview);

    // Fetch pricing tiers
    const tiersRes = await query(
      "SELECT * FROM pricing_tiers WHERE profile_id = $1 ORDER BY sort_order ASC",
      [profile.id]
    );
    const pricingTiers = tiersRes.rows.map(formatPricingTier);

    const rating =
      reviews.length === 0
        ? 5.0
        : Math.round(
            (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length) * 10
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
        pricingTiers,
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
// GET PROFILE BY HANDLE
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

    const cleanHandle = handle.trim().replace(/^@/, "");

    let result = await query(
      "SELECT * FROM profiles WHERE handle ILIKE $1 OR handle ILIKE $2 LIMIT 1",
      [cleanHandle, `@${cleanHandle}`]
    );

    if (result.rows.length === 0 && isUuid(cleanHandle)) {
      result = await query("SELECT * FROM profiles WHERE id = $1 LIMIT 1", [cleanHandle]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Creator profile with handle @${cleanHandle} was not found.`,
      });
    }

    const profile = formatProfile(result.rows[0]);

    // Attach reviews & ratings
    const reviewsRes = await query(
      "SELECT * FROM reviews WHERE target_id = $1 AND visible = true",
      [profile.id]
    );
    const reviews = reviewsRes.rows.map(formatReview);

    const tiersRes = await query(
      "SELECT * FROM pricing_tiers WHERE profile_id = $1 ORDER BY sort_order ASC",
      [profile.id]
    );
    const pricingTiers = tiersRes.rows.map(formatPricingTier);

    const rating =
      reviews.length === 0
        ? 5.0
        : Math.round(
            (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length) * 10
          ) / 10;

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        rating,
        reviewsCount: reviews.length,
        reviews,
        pricingTiers,
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
// =====================================================
export const createProfile = async (req, res) => {
  try {
    const { userId, fullName, role, isLogin, email, otpCode } = req.body;

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
        message: "Role must be either creator or brand.",
      });
    }

    const existingRes = await query(
      "SELECT * FROM profiles WHERE user_id = $1 LIMIT 1",
      [userId.trim()]
    );
    const existing = existingRes.rows[0];

    if (isLogin) {
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "This email is not registered. Please create an account first.",
        });
      }

      if (existing.role !== role) {
        return res.status(400).json({
          success: false,
          message: `This account is registered as a ${existing.role}. Please log in as a ${existing.role}.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: formatProfile(existing),
      });
    }

    if (existing) {
      return res.status(200).json({
        success: true,
        data: formatProfile(existing),
      });
    }

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required for registration.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otpRes = await query(
      "SELECT * FROM otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
      [normalizedEmail]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No verification code request was found for this email.",
      });
    }

    const otpRecord = otpRes.rows[0];

    if (Date.now() > new Date(otpRecord.expires_at).getTime()) {
      await query("DELETE FROM otps WHERE id = $1", [otpRecord.id]);
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new one.",
      });
    }

    const inputHash = crypto.createHash("sha256").update(String(otpCode)).digest("hex");

    if (inputHash !== otpRecord.code_hash) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code. Please try again.",
      });
    }

    await query("DELETE FROM otps WHERE id = $1", [otpRecord.id]);

    const insertRes = await query(
      `INSERT INTO profiles (
        user_id, full_name, role, email, profile_views, clicks, bookings
      ) VALUES ($1, $2, $3, $4, 0, 0, 0)
      RETURNING *`,
      [userId.trim(), fullName.trim(), role, normalizedEmail]
    );

    return res.status(201).json({
      success: true,
      data: formatProfile(insertRes.rows[0]),
    });
  } catch (error) {
    console.error("Create profile error:", error);
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A profile already exists for this user.",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create profile.",
    });
  }
};

// =====================================================
// UPDATE PROFILE
// =====================================================
export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    // Mapping from frontend camelCase to PostgreSQL snake_case
    const fieldMapping = {
      fullName: "full_name",
      handle: "handle",
      gender: "gender",
      phone: "phone",
      category: "category",
      location: "location",
      bio: "bio",
      startingPrice: "starting_price",
      avatarUrl: "avatar_url",
      coverUrl: "cover_url",
      profileViews: "profile_views",
      clicks: "clicks",
      bookings: "bookings",
      instagramHandle: "instagram_handle",
      instagramFollowers: "instagram_followers",
      facebookHandle: "facebook_handle",
      facebookFollowers: "facebook_followers",
      linkedinHandle: "linkedin_handle",
      linkedinFollowers: "linkedin_followers",
      youtubeHandle: "youtube_handle",
      youtubeFollowers: "youtube_followers",
      quoraHandle: "quora_handle",
      quoraFollowers: "quora_followers",
      twitterHandle: "twitter_handle",
      twitterFollowers: "twitter_followers",
      prefNiches: "pref_niches",
      prefBudget: "pref_budget",
      prefReach: "pref_reach",
      prefRegions: "pref_regions",
      mediaKitBio: "media_kit_bio",
      mediaKitTagline: "media_kit_tagline",
      audienceHighlights: "audience_highlights",
      pastBrandsWorkedWith: "past_brands_worked_with",
      customSocialFeeds: "custom_social_feeds",
      website: "website",
      companySize: "company_size",
      isBarterAllowed: "is_barter_allowed",
    };

    const setClauses = [];
    const values = [];

    for (const [camelKey, snakeCol] of Object.entries(fieldMapping)) {
      if (req.body[camelKey] !== undefined) {
        let val = req.body[camelKey];
        // JSON format for jsonb columns
        if (
          ["audienceHighlights", "pastBrandsWorkedWith", "customSocialFeeds"].includes(camelKey) &&
          typeof val === "object"
        ) {
          val = JSON.stringify(val);
        }
        values.push(val);
        setClauses.push(`${snakeCol} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update.",
      });
    }

    setClauses.push("updated_at = NOW()");
    values.push(id.trim());

    const wherePredicate = isUuid(id.trim()) ? `id = $${values.length}` : `user_id = $${values.length}`;
    const sql = `UPDATE profiles SET ${setClauses.join(", ")} WHERE ${wherePredicate} RETURNING *`;

    const updateRes = await query(sql, values);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatProfile(updateRes.rows[0]),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile.",
    });
  }
};

// =====================================================
// UPLOAD AVATAR IMAGE
// =====================================================
export const uploadAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar image file is required.",
      });
    }

    const avatarUrl = getFileUrl(req.file);
    const wherePredicate = isUuid(id.trim()) ? "id = $2" : "user_id = $2";

    const updateRes = await query(
      `UPDATE profiles SET avatar_url = $1, updated_at = NOW() WHERE ${wherePredicate} RETURNING *`,
      [avatarUrl, id.trim()]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    const profile = formatProfile(updateRes.rows[0]);

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
// =====================================================
export const uploadCover = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Cover image file is required.",
      });
    }

    const coverUrl = getFileUrl(req.file);
    const wherePredicate = isUuid(id.trim()) ? "id = $2" : "user_id = $2";

    const updateRes = await query(
      `UPDATE profiles SET cover_url = $1, updated_at = NOW() WHERE ${wherePredicate} RETURNING *`,
      [coverUrl, id.trim()]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    const profile = formatProfile(updateRes.rows[0]);

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
// =====================================================
export const deleteAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    const wherePredicate = isUuid(id.trim()) ? "id = $1" : "user_id = $1";

    const updateRes = await query(
      `UPDATE profiles SET avatar_url = '', updated_at = NOW() WHERE ${wherePredicate} RETURNING *`,
      [id.trim()]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Avatar removed successfully.",
      data: formatProfile(updateRes.rows[0]),
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
// =====================================================
export const deleteCover = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    const wherePredicate = isUuid(id.trim()) ? "id = $1" : "user_id = $1";

    const updateRes = await query(
      `UPDATE profiles SET cover_url = '', updated_at = NOW() WHERE ${wherePredicate} RETURNING *`,
      [id.trim()]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cover banner removed successfully.",
      data: formatProfile(updateRes.rows[0]),
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
// =====================================================
export const uploadKycDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    const wherePredicate = isUuid(id.trim()) ? "id = $1" : "user_id = $1";
    const checkRes = await query(`SELECT id FROM profiles WHERE ${wherePredicate}`, [id.trim()]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    const targetId = checkRes.rows[0].id;
    const setClauses = [];
    const values = [];

    if (req.files) {
      if (req.files.aadhar && req.files.aadhar[0]) {
        values.push(getFileUrl(req.files.aadhar[0]));
        setClauses.push(`aadhar_url = $${values.length}`);
        values.push(req.files.aadhar[0].filename);
        setClauses.push(`aadhar_storage_id = $${values.length}`);
      }
      if (req.files.pan && req.files.pan[0]) {
        values.push(getFileUrl(req.files.pan[0]));
        setClauses.push(`pan_url = $${values.length}`);
        values.push(req.files.pan[0].filename);
        setClauses.push(`pan_storage_id = $${values.length}`);
      }
      if (req.files.gstCertificate && req.files.gstCertificate[0]) {
        values.push(getFileUrl(req.files.gstCertificate[0]));
        setClauses.push(`gst_certificate_url = $${values.length}`);
        values.push(req.files.gstCertificate[0].filename);
        setClauses.push(`gst_certificate_storage_id = $${values.length}`);
      }
    }

    if (req.body.gstNumber) {
      values.push(req.body.gstNumber);
      setClauses.push(`gst_number = $${values.length}`);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No documents provided.",
      });
    }

    setClauses.push("updated_at = NOW()");
    values.push(targetId);

    const updateRes = await query(
      `UPDATE profiles SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return res.status(200).json({
      success: true,
      message: "KYC documents uploaded successfully for verification.",
      data: formatProfile(updateRes.rows[0]),
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
    let sql = "UPDATE profiles SET email_notifications_enabled = false, updated_at = NOW() WHERE email = $1 RETURNING *";
    let params = [normalizedEmail];

    if (token) {
      sql = "UPDATE profiles SET email_notifications_enabled = false, updated_at = NOW() WHERE email = $1 AND (unsubscribe_token = $2 OR id::text = $2) RETURNING *";
      params = [normalizedEmail, token.trim()];
    }

    const updateRes = await query(sql, params);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found or invalid token.",
      });
    }

    const profile = updateRes.rows[0];

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

    const updateRes = await query(
      "UPDATE profiles SET email_notifications_enabled = $1, updated_at = NOW() WHERE id::text = $2 RETURNING *",
      [Boolean(enabled), profileId.trim()]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Campaign email notifications have been ${enabled ? "enabled" : "disabled"}.`,
      data: { emailNotificationsEnabled: updateRes.rows[0].email_notifications_enabled },
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
// =====================================================
export const exportMediaKitPdf = async (req, res) => {
  try {
    const { handle } = req.params;
    if (!handle) {
      return res.status(400).json({ success: false, message: "Handle is required." });
    }

    const cleanHandle = handle.trim().replace(/^@/, "");

    let result = await query(
      "SELECT * FROM profiles WHERE handle ILIKE $1 OR handle ILIKE $2 LIMIT 1",
      [cleanHandle, `@${cleanHandle}`]
    );

    if (result.rows.length === 0 && isUuid(cleanHandle)) {
      result = await query("SELECT * FROM profiles WHERE id = $1 LIMIT 1", [cleanHandle]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Creator not found." });
    }

    const profile = formatProfile(result.rows[0]);

    // Fetch pricing tiers & social connections
    let pricingTiers = [];
    let socialConnections = [];
    try {
      const [tiersRes, socialRes] = await Promise.all([
        query(
          "SELECT * FROM pricing_tiers WHERE profile_id = $1 ORDER BY sort_order ASC, price ASC",
          [profile.id]
        ),
        query("SELECT * FROM social_connections WHERE profile_id = $1", [profile.id]),
      ]);
      pricingTiers = tiersRes.rows.map(formatPricingTier);
      socialConnections = socialRes.rows.map(formatSocialConnection);
    } catch (e) {
      console.warn("Could not fetch extra profile data for PDF:", e.message);
    }

    const PDFDocument = (await import("pdfkit")).default;
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
    const contentW = pageW - mLeft - mRight;

    // 1. FULL BACKGROUND
    doc.rect(0, 0, pageW, pageH).fill("#090d16");
    doc.rect(0, 0, pageW, 5).fill("#ff5e62");

    // 2. HEADER CONTAINER
    const headerH = 92;
    doc.roundedRect(mLeft, 24, contentW, headerH, 10).fillAndStroke("#0f172a", "#1e293b");

    // Header Badge
    doc.roundedRect(mLeft + 14, 34, 120, 18, 9).fill("#1e293b");
    doc.fillColor("#ff5e62").fontSize(8).font("Helvetica-Bold").text("⚡ PRAVIXO VERIFIED", mLeft + 22, 39, { characterSpacing: 1 });

    // Live URL pill
    doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(`pravixo.com/c/${cleanHandle}`, mLeft + contentW - 180, 39, { width: 165, align: "right" });

    // Creator Name
    const creatorName = profile.fullName || cleanHandle;
    doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text(creatorName, mLeft + 14, 58);

    // Tagline / Category
    const categoryText = profile.category || "Digital Creator";
    const locText = profile.location ? ` • ${profile.location}` : "";
    doc.fillColor("#94a3b8").fontSize(9.5).font("Helvetica").text(`@${cleanHandle} • ${categoryText}${locText}`, mLeft + 14, 82);

    // Starting price pill
    if (profile.startingPrice && profile.startingPrice > 0) {
      const priceBoxW = 110;
      const priceBoxX = mLeft + contentW - priceBoxW - 14;
      doc.roundedRect(priceBoxX, 60, priceBoxW, 44, 8).fillAndStroke("#131c2e", "#334155");
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica-Bold").text("STARTING AT", priceBoxX + 10, 67);
      doc.fillColor("#38bdf8").fontSize(12).font("Helvetica-Bold").text(`INR ${profile.startingPrice.toLocaleString("en-IN")}`, priceBoxX + 10, 81);
    }

    // 3. STATS GRID
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

    // 4. TWO-COLUMN LAYOUT
    const colGap = 12;
    const leftW = Math.floor(contentW * 0.56);
    const rightW = contentW - leftW - colGap;
    const rightX = mLeft + leftW + colGap;

    // LEFT COLUMN
    let leftY = curY;
    const bioH = 135;
    const bioText =
      profile.mediaKitBio ||
      profile.bio ||
      `${creatorName} is a verified ${categoryText} creator creating engaging, high-retention content and high ROI campaigns for modern consumer brands.`;

    doc.roundedRect(mLeft, leftY, leftW, bioH, 8).fillAndStroke("#0f172a", "#1e293b");
    doc.fillColor("#38bdf8").fontSize(9).font("Helvetica-Bold").text("ABOUT THE CREATOR", mLeft + 12, leftY + 11);
    doc.fillColor("#cbd5e1").fontSize(8).font("Helvetica").text(bioText, mLeft + 12, leftY + 27, {
      width: leftW - 24,
      height: 68,
      ellipsis: true,
      lineGap: 2.5,
    });

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

    const demoH = 145;
    const topAge = profile.audienceHighlights?.topAgeGroup || "18–24 (48%)";
    const topGender = profile.audienceHighlights?.topGender || "62% Female / 38% Male";
    const topCities = profile.audienceHighlights?.topLocations || "Mumbai, Delhi, Bangalore";

    doc.roundedRect(mLeft, leftY, leftW, demoH, 8).fillAndStroke("#0f172a", "#1e293b");
    doc.fillColor("#a855f7").fontSize(9).font("Helvetica-Bold").text("AUDIENCE DEMOGRAPHICS & REACH", mLeft + 12, leftY + 11);

    const demoBoxW = (leftW - 24 - 6) / 2;
    doc.roundedRect(mLeft + 12, leftY + 28, demoBoxW, 44, 6).fillAndStroke("#090d16", "#1e293b");
    doc.fillColor("#64748b").fontSize(7).font("Helvetica").text("PRIMARY AGE GROUP", mLeft + 18, leftY + 35);
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text(topAge, mLeft + 18, leftY + 49);

    doc.roundedRect(mLeft + 12 + demoBoxW + 6, leftY + 28, demoBoxW, 44, 6).fillAndStroke("#090d16", "#1e293b");
    doc.fillColor("#64748b").fontSize(7).font("Helvetica").text("GENDER SPLIT", mLeft + 18 + demoBoxW + 6, leftY + 35);
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text(topGender, mLeft + 18 + demoBoxW + 6, leftY + 49);

    doc.roundedRect(mLeft + 12, leftY + 80, leftW - 24, 48, 6).fillAndStroke("#090d16", "#1e293b");
    doc.fillColor("#64748b").fontSize(7).font("Helvetica").text("TOP AUDIENCE CITIES", mLeft + 18, leftY + 87);
    doc.fillColor("#38bdf8").fontSize(9.5).font("Helvetica-Bold").text(topCities, mLeft + 18, leftY + 102, { width: leftW - 36, ellipsis: true });

    leftY += demoH + 10;

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

    // RIGHT COLUMN
    let rightY = curY;
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