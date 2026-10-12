import { query } from "../config/postgres.js";
import crypto from "crypto";

/* =====================================================
   ENCRYPTION / DECRYPTION
===================================================== */

const getEncryptionKey = () => {
  const key =
    process.env.ENCRYPTION_KEY ||
    "default_lumen_system_secret_encryption_key_32_bytes";

  return crypto.createHash("sha256").update(key).digest();
};

const decrypt = (ciphertext) => {
  if (!ciphertext) return "";

  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format.");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encryptedText = parts[2];

  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

/* =====================================================
   UPDATE PROFILE SOCIAL STATS
===================================================== */

const updateProfilePlatformStats = async (
  profileId,
  platform,
  handle,
  followers
) => {
  const followersNum = followers !== undefined ? Number(followers) : undefined;
  const platformKey = String(platform).toLowerCase();

  switch (platformKey) {
    case "instagram":
      if (followersNum !== undefined) {
        await query(
          `UPDATE profiles SET instagram_handle = $1, instagram_followers = $2, updated_at = NOW() WHERE id::text = $3`,
          [handle || "", followersNum, profileId]
        );
      } else {
        await query(
          `UPDATE profiles SET instagram_handle = $1, updated_at = NOW() WHERE id::text = $2`,
          [handle || "", profileId]
        );
      }
      break;

    case "facebook":
      if (followersNum !== undefined) {
        await query(
          `UPDATE profiles SET facebook_handle = $1, facebook_followers = $2, updated_at = NOW() WHERE id::text = $3`,
          [handle || "", followersNum, profileId]
        );
      } else {
        await query(
          `UPDATE profiles SET facebook_handle = $1, updated_at = NOW() WHERE id::text = $2`,
          [handle || "", profileId]
        );
      }
      break;

    case "linkedin":
      if (followersNum !== undefined) {
        await query(
          `UPDATE profiles SET linkedin_handle = $1, linkedin_followers = $2, updated_at = NOW() WHERE id::text = $3`,
          [handle || "", followersNum, profileId]
        );
      } else {
        await query(
          `UPDATE profiles SET linkedin_handle = $1, updated_at = NOW() WHERE id::text = $2`,
          [handle || "", profileId]
        );
      }
      break;

    case "youtube":
      if (followersNum !== undefined) {
        await query(
          `UPDATE profiles SET youtube_handle = $1, youtube_followers = $2, updated_at = NOW() WHERE id::text = $3`,
          [handle || "", followersNum, profileId]
        );
      } else {
        await query(
          `UPDATE profiles SET youtube_handle = $1, updated_at = NOW() WHERE id::text = $2`,
          [handle || "", profileId]
        );
      }
      break;

    case "quora":
      if (followersNum !== undefined) {
        await query(
          `UPDATE profiles SET quora_handle = $1, quora_followers = $2, updated_at = NOW() WHERE id::text = $3`,
          [handle || "", followersNum, profileId]
        );
      } else {
        await query(
          `UPDATE profiles SET quora_handle = $1, updated_at = NOW() WHERE id::text = $2`,
          [handle || "", profileId]
        );
      }
      break;

    case "twitter":
      if (followersNum !== undefined) {
        await query(
          `UPDATE profiles SET twitter_handle = $1, twitter_followers = $2, updated_at = NOW() WHERE id::text = $3`,
          [handle || "", followersNum, profileId]
        );
      } else {
        await query(
          `UPDATE profiles SET twitter_handle = $1, updated_at = NOW() WHERE id::text = $2`,
          [handle || "", profileId]
        );
      }
      break;
  }
};

/* =====================================================
   SYNC YOUTUBE
===================================================== */

const syncYouTube = async (accessToken, connection) => {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API failed: ${errorText}`);
  }

  const data = await response.json();
  const channel = data.items?.[0];

  if (!channel) {
    throw new Error("YouTube channel not found.");
  }

  const statistics = channel.statistics || {};
  const snippet = channel.snippet || {};

  const followers = Number(statistics.subscriberCount || 0);
  const views = Number(statistics.viewCount || 0);
  const engagementRate =
    followers > 0
      ? Math.round((views / followers) * 0.04 * 100) / 100
      : 0;

  return {
    followers,
    views,
    engagementRate,
    handle:
      snippet.customUrl ||
      `@${(snippet.title || "").replace(/\s+/g, "")}`,
  };
};

/* =====================================================
   SYNC INSTAGRAM
===================================================== */

const syncInstagram = async (accessToken, connection) => {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username,followers_count},fan_count&access_token=${accessToken}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Instagram API failed: ${errorText}`);
  }

  const data = await response.json();
  const page = data.data?.[0];

  if (!page) {
    throw new Error("No Facebook Page connected.");
  }

  const instagram = page.instagram_business_account;

  if (!instagram) {
    throw new Error(
      "No Instagram Professional/Creator account connected."
    );
  }

  return {
    followers: Number(instagram.followers_count) || 0,
    views: connection.views || 0,
    engagementRate: connection.engagement_rate || 3.25,
    handle: instagram.username
      ? `@${instagram.username}`
      : connection.handle,
  };
};

/* =====================================================
   SYNC FACEBOOK
===================================================== */

const syncFacebook = async (accessToken, connection) => {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,username,fan_count&access_token=${accessToken}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Facebook API failed: ${errorText}`);
  }

  const data = await response.json();
  const page = data.data?.[0];

  if (!page) {
    throw new Error("Facebook Page not found.");
  }

  return {
    followers: Number(page.fan_count) || 0,
    views: connection.views || 0,
    engagementRate: connection.engagement_rate || 1.12,
    handle: page.username || page.name || connection.handle,
  };
};

/* =====================================================
   SYNC LINKEDIN
===================================================== */

const syncLinkedIn = async (accessToken, connection) => {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LinkedIn API failed: ${errorText}`);
  }

  const data = await response.json();

  return {
    followers: connection.followers || 0,
    views: connection.views || 0,
    engagementRate: connection.engagement_rate || 2.4,
    handle:
      data.preferred_username ||
      data.preferredUsername ||
      data.name ||
      connection.handle,
  };
};

/* =====================================================
   SYNC TWITTER / X
===================================================== */

const syncTwitter = async (accessToken, connection) => {
  const response = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=public_metrics",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twitter API failed: ${errorText}`);
  }

  const data = await response.json();
  const user = data.data;

  if (!user) {
    throw new Error("Twitter user data not found.");
  }

  const metrics = user.public_metrics || {};

  return {
    followers: Number(metrics.followers_count) || 0,
    views: connection.views || 0,
    engagementRate: connection.engagement_rate || 1.8,
    handle: user.username ? `@${user.username}` : connection.handle,
  };
};

/* =====================================================
   SYNC ONE CONNECTION
===================================================== */

export const syncSingleConnection = async (connection) => {
  const connId = connection.id;
  try {
    await query(
      `UPDATE social_connections SET sync_status = 'syncing', updated_at = NOW() WHERE id = $1`,
      [connId]
    );

    const tokenEncrypted = connection.encrypted_access_token || connection.encryptedAccessToken;
    const accessToken = tokenEncrypted ? decrypt(tokenEncrypted) : "";

    if (!accessToken) {
      throw new Error("Access token is missing.");
    }

    let stats;
    const platform = connection.platform.toLowerCase();

    switch (platform) {
      case "youtube":
        stats = await syncYouTube(accessToken, connection);
        break;
      case "instagram":
        stats = await syncInstagram(accessToken, connection);
        break;
      case "facebook":
        stats = await syncFacebook(accessToken, connection);
        break;
      case "linkedin":
        stats = await syncLinkedIn(accessToken, connection);
        break;
      case "twitter":
        stats = await syncTwitter(accessToken, connection);
        break;
      default:
        throw new Error(`Unsupported platform: ${connection.platform}`);
    }

    const now = Date.now();

    await query(
      `
      UPDATE social_connections SET
        handle = COALESCE($1, handle),
        followers = COALESCE($2, followers),
        views = COALESCE($3, views),
        engagement_rate = COALESCE($4, engagement_rate),
        sync_status = 'success',
        last_synced_at = $5,
        failure_count = 0,
        account_health = 'healthy',
        last_error = NULL,
        updated_at = NOW()
      WHERE id = $6
      `,
      [
        stats.handle || connection.handle,
        stats.followers,
        stats.views,
        stats.engagementRate,
        now,
        connId,
      ]
    );

    // Save analytics
    if (stats.followers !== undefined) {
      await query(
        `INSERT INTO social_analytics (connection_id, timestamp, followers, views, engagement_rate) VALUES ($1, $2, $3, $4, $5)`,
        [connId, now, stats.followers, stats.views, stats.engagementRate]
      );

      // Keep latest 30
      await query(
        `
        DELETE FROM social_analytics
        WHERE connection_id = $1
          AND id NOT IN (
            SELECT id FROM social_analytics WHERE connection_id = $1 ORDER BY timestamp DESC LIMIT 30
          )
        `,
        [connId]
      );
    }

    // Update profile
    const profileId = connection.profile_id || connection.profileId;
    await updateProfilePlatformStats(
      profileId,
      platform,
      stats.handle || connection.handle,
      stats.followers
    );

    return {
      id: connId,
      platform: connection.platform,
      success: true,
    };
  } catch (error) {
    console.error(`[SOCIAL SYNC] ${connection.platform} failed:`, error);

    const failCount = Number(connection.failure_count || connection.failureCount || 0) + 1;
    const accountHealth = failCount >= 5 ? "error" : failCount >= 2 ? "warning" : "healthy";

    await query(
      `
      UPDATE social_connections SET
        sync_status = 'failed',
        last_error = $1,
        failure_count = $2,
        account_health = $3,
        updated_at = NOW()
      WHERE id = $4
      `,
      [error.message || "Social sync failed.", failCount, accountHealth, connId]
    );

    return {
      id: connId,
      platform: connection.platform,
      success: false,
      error: error.message || "Social sync failed.",
    };
  }
};

/* =====================================================
   SYNC ALL VERIFIED CONNECTIONS
===================================================== */

export const syncAllConnections = async () => {
  const { rows } = await query(`SELECT * FROM social_connections WHERE verified = TRUE`);

  console.log(`[SOCIAL SYNC] Found ${rows.length} verified connections.`);

  const results = [];
  for (const connection of rows) {
    const result = await syncSingleConnection(connection);
    results.push(result);
  }

  return results;
};