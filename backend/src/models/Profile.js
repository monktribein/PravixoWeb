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

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;