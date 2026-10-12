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
      is_suspended BOOLEAN DEFAULT FALSE,
      suspension_reason TEXT DEFAULT '',
      suspended_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT '';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
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

  // 25. Portfolios Table
  await query(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      cloudinary_public_id TEXT DEFAULT '',
      media_type VARCHAR(50) DEFAULT 'image',
      type VARCHAR(50) DEFAULT 'post',
      caption TEXT DEFAULT '',
      brand_tag VARCHAR(255) DEFAULT '',
      likes_count INT DEFAULT 0,
      views_count INT DEFAULT 0,
      comments_count INT DEFAULT 0,
      shares_count INT DEFAULT 0,
      aspect_ratio VARCHAR(20) DEFAULT '1:1',
      sort_order INT DEFAULT 0,
      liked_by_users JSONB DEFAULT '[]'::jsonb,
      comments JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 26. Portfolio Images Table
  await query(`
    CREATE TABLE IF NOT EXISTS portfolio_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      image_storage_id TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 27. Push Subscriptions Table
  await query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      keys JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, endpoint)
    );
  `);

  // 28. Referrals Table
  await query(`
    CREATE TABLE IF NOT EXISTS referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      referred_creator_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
      referral_code VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'registered',
      qualification_condition VARCHAR(100) DEFAULT 'profile_verified',
      qualified_at TIMESTAMPTZ,
      reward_amount NUMERIC DEFAULT 500,
      currency VARCHAR(10) DEFAULT 'INR',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 29. Referral Settings Table
  await query(`
    CREATE TABLE IF NOT EXISTS referral_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      is_enabled BOOLEAN DEFAULT TRUE,
      reward_amount NUMERIC DEFAULT 500,
      currency VARCHAR(10) DEFAULT 'INR',
      qualification_trigger VARCHAR(100) DEFAULT 'profile_verified',
      max_referrals_per_user INT DEFAULT 0,
      campaign_expiry_date TIMESTAMPTZ,
      referral_type VARCHAR(50),
      commission_percent NUMERIC DEFAULT 5.0,
      commission_source VARCHAR(50) DEFAULT 'creator_share',
      terms JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 30. Referral Rewards Table
  await query(`
    CREATE TABLE IF NOT EXISTS referral_rewards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
      recipient_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      amount NUMERIC DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      status VARCHAR(50) DEFAULT 'pending',
      credited_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 31. Payment Audit Logs Table
  await query(`
    CREATE TABLE IF NOT EXISTS payment_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID,
      action VARCHAR(255) NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 32. Webhook Logs Table
  await query(`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(255) NOT NULL,
      payload JSONB DEFAULT '{}'::jsonb,
      headers JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(50) DEFAULT 'received',
      error_message TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 33. Campaign Tasks Table
  await query(`
    CREATE TABLE IF NOT EXISTS campaign_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
      conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      deliverables TEXT NOT NULL,
      priority VARCHAR(50) NOT NULL DEFAULT 'medium',
      status VARCHAR(50) NOT NULL DEFAULT 'assigned',
      due_date BIGINT NOT NULL,
      started_at BIGINT,
      completed_at BIGINT,
      submission_link TEXT,
      notes TEXT,
      attachment_link TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 34. Contact Inquiries Table
  await query(`
    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'unread',
      admin_notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 35. Follows Table
  await query(`
    CREATE TABLE IF NOT EXISTS follows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(follower_id, following_id)
    );
  `);

  // 36. Offers Table
  await query(`
    CREATE TABLE IF NOT EXISTS offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      creator_or_brand_type VARCHAR(50) NOT NULL,
      offer_title VARCHAR(255) NOT NULL,
      condition_text TEXT NOT NULL,
      offer_category VARCHAR(50) DEFAULT 'discount',
      discount_percent NUMERIC,
      monetary_bonus NUMERIC,
      validity_hours INT NOT NULL,
      expires_at TIMESTAMPTZ,
      status VARCHAR(50) DEFAULT 'pending_approval',
      rejection_reason TEXT DEFAULT '',
      approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
      approved_at TIMESTAMPTZ,
      deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 37. Subscription Packages Table
  await query(`
    CREATE TABLE IF NOT EXISTS subscription_packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      price NUMERIC NOT NULL,
      original_price NUMERIC DEFAULT 0,
      billing_period VARCHAR(50) NOT NULL,
      badge VARCHAR(100) DEFAULT '',
      features JSONB DEFAULT '[]'::jsonb,
      active BOOLEAN DEFAULT TRUE,
      target_role VARCHAR(50) DEFAULT 'both',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 38. Subscription Offers Table
  await query(`
    CREATE TABLE IF NOT EXISTS subscription_offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      discount_percentage NUMERIC,
      discount_amount NUMERIC,
      banner_image_url TEXT,
      banner_storage_id TEXT,
      expiry_date BIGINT NOT NULL,
      button_text VARCHAR(100) NOT NULL,
      target_users VARCHAR(50) NOT NULL,
      package_id UUID REFERENCES subscription_packages(id) ON DELETE CASCADE,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 39. Offer Analytics Table
  await query(`
    CREATE TABLE IF NOT EXISTS offer_analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id UUID REFERENCES subscription_offers(id) ON DELETE CASCADE,
      views INT DEFAULT 0,
      clicks INT DEFAULT 0,
      upgrades INT DEFAULT 0,
      revenue NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 40. User Subscriptions Table
  await query(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      package_id UUID REFERENCES subscription_packages(id) ON DELETE CASCADE,
      offer_id UUID REFERENCES subscription_offers(id) ON DELETE SET NULL,
      start_date BIGINT NOT NULL,
      expiry_date BIGINT,
      status VARCHAR(50) DEFAULT 'active',
      amount_paid NUMERIC DEFAULT 0,
      razorpay_order_id VARCHAR(255),
      razorpay_payment_id VARCHAR(255),
      razorpay_signature VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 41. Popup Settings Table
  await query(`
    CREATE TABLE IF NOT EXISTS popup_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      show_popup BOOLEAN DEFAULT FALSE,
      popup_frequency VARCHAR(50) DEFAULT 'every_login',
      target_users VARCHAR(50) DEFAULT 'both',
      popup_expiry BIGINT,
      active_offer_id UUID REFERENCES subscription_offers(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 42. Pro Tips Table
  await query(`
    CREATE TABLE IF NOT EXISTS pro_tips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(100) DEFAULT '',
      image TEXT DEFAULT '',
      icon_name VARCHAR(100) DEFAULT 'Lightbulb',
      author VARCHAR(255) DEFAULT '',
      is_published BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 43. Trust Reviews Table
  await query(`
    CREATE TABLE IF NOT EXISTS trust_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source VARCHAR(50) NOT NULL,
      reviewer_name VARCHAR(255) NOT NULL,
      review_text TEXT NOT NULL,
      rating NUMERIC NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 44. Video Reviews Table
  await query(`
    CREATE TABLE IF NOT EXISTS video_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      thumbnail_url TEXT,
      video_url TEXT,
      reviewer_name VARCHAR(255) NOT NULL,
      reviewer_avatar TEXT DEFAULT '',
      reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      target_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      target_name VARCHAR(255) DEFAULT '',
      target_avatar TEXT DEFAULT '',
      campaign_name VARCHAR(255) DEFAULT '',
      review_type VARCHAR(50) DEFAULT 'video',
      review_text TEXT NOT NULL,
      rating NUMERIC DEFAULT 5,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Column upgrades for profiles table
  await query(`
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS aadhar_url TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS aadhar_storage_id TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS pan_url TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS pan_storage_id TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS gst_number VARCHAR(255) DEFAULT '',
      ADD COLUMN IF NOT EXISTS gst_certificate_url TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS gst_certificate_storage_id TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS media_kit_bio TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS media_kit_tagline TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS audience_highlights JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS past_brands_worked_with JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS pref_niches TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS pref_budget TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS pref_reach TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS pref_regions TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS company_size VARCHAR(100) DEFAULT '',
      ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(255) DEFAULT '',
      ADD COLUMN IF NOT EXISTS referral_code VARCHAR(255) DEFAULT '',
      ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  `);

  // Column upgrades for referral_rewards table
  await query(`
    ALTER TABLE referral_rewards
      ADD COLUMN IF NOT EXISTS referrer_creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS referred_creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS reward_amount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS wallet_transaction_id UUID;
  `);

  // Column upgrades for social_connections table
  await query(`
    ALTER TABLE social_connections
      ADD COLUMN IF NOT EXISTS failure_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS account_health VARCHAR(50) DEFAULT 'healthy',
      ADD COLUMN IF NOT EXISTS last_error TEXT,
      ADD COLUMN IF NOT EXISTS subscribers BIGINT DEFAULT 0;
  `);

  // Column upgrades for referral_settings table
  await query(`
    ALTER TABLE referral_settings
      ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS reward_amount NUMERIC DEFAULT 500,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS qualification_trigger VARCHAR(100) DEFAULT 'profile_verified',
      ADD COLUMN IF NOT EXISTS max_referrals_per_user INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS campaign_expiry_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS terms JSONB DEFAULT '[]'::jsonb;
  `);

  console.log("✅ All Full PostgreSQL tables initialized successfully in Supabase!");
};

export default initPostgresTables;

