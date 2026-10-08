// =====================================================
// SOCIAL OAUTH SERVICE
// Node.js replacement for Convex OAuth actions
// =====================================================

const GRAPH_API_VERSION = "v19.0";

// =====================================================
// HELPER
// =====================================================

const parseJsonResponse = async (response) => {
  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      raw: text,
    };
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      data?.raw ||
      `OAuth request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
};

// =====================================================
// INSTAGRAM
// Instagram OAuth uses Meta Graph API
// =====================================================

export const exchangeInstagramCode = async ({
  code,
  redirectUri,
}) => {
  if (!process.env.META_CLIENT_ID) {
    throw new Error("META_CLIENT_ID is not configured.");
  }

  if (!process.env.META_CLIENT_SECRET) {
    throw new Error("META_CLIENT_SECRET is not configured.");
  }

  const params = new URLSearchParams({
    client_id: process.env.META_CLIENT_ID,
    client_secret: process.env.META_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  const tokenData = await parseJsonResponse(response);

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error(
      "Instagram did not return an access token."
    );
  }

  // Fetch Instagram Professional / Business Account linked to Facebook Pages
  let handle = "Instagram User";
  let accountId = "";
  let followers = 0;
  let views = 0;
  let engagementRate = 3.25;

  try {
    const pagesResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,followers_count,media_count}&access_token=${encodeURIComponent(
        accessToken
      )}`
    );

    const pagesData = await parseJsonResponse(pagesResponse);
    const pages = Array.isArray(pagesData?.data) ? pagesData.data : [];
    
    // Find first page with connected instagram business account
    const pageWithIg = pages.find((p) => p.instagram_business_account);

    if (pageWithIg?.instagram_business_account) {
      const ig = pageWithIg.instagram_business_account;
      accountId = ig.id || pageWithIg.id;
      handle = ig.username ? `@${ig.username.replace(/^@/, "")}` : `@${ig.name || "creator"}`;
      followers = Number(ig.followers_count) || 0;
      views = Math.floor(followers * 2.2);
    } else {
      // Fallback to /me if no business account is linked yet
      const meResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(
          accessToken
        )}`
      );
      const meData = await parseJsonResponse(meResponse);
      accountId = meData.id || "meta_user";
      handle = meData.name ? `@${meData.name.replace(/\s+/g, "").toLowerCase()}` : "Instagram User";
    }
  } catch (err) {
    console.error("Error fetching Instagram business details:", err);
  }

  return {
    accountId: accountId || "meta_ig",
    handle,
    accessToken,
    refreshToken: undefined,
    expiresAt: tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : undefined,
    followers,
    views,
    engagementRate,
  };
};

// =====================================================
// FACEBOOK
// =====================================================

export const exchangeFacebookCode = async ({
  code,
  redirectUri,
}) => {
  if (!process.env.META_CLIENT_ID) {
    throw new Error("META_CLIENT_ID is not configured.");
  }

  if (!process.env.META_CLIENT_SECRET) {
    throw new Error("META_CLIENT_SECRET is not configured.");
  }

  const params = new URLSearchParams({
    client_id: process.env.META_CLIENT_ID,
    client_secret: process.env.META_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  const tokenData =
    await parseJsonResponse(response);

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error(
      "Facebook did not return an access token."
    );
  }

  const accountResponse = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(
      accessToken
    )}`
  );

  const accountData =
    await parseJsonResponse(accountResponse);

  return {
    accountId: accountData.id,

    handle:
      accountData.name ||
      "Facebook User",

    accessToken,

    refreshToken: undefined,

    expiresAt: tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : undefined,

    followers: 0,
    views: 0,
    engagementRate: 0,
  };
};

// =====================================================
// LINKEDIN
// =====================================================

export const exchangeLinkedInCode = async ({
  code,
  redirectUri,
}) => {
  if (!process.env.LINKEDIN_CLIENT_ID) {
    throw new Error(
      "LINKEDIN_CLIENT_ID is not configured."
    );
  }

  if (!process.env.LINKEDIN_CLIENT_SECRET) {
    throw new Error(
      "LINKEDIN_CLIENT_SECRET is not configured."
    );
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret:
      process.env.LINKEDIN_CLIENT_SECRET,
  });

  const response = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  const tokenData =
    await parseJsonResponse(response);

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error(
      "LinkedIn did not return an access token."
    );
  }

  // LinkedIn OpenID Connect user info
  const userResponse = await fetch(
    "https://api.linkedin.com/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const userData =
    await parseJsonResponse(userResponse);

  return {
    accountId:
      userData.sub,

    handle:
      userData.name ||
      userData.email ||
      "LinkedIn User",

    accessToken,

    refreshToken:
      tokenData.refresh_token,

    expiresAt: tokenData.expires_in
      ? Date.now() +
        tokenData.expires_in * 1000
      : undefined,

    followers: 0,
    views: 0,
    engagementRate: 0,
  };
};

// =====================================================
// TWITTER / X
// OAuth 2.0 PKCE
// =====================================================

export const exchangeTwitterCode = async ({
  code,
  redirectUri,
  codeVerifier,
}) => {
  if (!process.env.TWITTER_CLIENT_ID) {
    throw new Error(
      "TWITTER_CLIENT_ID is not configured."
    );
  }

  if (!codeVerifier) {
    throw new Error(
      "Twitter codeVerifier is required."
    );
  }

  const params = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: process.env.TWITTER_CLIENT_ID,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(
    "https://api.twitter.com/2/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  const tokenData =
    await parseJsonResponse(response);

  const accessToken =
    tokenData.access_token;

  if (!accessToken) {
    throw new Error(
      "Twitter did not return an access token."
    );
  }

  // Get current user
  const userResponse = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=public_metrics,username,name",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const userData =
    await parseJsonResponse(userResponse);

  const user =
    userData.data;

  const metrics =
    user?.public_metrics;

  return {
    accountId:
      user?.id,

    handle:
      user?.username ||
      user?.name ||
      "Twitter User",

    accessToken,

    refreshToken:
      tokenData.refresh_token,

    expiresAt: tokenData.expires_in
      ? Date.now() +
        tokenData.expires_in * 1000
      : undefined,

    followers:
      metrics?.followers_count || 0,

    views: 0,

    engagementRate: 0,
  };
};

// =====================================================
// GOOGLE / YOUTUBE
// =====================================================

export const exchangeGoogleCode = async ({
  code,
  redirectUri,
}) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error(
      "GOOGLE_CLIENT_ID is not configured."
    );
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "GOOGLE_CLIENT_SECRET is not configured."
    );
  }

  const params = new URLSearchParams({
    code,
    client_id:
      process.env.GOOGLE_CLIENT_ID,

    client_secret:
      process.env.GOOGLE_CLIENT_SECRET,

    redirect_uri: redirectUri,

    grant_type:
      "authorization_code",
  });

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  const tokenData =
    await parseJsonResponse(response);

  const accessToken =
    tokenData.access_token;

  if (!accessToken) {
    throw new Error(
      "Google did not return an access token."
    );
  }

  // Get YouTube channel
  const channelResponse = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const channelData =
    await parseJsonResponse(
      channelResponse
    );

  const channel =
    channelData.items?.[0];

  if (!channel) {
    throw new Error(
      "No YouTube channel was found for this Google account."
    );
  }

  const statistics =
    channel.statistics || {};

  const snippet =
    channel.snippet || {};

  const followers = parseInt(
    statistics.subscriberCount || "0",
    10
  );

  const views = parseInt(
    statistics.viewCount || "0",
    10
  );

  return {
    accountId:
      channel.id,

    handle:
      snippet.customUrl ||
      snippet.title ||
      "YouTube Channel",

    accessToken,

    refreshToken:
      tokenData.refresh_token,

    expiresAt: tokenData.expires_in
      ? Date.now() +
        tokenData.expires_in * 1000
      : undefined,

    followers,

    subscribers: followers,

    views,

    engagementRate:
      followers > 0
        ? Math.round(
            (views / followers) *
              0.04 *
              100
          ) / 100
        : 0,
  };
};