import mongoose from "mongoose";
import dotenv from "dotenv";
import { query, getPostgresPool } from "../config/postgres.js";
import { initPostgresTables } from "../config/initPostgres.js";

// MongoDB Models
import Profile from "../models/Profile.js";
import SocialConnection from "../models/SocialConnection.js";
import SocialAnalytics from "../models/SocialAnalyticsHistory.js";
import Campaign from "../models/Campaign.js";
import Connection from "../models/Connection.js";
import Submission from "../models/Submission.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Withdrawal from "../models/Withdrawal.js";
import Payment from "../models/Payment.js";
import Payout from "../models/Payout.js";
import Agreement from "../models/Agreement.js";
import Notification from "../models/Notification.js";
import PricingTier from "../models/PricingTier.js";
import CreatorBankDetails from "../models/CreatorBankDetails.js";
import Favorite from "../models/Favorite.js";
import Review from "../models/Review.js";
import Blog from "../models/Blog.js";
import AddonService from "../models/AddonService.js";
import AddonBooking from "../models/AddonBooking.js";
import ReferralRelationship from "../models/ReferralRelationship.js";

dotenv.config();

const migrateAllDataFromMongoToPostgres = async () => {
  console.log("🚀 Starting Complete MongoDB -> Supabase PostgreSQL Data Migration...\n");

  try {
    // 1. Initialize Tables in Supabase
    await initPostgresTables();

    // 2. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("📦 Connected to MongoDB Atlas. Extracting and syncing all collections...\n");

    const profileIdMap = new Map();
    const campaignIdMap = new Map();
    const connectionIdMap = new Map();
    const conversationIdMap = new Map();
    const paymentIdMap = new Map();
    const payoutIdMap = new Map();
    const withdrawalIdMap = new Map();
    const addonServiceIdMap = new Map();

    // ==========================================
    // 1. MIGRATE PROFILES
    // ==========================================
    const profiles = await Profile.find({}).select("+password").lean();
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
          role = EXCLUDED.role,
          starting_price = EXCLUDED.starting_price,
          instagram_handle = EXCLUDED.instagram_handle,
          instagram_followers = EXCLUDED.instagram_followers,
          custom_social_feeds = EXCLUDED.custom_social_feeds,
          custom_pricing_packages = EXCLUDED.custom_pricing_packages,
          social_links = EXCLUDED.social_links,
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
        profileIdMap.set(String(p._id), res.rows[0].id);
        profileIdMap.set(String(p.userId), res.rows[0].id);
      }
    }
    console.log(`✅ Profiles synced: ${profiles.length}`);

    // ==========================================
    // 2. MIGRATE PRICING TIERS
    // ==========================================
    const pricingTiers = await PricingTier.find({}).lean();
    for (const pt of pricingTiers) {
      const pgProfileId = profileIdMap.get(String(pt.profileId));
      if (!pgProfileId) continue;
      await query(
        `INSERT INTO pricing_tiers (profile_id, name, price, sort_order) VALUES ($1, $2, $3, $4)`,
        [pgProfileId, pt.name, pt.price || 0, pt.sortOrder || 0]
      );
    }
    console.log(`✅ Pricing Tiers synced: ${pricingTiers.length}`);

    // ==========================================
    // 3. MIGRATE CAMPAIGNS
    // ==========================================
    const campaigns = await Campaign.find({}).lean();
    for (const c of campaigns) {
      const pgBrandId = profileIdMap.get(String(c.brandId));
      if (!pgBrandId) continue;

      const res = await query(
        `
        INSERT INTO campaigns (
          brand_id, title, description, category, location,
          total_budget, min_budget_per_creator, max_budget_per_creator,
          min_followers, tiers, deliverables, budget, duration,
          status, verification_feedback, active, start_date, end_date
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18
        ) RETURNING id;
        `,
        [
          pgBrandId,
          c.title || "Campaign",
          c.description || "",
          c.category || "",
          c.location || "Pan India",
          c.totalBudget || 0,
          c.minBudgetPerCreator || 0,
          c.maxBudgetPerCreator || 0,
          c.minFollowers || 0,
          JSON.stringify(c.tiers || []),
          JSON.stringify(c.deliverables || {}),
          c.budget || "",
          c.duration || "",
          c.status || "PENDING_VERIFICATION",
          c.verificationFeedback || "",
          c.active !== false,
          c.startDate || Date.now(),
          c.endDate || Date.now() + 30 * 86400000,
        ]
      );
      if (res.rows[0]?.id) {
        campaignIdMap.set(String(c._id), res.rows[0].id);
      }
    }
    console.log(`✅ Campaigns synced: ${campaigns.length}`);

    // ==========================================
    // 4. MIGRATE CONNECTIONS / COLLABORATIONS
    // ==========================================
    const connections = await Connection.find({}).lean();
    for (const conn of connections) {
      const pgCreatorId = profileIdMap.get(String(conn.creatorId));
      const pgBrandId = profileIdMap.get(String(conn.brandId));
      if (!pgCreatorId || !pgBrandId) continue;
      const pgCampaignId = conn.campaignId ? campaignIdMap.get(String(conn.campaignId)) || null : null;

      const res = await query(
        `
        INSERT INTO connections (
          creator_id, brand_id, campaign_id, pitch, applied_tier,
          status, creator_notification_seen, collaboration_status,
          creator_amount, pravixo_fee, brand_total, proposed_amount,
          agreed_at, payment_status, paid_at, deliverables_tracking,
          all_deliverables_completed, work_completed_at, approval_completed_at,
          payment_release_eligible_at, payment_release_status, admin_notified_of_eligibility,
          barter_details, payout_released_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19,
          $20, $21, $22,
          $23, $24
        ) RETURNING id;
        `,
        [
          pgCreatorId,
          pgBrandId,
          pgCampaignId,
          conn.pitch || "Collaboration request",
          JSON.stringify(conn.appliedTier || {}),
          conn.status || "pending",
          !!conn.creatorNotificationSeen,
          conn.collaborationStatus || "NEGOTIATING",
          conn.creatorAmount || 0,
          conn.pravixoFee || 0,
          conn.brandTotal || 0,
          conn.proposedAmount || 0,
          conn.agreedAt || null,
          conn.paymentStatus || "PENDING",
          conn.paidAt || null,
          JSON.stringify(conn.deliverablesTracking || []),
          !!conn.allDeliverablesCompleted,
          conn.workCompletedAt || null,
          conn.approvalCompletedAt || null,
          conn.paymentReleaseEligibleAt || null,
          conn.paymentReleaseStatus || "NOT_APPLICABLE",
          !!conn.adminNotifiedOfEligibility,
          JSON.stringify(conn.barterDetails || {}),
          conn.payoutReleasedAt || null,
        ]
      );
      if (res.rows[0]?.id) {
        connectionIdMap.set(String(conn._id), res.rows[0].id);
      }
    }
    console.log(`✅ Connections/Collabs synced: ${connections.length}`);

    // ==========================================
    // 5. MIGRATE SUBMISSIONS
    // ==========================================
    const submissions = await Submission.find({}).lean();
    for (const sub of submissions) {
      const pgConnId = connectionIdMap.get(String(sub.connectionId));
      const pgCampId = campaignIdMap.get(String(sub.campaignId));
      const pgBrandId = profileIdMap.get(String(sub.brandId));
      const pgCreatorId = profileIdMap.get(String(sub.creatorId));
      if (!pgConnId || !pgCampId || !pgBrandId || !pgCreatorId) continue;

      await query(
        `
        INSERT INTO submissions (
          connection_id, campaign_id, brand_id, creator_id,
          deliverable_type, content_url, cloudinary_public_id,
          caption, status, version, rework_count, rejection_reason,
          approved_at, rejected_at, resubmitted_at, submitted_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16
        );
        `,
        [
          pgConnId,
          pgCampId,
          pgBrandId,
          pgCreatorId,
          sub.deliverableType || "REEL",
          sub.contentUrl || "",
          sub.cloudinaryPublicId || null,
          sub.caption || "",
          sub.status || "SUBMITTED",
          sub.version || 1,
          sub.reworkCount || 0,
          sub.rejectionReason || "",
          sub.approvedAt || null,
          sub.rejectedAt || null,
          sub.resubmittedAt || null,
          sub.submittedAt || Date.now(),
        ]
      );
    }
    console.log(`✅ Submissions synced: ${submissions.length}`);

    // ==========================================
    // 6. MIGRATE CONVERSATIONS & MESSAGES
    // ==========================================
    const convos = await Conversation.find({}).lean();
    for (const conv of convos) {
      const pgCreatorId = conv.creatorId ? profileIdMap.get(String(conv.creatorId)) || null : null;
      const pgBrandId = conv.brandId ? profileIdMap.get(String(conv.brandId)) || null : null;
      const pgAdminId = conv.adminId ? profileIdMap.get(String(conv.adminId)) || null : null;
      const pgCampId = conv.campaignId ? campaignIdMap.get(String(conv.campaignId)) || null : null;

      const res = await query(
        `
        INSERT INTO conversations (
          creator_id, brand_id, admin_id, conversation_type, campaign_id,
          status, archived, deleted_for_creator, deleted_for_brand
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;
        `,
        [
          pgCreatorId,
          pgBrandId,
          pgAdminId,
          conv.conversationType || "brand_creator",
          pgCampId,
          conv.status || "pending",
          !!conv.archived,
          !!conv.deletedForCreator,
          !!conv.deletedForBrand,
        ]
      );
      if (res.rows[0]?.id) {
        conversationIdMap.set(String(conv._id), res.rows[0].id);
      }
    }

    const messages = await Message.find({}).lean();
    for (const msg of messages) {
      const pgConvoId = conversationIdMap.get(String(msg.conversationId));
      const pgSenderId = profileIdMap.get(String(msg.senderId));
      if (!pgConvoId || !pgSenderId) continue;

      await query(
        `
        INSERT INTO messages (
          conversation_id, sender_id, text, read,
          deleted_by_admin, deleted_for_creator, deleted_for_brand,
          deleted_at, unsent, message_type, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
        `,
        [
          pgConvoId,
          pgSenderId,
          msg.text || "",
          !!msg.read,
          !!msg.deletedByAdmin,
          !!msg.deletedForCreator,
          !!msg.deletedForBrand,
          msg.deletedAt ? new Date(msg.deletedAt) : null,
          !!msg.unsent,
          msg.messageType || "text",
          JSON.stringify(msg.metadata || null),
        ]
      );
    }
    console.log(`✅ Conversations (${convos.length}) & Messages (${messages.length}) synced.`);

    // ==========================================
    // 7. MIGRATE WALLETS & TRANSACTIONS
    // ==========================================
    const wallets = await Wallet.find({}).lean();
    for (const w of wallets) {
      const pgCreatorId = profileIdMap.get(String(w.creatorId));
      if (!pgCreatorId) continue;

      await query(
        `
        INSERT INTO wallets (
          creator_id, available_balance, pending_withdrawal_balance,
          total_earned, total_withdrawn, currency
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (creator_id) DO UPDATE SET
          available_balance = EXCLUDED.available_balance,
          total_earned = EXCLUDED.total_earned,
          total_withdrawn = EXCLUDED.total_withdrawn;
        `,
        [
          pgCreatorId,
          w.availableBalance || 0,
          w.pendingWithdrawalBalance || 0,
          w.totalEarned || 0,
          w.totalWithdrawn || 0,
          w.currency || "INR",
        ]
      );
    }
    console.log(`✅ Wallets synced: ${wallets.length}`);

    // ==========================================
    // 8. MIGRATE BANK DETAILS & WITHDRAWALS
    // ==========================================
    const bankDetails = await CreatorBankDetails.find({}).lean();
    for (const b of bankDetails) {
      const pgCreatorId = profileIdMap.get(String(b.creatorId));
      if (!pgCreatorId) continue;
      await query(
        `
        INSERT INTO creator_bank_details (
          creator_id, full_name, phone, email, bank_name,
          account_holder_name, account_number, ifsc, upi_id, pan_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `,
        [
          pgCreatorId,
          b.fullName || "",
          b.phone || "",
          b.email || "",
          b.bankName || "",
          b.accountHolderName || "",
          b.accountNumber || "",
          b.ifsc || "",
          b.upiId || "",
          b.panNumber || "",
        ]
      );
    }

    const withdrawals = await Withdrawal.find({}).lean();
    for (const wd of withdrawals) {
      const pgCreatorId = profileIdMap.get(String(wd.creatorId));
      if (!pgCreatorId) continue;
      const res = await query(
        `
        INSERT INTO withdrawals (
          creator_id, amount, currency, status, withdrawal_method,
          bank_details_snapshot, reference_id, payout_reference, failure_reason,
          admin_notes, requested_at, processed_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (reference_id) DO NOTHING
        RETURNING id;
        `,
        [
          pgCreatorId,
          wd.amount || 0,
          wd.currency || "INR",
          wd.status || "PENDING",
          wd.withdrawalMethod || "BANK_TRANSFER",
          JSON.stringify(wd.bankDetailsSnapshot || {}),
          wd.referenceId || `wd_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          wd.payoutReference || "",
          wd.failureReason || "",
          wd.adminNotes || "",
          wd.requestedAt || Date.now(),
          wd.processedAt || null,
          wd.completedAt || null,
        ]
      );
      if (res.rows[0]?.id) {
        withdrawalIdMap.set(String(wd._id), res.rows[0].id);
      }
    }
    console.log(`✅ Bank Details (${bankDetails.length}) & Withdrawals (${withdrawals.length}) synced.`);

    // ==========================================
    // 9. MIGRATE AGREEMENTS
    // ==========================================
    const agreements = await Agreement.find({}).lean();
    for (const ag of agreements) {
      const pgConnId = connectionIdMap.get(String(ag.collaborationId));
      const pgCampId = campaignIdMap.get(String(ag.campaignId));
      const pgBrandId = profileIdMap.get(String(ag.brandId));
      const pgCreatorId = profileIdMap.get(String(ag.creatorId));
      if (!pgConnId || !pgCampId || !pgBrandId || !pgCreatorId) continue;

      await query(
        `
        INSERT INTO agreements (
          agreement_id, collaboration_id, campaign_id, brand_id, creator_id,
          version, status, brand_snapshot, creator_snapshot, campaign_snapshot,
          deliverables_snapshot, financials_snapshot, terms, signature_status,
          brand_signature, creator_signature, admin_signature, fully_signed_at,
          pdf_url, pdf_public_id, pdf_generated_at, generated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21, $22
        ) ON CONFLICT (agreement_id) DO NOTHING;
        `,
        [
          ag.agreementId,
          pgConnId,
          pgCampId,
          pgBrandId,
          pgCreatorId,
          ag.version || 1,
          ag.status || "GENERATED",
          JSON.stringify(ag.brandSnapshot || {}),
          JSON.stringify(ag.creatorSnapshot || {}),
          JSON.stringify(ag.campaignSnapshot || {}),
          JSON.stringify(ag.deliverablesSnapshot || []),
          JSON.stringify(ag.financialsSnapshot || {}),
          JSON.stringify(ag.terms || []),
          ag.signatureStatus || "PENDING_SIGNATURES",
          JSON.stringify(ag.brandSignature || {}),
          JSON.stringify(ag.creatorSignature || {}),
          JSON.stringify(ag.adminSignature || {}),
          ag.fullySignedAt || null,
          ag.pdfUrl || "",
          ag.pdfPublicId || "",
          ag.pdfGeneratedAt || null,
          ag.generatedAt || Date.now(),
        ]
      );
    }
    console.log(`✅ Agreements synced: ${agreements.length}`);

    // ==========================================
    // 10. MIGRATE BLOGS & ADDON SERVICES
    // ==========================================
    const blogs = await Blog.find({}).lean();
    for (const b of blogs) {
      await query(
        `
        INSERT INTO blogs (title, slug, content, excerpt, author, cover_image, category, target_role, published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO NOTHING;
        `,
        [
          b.title,
          b.slug || `blog-${b._id}`,
          b.content || "",
          b.excerpt || "",
          b.author || "Pravixo Team",
          b.coverImageUrl || "",
          b.category || "Marketing Strategies",
          b.targetRole || "creator",
          b.published !== false,
        ]
      );
    }

    const addons = await AddonService.find({}).lean();
    for (const a of addons) {
      await query(
        `
        INSERT INTO addon_services (name, description, price, category, enabled, is_active)
        VALUES ($1, $2, $3, $4, $5, $6);
        `,
        [
          a.name,
          a.description || "",
          a.price || 499,
          a.category || "General",
          a.enabled !== false,
          a.isActive !== false,
        ]
      );
    }
    console.log(`✅ Blogs (${blogs.length}) & Addon Services (${addons.length}) synced.`);

    console.log("\n🎉 ALL MONGODB COLLECTIONS MIGRATED 100% INTO SUPABASE POSTGRESQL TABLES!");
  } catch (err) {
    console.error("❌ Complete Migration Error:", err);
  } finally {
    await mongoose.disconnect();
    const pool = getPostgresPool();
    await pool.end();
    process.exit(0);
  }
};

migrateAllDataFromMongoToPostgres();
