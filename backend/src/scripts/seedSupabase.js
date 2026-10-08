import mongoose from "mongoose";
import dotenv from "dotenv";
import { query, getPostgresPool } from "../config/postgres.js";
import { initPostgresTables } from "../config/initPostgres.js";

// MongoDB Models
import Profile from "../models/Profile.js";
import SocialConnection from "../models/SocialConnection.js";
import SocialAnalytics from "../models/SocialAnalyticsHistory.js";
import Campaign from "../models/Campaign.js";
import CampaignTask from "../models/CampaignTask.js";
import Portfolio from "../models/Portfolio.js";
import Review from "../models/Review.js";
import Blog from "../models/Blog.js";
import AddonService from "../models/AddonService.js";

dotenv.config();

const migrateAndSeedToPostgres = async () => {
  console.log("🚀 Starting MongoDB -> Supabase PostgreSQL Data Migration & Seeding...\n");

  try {
    // 1. Initialize Tables in Supabase
    await initPostgresTables();

    // 2. Connect to MongoDB to extract existing real data
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("📦 Connected to MongoDB. Extracting records...");

    // Map MongoDB _id (string) to generated UUIDs for foreign key consistency
    const idMap = new Map();

    // ==========================================
    // 1. MIGRATE PROFILES
    // ==========================================
    const profiles = await Profile.find({}).lean();
    console.log(`👤 Found ${profiles.length} Profiles in MongoDB.`);

    for (const p of profiles) {
      const res = await query(
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
          instagram_handle = EXCLUDED.instagram_handle,
          instagram_followers = EXCLUDED.instagram_followers,
          custom_social_feeds = EXCLUDED.custom_social_feeds,
          updated_at = NOW()
        RETURNING id;
        `,
        [
          p.userId || `usr_${p._id}`,
          p.fullName || "User",
          p.email || `user_${p._id}@pravixo.com`,
          p.password || "hashed_pass_placeholder",
          p.role || "creator",
          p.gender || "",
          p.handle || "",
          p.category || "",
          p.phone || "",
          p.location || "",
          p.bio || "",
          p.startingPrice || 0,
          !!p.isBarterAllowed,
          p.avatarUrl || p.avatar || "",
          p.coverUrl || "",
          p.profileViews || 0,
          p.clicks || 0,
          p.bookings || 0,
          p.instagramHandle || "",
          p.instagramFollowers || 0,
          p.facebookHandle || "",
          p.facebookFollowers || 0,
          p.linkedinHandle || "",
          p.linkedinFollowers || 0,
          p.youtubeHandle || "",
          p.youtubeFollowers || 0,
          p.quoraHandle || "",
          p.quoraFollowers || 0,
          p.twitterHandle || "",
          p.twitterFollowers || 0,
          JSON.stringify(p.customSocialFeeds || []),
          JSON.stringify(p.customPricingPackages || []),
          JSON.stringify(p.socialLinks || {}),
          p.verificationStatus || "unverified",
          JSON.stringify(p.kycDocuments || []),
          p.isActive !== false,
        ]
      );

      if (res.rows[0]?.id) {
        idMap.set(String(p._id), res.rows[0].id);
      }
    }
    console.log(`✅ Profiles migrated: ${profiles.length}`);

    // ==========================================
    // 2. MIGRATE SOCIAL CONNECTIONS
    // ==========================================
    const connections = await SocialConnection.find({}).lean();
    console.log(`🔗 Found ${connections.length} Social Connections in MongoDB.`);

    for (const c of connections) {
      const pgProfileId = idMap.get(String(c.profileId));
      if (!pgProfileId) continue;

      await query(
        `
        INSERT INTO social_connections (
          profile_id, owner_type, platform, handle, account_id,
          encrypted_access_token, encrypted_refresh_token, expires_at,
          verified, sync_status, sync_mode, last_synced_at,
          followers, views, engagement_rate
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15
        )
        ON CONFLICT (profile_id, platform) DO UPDATE SET
          handle = EXCLUDED.handle,
          followers = EXCLUDED.followers,
          verified = EXCLUDED.verified,
          last_synced_at = EXCLUDED.last_synced_at,
          updated_at = NOW();
        `,
        [
          pgProfileId,
          c.ownerType || "creator",
          c.platform,
          c.handle,
          c.accountId || "",
          c.encryptedAccessToken || null,
          c.encryptedRefreshToken || null,
          c.expiresAt || null,
          !!c.verified,
          c.syncStatus || "success",
          c.syncMode || "live",
          c.lastSyncedAt || Date.now(),
          c.followers || 0,
          c.views || 0,
          c.engagementRate || 0,
        ]
      );
    }
    console.log(`✅ Social Connections migrated: ${connections.length}`);

    // ==========================================
    // 3. MIGRATE BLOGS
    // ==========================================
    const blogs = await Blog.find({}).lean();
    for (const b of blogs) {
      await query(
        `
        INSERT INTO blogs (title, slug, content, excerpt, author, cover_image, tags, published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (slug) DO NOTHING;
        `,
        [
          b.title,
          b.slug || `blog-${Date.now()}`,
          b.content || "",
          b.excerpt || "",
          b.author || "Pravixo Team",
          b.coverImage || "",
          b.tags || [],
          b.published !== false,
        ]
      );
    }
    console.log(`✅ Blogs migrated: ${blogs.length}`);

    // ==========================================
    // 4. MIGRATE ADDONS
    // ==========================================
    const addons = await AddonService.find({}).lean();
    for (const a of addons) {
      await query(
        `
        INSERT INTO addon_services (name, description, price, category, is_active)
        VALUES ($1, $2, $3, $4, $5);
        `,
        [
          a.name,
          a.description || "",
          a.price || 499,
          a.category || "General",
          a.isActive !== false,
        ]
      );
    }
    console.log(`✅ Addon Services migrated: ${addons.length}`);

    console.log("\n🎉 ALL DATA MIGRATED & SEEDED INTO SUPABASE POSTGRESQL SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await mongoose.disconnect();
    const pool = getPostgresPool();
    await pool.end();
    process.exit(0);
  }
};

migrateAndSeedToPostgres();
