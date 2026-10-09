import { query } from "../config/postgres.js";

export const initPostgresTables = async () => {
  console.log("⚙️ Initializing Full PostgreSQL tables in Supabase...");

  // 1. Profiles Table
  await query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'creator',
      gender VARCHAR(50) DEFAULT '',
      handle VARCHAR(255) DEFAULT '',
      category VARCHAR(255) DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      location VARCHAR(255) DEFAULT '',
      bio TEXT DEFAULT '',
      starting_price NUMERIC DEFAULT 0,
      is_barter_allowed BOOLEAN DEFAULT FALSE,
      avatar_url TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      profile_views INT DEFAULT 0,
      clicks INT DEFAULT 0,
      bookings INT DEFAULT 0,
      instagram_handle VARCHAR(255) DEFAULT '',
      instagram_followers BIGINT DEFAULT 0,
      facebook_handle VARCHAR(255) DEFAULT '',
      facebook_followers BIGINT DEFAULT 0,
      linkedin_handle VARCHAR(255) DEFAULT '',
      linkedin_followers BIGINT DEFAULT 0,
      youtube_handle VARCHAR(255) DEFAULT '',
      youtube_followers BIGINT DEFAULT 0,
      quora_handle VARCHAR(255) DEFAULT '',
      quora_followers BIGINT DEFAULT 0,
      twitter_handle VARCHAR(255) DEFAULT '',
      twitter_followers BIGINT DEFAULT 0,
      custom_social_feeds JSONB DEFAULT '[]'::jsonb,
      custom_pricing_packages JSONB DEFAULT '[]'::jsonb,
      social_links JSONB DEFAULT '{}'::jsonb,
      verification_status VARCHAR(50) DEFAULT 'unverified',
      kyc_documents JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 2. OTPs Table
  await query(`
    CREATE TABLE IF NOT EXISTS otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3. Social Connections Table
  await query(`
    CREATE TABLE IF NOT EXISTS social_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      owner_type VARCHAR(50) DEFAULT 'creator',
      platform VARCHAR(50) NOT NULL,
      handle VARCHAR(255) NOT NULL,
      account_id VARCHAR(255) DEFAULT '',
      encrypted_access_token TEXT,
      encrypted_refresh_token TEXT,
      expires_at BIGINT,
      verified BOOLEAN DEFAULT FALSE,
      sync_status VARCHAR(50) DEFAULT 'success',
      sync_mode VARCHAR(50) DEFAULT 'live',
      last_synced_at BIGINT,
      followers BIGINT DEFAULT 0,
      views BIGINT DEFAULT 0,
      engagement_rate NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(profile_id, platform)
    );
  `);

  // 4. Social Analytics History Table
  await query(`
    CREATE TABLE IF NOT EXISTS social_analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id UUID REFERENCES social_connections(id) ON DELETE CASCADE,
      timestamp BIGINT NOT NULL,
      followers BIGINT DEFAULT 0,
      views BIGINT DEFAULT 0,
      engagement_rate NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Campaigns Table
  await query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      category VARCHAR(255) DEFAULT '',
      location VARCHAR(255) DEFAULT 'Pan India',
      total_budget NUMERIC DEFAULT 0,
      min_budget_per_creator NUMERIC DEFAULT 0,
      max_budget_per_creator NUMERIC DEFAULT 0,
      min_followers BIGINT DEFAULT 0,
      tiers JSONB DEFAULT '[]'::jsonb,
      deliverables JSONB DEFAULT '{"reels": 0, "posts": 0, "stories": 0, "videos": 0, "notes": ""}'::jsonb,
      budget VARCHAR(255) DEFAULT '',
      duration VARCHAR(255) DEFAULT '',
      status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION',
      verification_feedback TEXT DEFAULT '',
      active BOOLEAN DEFAULT TRUE,
      start_date BIGINT,
      end_date BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 6. Connections (Collaborations / Requests) Table
  await query(`
    CREATE TABLE IF NOT EXISTS connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      pitch TEXT NOT NULL,
      applied_tier JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(50) DEFAULT 'pending',
      creator_notification_seen BOOLEAN DEFAULT FALSE,
      collaboration_status VARCHAR(50) DEFAULT 'NEGOTIATING',
      creator_amount NUMERIC DEFAULT 0,
      pravixo_fee NUMERIC DEFAULT 0,
      brand_total NUMERIC DEFAULT 0,
      proposed_amount NUMERIC DEFAULT 0,
      proposed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
      agreed_at BIGINT,
      payment_status VARCHAR(50) DEFAULT 'PENDING',
      payment_id UUID,
      paid_at BIGINT,
      deliverables_tracking JSONB DEFAULT '[]'::jsonb,
      all_deliverables_completed BOOLEAN DEFAULT FALSE,
      work_completed_at BIGINT,
      approval_completed_at BIGINT,
      payment_release_eligible_at BIGINT,
      payment_release_status VARCHAR(50) DEFAULT 'NOT_APPLICABLE',
      admin_notified_of_eligibility BOOLEAN DEFAULT FALSE,
      barter_details JSONB DEFAULT '{}'::jsonb,
      payout_id UUID,
      payout_released_at BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 7. Submissions Table
  await query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      deliverable_id UUID,
      deliverable_type VARCHAR(50) NOT NULL,
      content_url TEXT NOT NULL,
      cloudinary_public_id TEXT DEFAULT NULL,
      caption TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'SUBMITTED',
      version INT DEFAULT 1,
      parent_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
      rework_count INT DEFAULT 0,
      rejection_reason TEXT DEFAULT '',
      approved_at BIGINT,
      rejected_at BIGINT,
      resubmitted_at BIGINT,
      submitted_at BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 8. Conversations Table
  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      brand_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      conversation_type VARCHAR(50) DEFAULT 'brand_creator',
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'pending',
      archived BOOLEAN DEFAULT FALSE,
      deleted_for_creator BOOLEAN DEFAULT FALSE,
      deleted_for_brand BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 9. Messages Table
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      deleted_by_admin BOOLEAN DEFAULT FALSE,
      deleted_for_creator BOOLEAN DEFAULT FALSE,
      deleted_for_brand BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      unsent BOOLEAN DEFAULT FALSE,
      message_type VARCHAR(50) DEFAULT 'text',
      metadata JSONB DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 10. Wallets Table
  await query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
      available_balance NUMERIC DEFAULT 0,
      pending_withdrawal_balance NUMERIC DEFAULT 0,
      total_earned NUMERIC DEFAULT 0,
      total_withdrawn NUMERIC DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 11. Payments Table
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
      connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      payment_gateway VARCHAR(50) NOT NULL,
      gateway_order_id VARCHAR(255),
      gateway_payment_id VARCHAR(255),
      gateway_signature VARCHAR(255),
      gateway_status VARCHAR(50),
      gateway_webhook_status VARCHAR(50),
      gateway_response TEXT,
      invoice_number VARCHAR(255) NOT NULL,
      invoice_status VARCHAR(50) NOT NULL,
      transaction_reference VARCHAR(255),
      payment_method VARCHAR(50),
      currency VARCHAR(10) DEFAULT 'INR',
      gross_amount NUMERIC NOT NULL,
      platform_commission_percentage NUMERIC NOT NULL,
      platform_commission_amount NUMERIC NOT NULL,
      creator_amount NUMERIC NOT NULL,
      holding_status VARCHAR(50) DEFAULT 'inactive',
      holding_started_at BIGINT,
      holding_ends_at BIGINT,
      released_at BIGINT,
      refund_status VARCHAR(50) DEFAULT 'inactive',
      refund_amount NUMERIC,
      refund_reason TEXT,
      payout_status VARCHAR(50),
      payout_reference VARCHAR(255),
      creator_bank_account_id VARCHAR(255),
      payment_status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 12. Payouts Table
  await query(`
    CREATE TABLE IF NOT EXISTS payouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collaboration_id UUID REFERENCES connections(id) ON DELETE CASCADE,
      payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      status VARCHAR(50) DEFAULT 'COMPLETED',
      payout_method VARCHAR(50) DEFAULT 'MANUAL_BANK_TRANSFER',
      transaction_reference VARCHAR(255) UNIQUE NOT NULL,
      initiated_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
      initiated_at BIGINT,
      completed_at BIGINT,
      failure_reason TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 13. Withdrawals Table
  await query(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      status VARCHAR(50) DEFAULT 'PENDING',
      withdrawal_method VARCHAR(50) DEFAULT 'BANK_TRANSFER',
      bank_details_snapshot JSONB DEFAULT '{}'::jsonb,
      reference_id VARCHAR(255) UNIQUE NOT NULL,
      payout_reference VARCHAR(255) DEFAULT '',
      failure_reason TEXT DEFAULT '',
      admin_notes TEXT DEFAULT '',
      requested_at BIGINT,
      processed_at BIGINT,
      completed_at BIGINT,
      processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 14. Wallet Transactions Table
  await query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      collaboration_id UUID REFERENCES connections(id) ON DELETE SET NULL,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL,
      withdrawal_id UUID REFERENCES withdrawals(id) ON DELETE SET NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'CREDIT',
      transaction_type VARCHAR(50) DEFAULT 'collaboration',
      related_transaction_id UUID,
      related_referral_id UUID,
      amount NUMERIC NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      status VARCHAR(50) DEFAULT 'COMPLETED',
      description TEXT DEFAULT '',
      reference_id VARCHAR(255) UNIQUE NOT NULL,
      balance_after NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 15. Agreements Table
  await query(`
    CREATE TABLE IF NOT EXISTS agreements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agreement_id VARCHAR(255) UNIQUE NOT NULL,
      collaboration_id UUID REFERENCES connections(id) ON DELETE CASCADE,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      version INT DEFAULT 1,
      status VARCHAR(50) DEFAULT 'GENERATED',
      brand_snapshot JSONB DEFAULT '{}'::jsonb,
      creator_snapshot JSONB DEFAULT '{}'::jsonb,
      campaign_snapshot JSONB DEFAULT '{}'::jsonb,
      deliverables_snapshot JSONB DEFAULT '[]'::jsonb,
      financials_snapshot JSONB DEFAULT '{}'::jsonb,
      terms JSONB DEFAULT '[]'::jsonb,
      signature_status VARCHAR(50) DEFAULT 'PENDING_SIGNATURES',
      brand_signature JSONB DEFAULT '{}'::jsonb,
      creator_signature JSONB DEFAULT '{}'::jsonb,
      admin_signature JSONB DEFAULT '{}'::jsonb,
      fully_signed_at BIGINT,
      pdf_url TEXT DEFAULT '',
      pdf_public_id TEXT DEFAULT '',
      pdf_generated_at BIGINT,
      pdf_version INT,
      generated_at BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 16. Notifications Table
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      text TEXT NOT NULL,
      task_id UUID,
      target_url TEXT DEFAULT '',
      metadata JSONB DEFAULT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at BIGINT,
      created_at_dt TIMESTAMPTZ DEFAULT NOW(),
      updated_at_dt TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 17. Pricing Tiers Table
  await query(`
    CREATE TABLE IF NOT EXISTS pricing_tiers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      price NUMERIC NOT NULL,
      sort_order INT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 18. Creator Bank Details Table
  await query(`
    CREATE TABLE IF NOT EXISTS creator_bank_details (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      bank_name VARCHAR(255) NOT NULL,
      account_holder_name VARCHAR(255) NOT NULL,
      account_number VARCHAR(255) NOT NULL,
      ifsc VARCHAR(50) NOT NULL,
      upi_id VARCHAR(255),
      pan_number VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 19. Favorites Table
  await query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      creator_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(brand_id, creator_id)
    );
  `);

  // 20. Reviews Table
  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      target_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      reviewer_role VARCHAR(50) DEFAULT 'brand',
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(255) NOT NULL,
      text TEXT NOT NULL,
      campaign_ref VARCHAR(255),
      status VARCHAR(50) DEFAULT 'approved',
      visible BOOLEAN DEFAULT TRUE,
      created_at BIGINT,
      created_at_dt TIMESTAMPTZ DEFAULT NOW(),
      updated_at_dt TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 21. Blogs Table
  await query(`
    CREATE TABLE IF NOT EXISTS blogs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE,
      content TEXT NOT NULL,
      excerpt TEXT DEFAULT '',
      author VARCHAR(255) DEFAULT 'Pravixo Team',
      cover_image TEXT DEFAULT '',
      cover_image_url TEXT DEFAULT '',
      category VARCHAR(255) DEFAULT 'Marketing Strategies',
      target_role VARCHAR(50) DEFAULT 'creator',
      tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      published BOOLEAN DEFAULT TRUE,
      featured BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 22. Addon Services Table
  await query(`
    CREATE TABLE IF NOT EXISTS addon_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC NOT NULL,
      category VARCHAR(255) DEFAULT 'General',
      image_url TEXT DEFAULT '',
      enabled BOOLEAN DEFAULT TRUE,
      creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      approval_status VARCHAR(50) DEFAULT 'approved',
      rejection_reason TEXT DEFAULT '',
      is_active BOOLEAN DEFAULT TRUE,
      created_at BIGINT,
      created_at_dt TIMESTAMPTZ DEFAULT NOW(),
      updated_at_dt TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 23. Addon Bookings Table
  await query(`
    CREATE TABLE IF NOT EXISTS addon_bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      service_id UUID REFERENCES addon_services(id) ON DELETE CASCADE,
      booking_date BIGINT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at BIGINT,
      created_at_dt TIMESTAMPTZ DEFAULT NOW(),
      updated_at_dt TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 24. Referral Relationships Table
  await query(`
    CREATE TABLE IF NOT EXISTS referral_relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      referrer_type VARCHAR(50) NOT NULL,
      referred_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
      referred_type VARCHAR(50) NOT NULL,
      referral_code_used VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      commission_percent NUMERIC DEFAULT 5.0,
      expires_at TIMESTAMPTZ DEFAULT NULL,
      revoke_reason TEXT DEFAULT NULL,
      revoked_at TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("✅ All Full PostgreSQL tables initialized successfully in Supabase!");
};

export default initPostgresTables;
