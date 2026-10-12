import mongoose from "mongoose";
import crypto from "crypto";

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["creator", "brand", "admin"],
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },

    handle: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    startingPrice: {
      type: Number,
      default: 0,
    },

    isBarterAllowed: {
      type: Boolean,
      default: false,
    },

    avatarUrl: {
      type: String,
      default: "",
    },

    avatar: {
      type: String,
      default: "",
    },

    coverUrl: {
      type: String,
      default: "",
    },

    profileViews: {
      type: Number,
      default: 0,
    },

    clicks: {
      type: Number,
      default: 0,
    },

    bookings: {
      type: Number,
      default: 0,
    },

    instagramHandle: {
      type: String,
      default: "",
    },

    instagramFollowers: {
      type: Number,
      default: 0,
    },

    facebookHandle: {
      type: String,
      default: "",
    },

    facebookFollowers: {
      type: Number,
      default: 0,
    },

    linkedinHandle: {
      type: String,
      default: "",
    },

    linkedinFollowers: {
      type: Number,
      default: 0,
    },

    youtubeHandle: {
      type: String,
      default: "",
    },

    youtubeFollowers: {
      type: Number,
      default: 0,
    },

    quoraHandle: {
      type: String,
      default: "",
    },

    quoraFollowers: {
      type: Number,
      default: 0,
    },

    twitterHandle: {
      type: String,
      default: "",
    },

    twitterFollowers: {
      type: Number,
      default: 0,
    },

    prefNiches: {
      type: String,
      default: "",
    },

    prefBudget: {
      type: String,
      default: "",
    },

    prefReach: {
      type: String,
      default: "",
    },

    prefRegions: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    mediaKitBio: {
      type: String,
      default: "",
    },

    mediaKitTagline: {
      type: String,
      default: "",
    },

    audienceHighlights: {
      topAgeGroup: { type: String, default: "18-24 (45%)" },
      topGender: { type: String, default: "Female (62%)" },
      topLocations: { type: String, default: "Mumbai, Delhi, Bangalore" },
      avgViewsPerReel: { type: String, default: "45K - 120K" },
    },

    pastBrandsWorkedWith: {
      type: [String],
      default: [],
    },

    customSocialFeeds: [
      {
        platform: {
          type: String,
          enum: ["instagram", "youtube", "facebook", "tiktok", "other"],
          default: "instagram",
        },
        type: {
          type: String,
          enum: ["reel", "post", "short", "video"],
          default: "reel",
        },
        postUrl: {
          type: String,
          trim: true,
          default: "",
        },
        thumbnail: {
          type: String,
          trim: true,
          default: "",
        },
        caption: {
          type: String,
          trim: true,
          default: "",
        },
        badge: {
          type: String,
          trim: true,
          default: "Viral Reel",
        },
        likes: {
          type: String,
          default: "10K",
        },
        comments: {
          type: String,
          default: "250",
        },
        views: {
          type: String,
          default: "50K",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    companySize: {
      type: String,
      default: "",
    },

    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
    },

    isSuspended: {
      type: Boolean,
      default: false,
    },

    suspensionReason: {
      type: String,
      default: "",
    },

    suspendedUntil: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deleteReason: {
      type: String,
      default: "",
    },

    gstNumber: {
      type: String,
      default: "",
    },

    gstCertificateStorageId: {
      type: String,
      default: "",
    },

    gstCertificateUrl: {
      type: String,
      default: "",
    },

    aadharStorageId: {
      type: String,
      default: "",
    },

    panStorageId: {
      type: String,
      default: "",
    },

    aadharUrl: {
      type: String,
      default: "",
    },

    panUrl: {
      type: String,
      default: "",
    },

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    referral_code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
      index: true,
    },

    referred_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
      index: true,
    },

    referred_at: {
      type: Date,
      default: null,
    },

    referralCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    emailNotificationsEnabled: {
      type: Boolean,
      default: true,
    },

    unsubscribeToken: {
      type: String,
      default: () => crypto.randomBytes(24).toString("hex"),
    },
  },
  {
    timestamps: true,
  }
);

profileSchema.index({ role: 1 });
profileSchema.index({ email: 1 });

profileSchema.index({
  fullName: "text",
  handle: "text",
  category: "text",
});

// =========================================================================
// AUTOMATIC FULL SUPABASE POSTGRESQL SYNC HOOK
// Whenever any profile is created/saved in MongoDB, immediately sync to PostgreSQL
// =========================================================================
profileSchema.post("save", async function (doc) {
  try {
    const { query } = await import("../config/postgres.js");
    await query(
      `
      INSERT INTO profiles (
        user_id, full_name, email, password, role, gender, handle,
        category, phone, location, bio, starting_price, is_barter_allowed,
        avatar_url, cover_url, profile_views, clicks, bookings,
        instagram_handle, instagram_followers, facebook_handle, facebook_followers,
        linkedin_handle, linkedin_followers, youtube_handle, youtube_followers,
        quora_handle, quora_followers, twitter_handle, twitter_followers,
        custom_social_feeds, custom_pricing_packages, social_links,
        verification_status, kyc_documents, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29, $30,
        $31, $32, $33,
        $34, $35, $36
      )
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        handle = EXCLUDED.handle,
        role = EXCLUDED.role,
        avatar_url = EXCLUDED.avatar_url,
        starting_price = EXCLUDED.starting_price,
        instagram_handle = EXCLUDED.instagram_handle,
        instagram_followers = EXCLUDED.instagram_followers,
        custom_social_feeds = EXCLUDED.custom_social_feeds,
        custom_pricing_packages = EXCLUDED.custom_pricing_packages,
        social_links = EXCLUDED.social_links,
        updated_at = NOW();
      `,
      [
        doc.userId || `usr_${doc._id}`,
        doc.fullName || "User",
        doc.email || `user_${doc._id}@pravixo.com`,
        doc.password || "hashed_pass_placeholder",
        doc.role || "creator",
        doc.gender || "",
        doc.handle || "",
        doc.category || "",
        doc.phone || "",
        doc.location || "",
        doc.bio || "",
        doc.startingPrice || 0,
        !!doc.isBarterAllowed,
        doc.avatarUrl || doc.avatar || "",
        doc.coverUrl || "",
        doc.profileViews || 0,
        doc.clicks || 0,
        doc.bookings || 0,
        doc.instagramHandle || "",
        doc.instagramFollowers || 0,
        doc.facebookHandle || "",
        doc.facebookFollowers || 0,
        doc.linkedinHandle || "",
        doc.linkedinFollowers || 0,
        doc.youtubeHandle || "",
        doc.youtubeFollowers || 0,
        doc.quoraHandle || "",
        doc.quoraFollowers || 0,
        doc.twitterHandle || "",
        doc.twitterFollowers || 0,
        JSON.stringify(doc.customSocialFeeds || []),
        JSON.stringify(doc.customPricingPackages || []),
        JSON.stringify(doc.socialLinks || {}),
        doc.verificationStatus || "unverified",
        JSON.stringify(doc.kycDocuments || []),
        doc.isActive !== false,
      ]
    );
    console.log(`[Supabase Auto-Sync] Profile ${doc.email} synchronized to PostgreSQL.`);
  } catch (syncErr) {
    console.warn(`[Supabase Auto-Sync Error for ${doc.email}]:`, syncErr.message);
  }
});

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;