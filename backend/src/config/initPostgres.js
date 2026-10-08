import { query } from "../config/postgres.js";

export const initPostgresTables = async () => {
  console.log("⚙️ Initializing PostgreSQL tables in Supabase...");

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

  // 2. Social Connections Table
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

  // 3. Social Analytics History Table
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

  // 4. Campaigns Table
  await query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(255) DEFAULT '',
      platform VARCHAR(50) DEFAULT 'instagram',
      deliverables JSONB DEFAULT '[]'::jsonb,
      budget NUMERIC DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Campaign Tasks / Collabs Table
  await query(`
    CREATE TABLE IF NOT EXISTS campaign_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'pending',
      agreed_amount NUMERIC DEFAULT 0,
      submission_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 6. Portfolio Table
  await query(`
    CREATE TABLE IF NOT EXISTS portfolio (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      media_url TEXT NOT NULL,
      thumbnail_url TEXT DEFAULT '',
      media_type VARCHAR(50) DEFAULT 'image',
      metrics JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 7. Reviews Table
  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT DEFAULT '',
      campaign_title VARCHAR(255) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 8. Blogs Table
  await query(`
    CREATE TABLE IF NOT EXISTS blogs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT DEFAULT '',
      author VARCHAR(255) DEFAULT 'Pravixo Team',
      cover_image TEXT DEFAULT '',
      tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      published BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 9. Addons & Services Table
  await query(`
    CREATE TABLE IF NOT EXISTS addon_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC NOT NULL,
      category VARCHAR(255) DEFAULT 'General',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("✅ All PostgreSQL tables initialized successfully in Supabase!");
};

export default initPostgresTables;
