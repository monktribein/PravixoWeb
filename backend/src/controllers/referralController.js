import { query } from "../config/postgres.js";
import { getActiveReferralSettings } from "../services/referralService.js";
import { getUniqueReferralCode, generateTypedReferralCode } from "../utils/referralCode.js";

// Helper: resolve profile UUID
const resolveProfile = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [idOrUserId]
  );
  return res.rows[0] || null;
};

/**
 * GET /api/referrals/my-referral
 * Returns logged-in creator's referral code, link, rules, and reward details.
 */
export const getMyReferralDetails = async (req, res) => {
  try {
    const creatorId = req.user?._id;
    if (!creatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const profile = await resolveProfile(creatorId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Creator profile not found." });
    }

    let code = profile.referral_code;
    // Auto-generate referral code for creators if they don't have one yet
    if (!code && profile.role === "creator") {
      code = await getUniqueReferralCode();
      await query(`UPDATE profiles SET referral_code = $1 WHERE id = $2`, [code, profile.id]);
    }

    const settings = await getActiveReferralSettings();
    const origin = req.headers.origin || "https://previxo.com";
    const referralLink = `${origin}/register?ref=${code || ""}`;

    return res.status(200).json({
      success: true,
      data: {
        referralCode: code || "",
        referralLink,
        referralCount: Number(profile.referral_count || 0),
        rewardAmount: settings.rewardAmount,
        currency: settings.currency,
        qualificationTrigger: settings.qualificationTrigger,
        isEnabled: settings.isEnabled,
        terms: settings.terms,
      },
    });
  } catch (error) {
    console.error("getMyReferralDetails error:", error);
    return res.status(500).json({ success: false, message: "Failed to load referral details." });
  }
};

/**
 * GET /api/referrals/stats
 * Returns breakdown of user's referrals and earnings.
 */
export const getMyReferralStats = async (req, res) => {
  try {
    const creatorId = req.user?._id;
    if (!creatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const profile = await resolveProfile(creatorId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const [totalRefRes, pendingRefRes, qualifiedRefRes, rewardsRes] = await Promise.all([
      query(`SELECT COUNT(*) as c FROM referrals WHERE referrer_creator_id = $1`, [profile.id]),
      query(
        `SELECT COUNT(*) as c FROM referrals WHERE referrer_creator_id = $1 AND status IN ('pending', 'registered', 'reward_pending')`,
        [profile.id]
      ),
      query(
        `SELECT COUNT(*) as c FROM referrals WHERE referrer_creator_id = $1 AND status IN ('qualified', 'reward_credited')`,
        [profile.id]
      ),
      query(
        `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as cnt FROM referral_rewards WHERE recipient_profile_id = $1 AND status = 'credited'`,
        [profile.id]
      ),
    ]);

    const totalReferrals = parseInt(totalRefRes.rows[0]?.c || "0", 10);
    const pendingReferrals = parseInt(pendingRefRes.rows[0]?.c || "0", 10);
    const qualifiedReferrals = parseInt(qualifiedRefRes.rows[0]?.c || "0", 10);
    const totalRewardsEarned = Number(rewardsRes.rows[0]?.total || 0);
    const rewardCount = parseInt(rewardsRes.rows[0]?.cnt || "0", 10);

    return res.status(200).json({
      success: true,
      data: {
        totalReferrals,
        pendingReferrals,
        qualifiedReferrals,
        totalRewardsEarned,
        rewardCount,
      },
    });
  } catch (error) {
    console.error("getMyReferralStats error:", error);
    return res.status(500).json({ success: false, message: "Failed to load referral stats." });
  }
};

/**
 * GET /api/referrals/list
 * Returns paginated list of creators referred by the authenticated creator.
 */
export const getMyReferralsList = async (req, res) => {
  try {
    const creatorId = req.user?._id;
    if (!creatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const profile = await resolveProfile(creatorId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search ? req.query.search.trim().toLowerCase() : "";

    const userCodes = [profile.referral_code].filter(Boolean);

    // 1. Fetch ReferralRelationships
    const relsRes = await query(
      `
      SELECT
        rr.*,
        p.id as ref_id,
        p.full_name,
        p.email,
        p.handle,
        p.avatar_url,
        p.role as user_role,
        p.created_at as user_created_at,
        p.verification_status
      FROM referral_relationships rr
      LEFT JOIN profiles p ON p.id = rr.referred_id
      WHERE rr.referrer_id = $1 OR rr.referral_code_used = ANY($2::text[])
      ORDER BY rr.created_at DESC
      `,
      [profile.id, userCodes.length > 0 ? userCodes : ["__NO_CODE__"]]
    );

    // 2. Fetch directly referred profiles
    const profsRes = await query(
      `
      SELECT id, full_name, email, handle, avatar_url, role, created_at, verification_status, referral_code
      FROM profiles
      WHERE referred_by_user_id = $1
      ORDER BY created_at DESC
      `,
      [profile.id]
    );

    const referredMap = new Map();

    for (const rel of relsRes.rows) {
      if (!rel.referred_id) continue;
      const uid = String(rel.referred_id);
      referredMap.set(uid, {
        _id: rel.referred_id,
        id: rel.referred_id,
        relationshipId: rel.id,
        fullName: rel.full_name || "Creator",
        handle: rel.handle ? `@${rel.handle.replace(/^@/, "")}` : "",
        email: rel.email || "",
        avatarUrl: rel.avatar_url || "",
        role: rel.user_role || rel.referred_type || "creator",
        verificationStatus: rel.verification_status || "pending",
        referralCode: rel.referral_code_used || userCodes[0] || "",
        status: rel.status || "active",
        commissionPercent: Number(rel.commission_percent || 5.0),
        date: rel.created_at || rel.user_created_at,
      });
    }

    for (const p of profsRes.rows) {
      const uid = String(p.id);
      if (!referredMap.has(uid)) {
        referredMap.set(uid, {
          _id: p.id,
          id: p.id,
          relationshipId: null,
          fullName: p.full_name || "Creator",
          handle: p.handle ? `@${p.handle.replace(/^@/, "")}` : "",
          email: p.email || "",
          avatarUrl: p.avatar_url || "",
          role: p.role || "creator",
          verificationStatus: p.verification_status || "pending",
          referralCode: userCodes[0] || "",
          status: "active",
          commissionPercent: 5.0,
          date: p.created_at || new Date(),
        });
      }
    }

    const allReferred = Array.from(referredMap.values());
    const referredUuids = allReferred.map((r) => r.id);

    // Earnings per referred user
    let userPayoutMap = new Map();
    let commissionByReferredUserMap = new Map();

    if (referredUuids.length > 0) {
      const payoutsRes = await query(
        `
        SELECT creator_id, SUM(amount) as total_earned, COUNT(*) as project_count
        FROM wallet_transactions
        WHERE creator_id = ANY($1::uuid[]) AND transaction_type = 'project_payout' AND status = 'COMPLETED'
        GROUP BY creator_id
        `,
        [referredUuids]
      );
      payoutsRes.rows.forEach((up) => {
        userPayoutMap.set(String(up.creator_id), {
          totalEarned: Number(Number(up.total_earned || 0).toFixed(2)),
          projectCount: parseInt(up.project_count || "0", 10),
        });
      });

      const commsRes = await query(
        `
        SELECT *
        FROM wallet_transactions
        WHERE creator_id = $1 AND transaction_type = 'referral_commission' AND status = 'COMPLETED'
        `,
        [profile.id]
      );
      commsRes.rows.forEach((tx) => {
        let linkedReferredUserId = null;
        if (tx.related_referral_id) {
          const found = allReferred.find(
            (r) => r.relationshipId && String(r.relationshipId) === String(tx.related_referral_id)
          );
          if (found) linkedReferredUserId = String(found.id);
        }
        if (!linkedReferredUserId && tx.description) {
          for (const ref of allReferred) {
            if (tx.description.toLowerCase().includes(ref.fullName.toLowerCase())) {
              linkedReferredUserId = String(ref.id);
              break;
            }
          }
        }
        if (linkedReferredUserId) {
          const curr = commissionByReferredUserMap.get(linkedReferredUserId) || 0;
          commissionByReferredUserMap.set(linkedReferredUserId, curr + Number(tx.amount || 0));
        }
      });
    }

    let enrichedList = allReferred.map((ref) => {
      const uid = String(ref.id);
      const payoutStats = userPayoutMap.get(uid) || { totalEarned: 0, projectCount: 0 };
      const commEarned = Number((commissionByReferredUserMap.get(uid) || 0).toFixed(2));

      return {
        ...ref,
        referredUserEarnings: payoutStats.totalEarned,
        projectCount: payoutStats.projectCount,
        commissionEarned: commEarned,
      };
    });

    if (search) {
      enrichedList = enrichedList.filter(
        (r) =>
          r.fullName.toLowerCase().includes(search) ||
          r.handle.toLowerCase().includes(search) ||
          r.email.toLowerCase().includes(search) ||
          r.referralCode.toLowerCase().includes(search)
      );
    }

    enrichedList.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = enrichedList.length;
    const skip = (page - 1) * limit;
    const paginated = enrichedList.slice(skip, skip + limit);
    const totalCommissionEarned = enrichedList.reduce((sum, r) => sum + r.commissionEarned, 0);

    return res.status(200).json({
      success: true,
      data: {
        referrals: paginated,
        total,
        totalCommissionEarned: Number(totalCommissionEarned.toFixed(2)),
        activeCount: enrichedList.filter((r) => r.status === "active").length,
        pagination: {
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("getMyReferralsList error:", error);
    return res.status(500).json({ success: false, message: "Failed to load referrals list." });
  }
};

/**
 * POST /api/referrals/validate
 * Public endpoint to validate a referral code during signup or pre-check.
 */
export const validateReferralCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ success: false, valid: false, message: "Referral code is required." });
    }

    const normalizedCode = code.trim().toUpperCase();
    const refRes = await query(
      `SELECT id, full_name, role, verification_status FROM profiles WHERE UPPER(referral_code) = $1 LIMIT 1`,
      [normalizedCode]
    );

    if (refRes.rows.length === 0) {
      return res.status(404).json({ success: false, valid: false, message: "Invalid referral code." });
    }

    const referrer = refRes.rows[0];
    const settings = await getActiveReferralSettings();
    if (!settings.isEnabled) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Referral campaign is currently paused.",
      });
    }

    const parts = (referrer.full_name || "Creator").split(" ");
    const referrerDisplayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];

    return res.status(200).json({
      success: true,
      valid: true,
      data: {
        referralCode: normalizedCode,
        referrerName: referrerDisplayName,
        rewardAmount: settings.rewardAmount,
        currency: settings.currency,
      },
    });
  } catch (error) {
    console.error("validateReferralCode error:", error);
    return res.status(500).json({ success: false, valid: false, message: "Error validating code." });
  }
};

/**
 * Helper to prevent circular referral chains
 */
const hasCircularReferralChain = async (potentialReferrerId, redeemingUserId) => {
  let currentId = potentialReferrerId;
  const visited = new Set();

  while (currentId) {
    if (String(currentId) === String(redeemingUserId)) {
      return true;
    }
    if (visited.has(String(currentId))) {
      break;
    }
    visited.add(String(currentId));

    const res = await query(`SELECT referred_by_user_id FROM profiles WHERE id = $1`, [currentId]);
    currentId = res.rows[0]?.referred_by_user_id || null;
  }

  return false;
};

/**
 * GET /api/v1/referrals/my-code
 */
export const getMyReferralCode = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const profile = await resolveProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    let code = profile.referral_code;
    const rolePrefix = profile.role === "brand" ? "BR" : "CR";
    const pattern = new RegExp(`^${rolePrefix}-[A-Z0-9]{5}$`);

    if (!code || !pattern.test(code)) {
      code = await generateTypedReferralCode(profile.role);
      await query(`UPDATE profiles SET referral_code = $1 WHERE id = $2`, [code, profile.id]);
    }

    const origin = process.env.FRONTEND_URL || req.headers.origin || "https://platform.com";
    const cleanOrigin = origin.replace(/\/+$/, "");
    const referral_link = `${cleanOrigin}/join?ref=${code}`;

    const codeData = {
      referral_code: code,
      referral_link,
    };

    return res.status(200).json({
      success: true,
      data: codeData,
      ...codeData,
    });
  } catch (error) {
    console.error("getMyReferralCode error:", error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

/**
 * POST /api/v1/referrals/redeem
 */
export const redeemReferralCode = async (req, res) => {
  try {
    const redeemingUserId = req.user?._id;
    if (!redeemingUserId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const { referral_code } = req.body;
    if (!referral_code || typeof referral_code !== "string") {
      return res.status(400).json({ error: "INVALID_REFERRAL", reason: "missing_code" });
    }

    const normalizedCode = referral_code.trim().toUpperCase();
    const redeemingUser = await resolveProfile(redeemingUserId);
    if (!redeemingUser) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    if (redeemingUser.referred_by_user_id) {
      return res.status(409).json({ error: "USER_ALREADY_REFERRED" });
    }

    const refRes = await query(
      `SELECT * FROM profiles WHERE UPPER(referral_code) = $1 LIMIT 1`,
      [normalizedCode]
    );
    if (refRes.rows.length === 0) {
      return res.status(400).json({ error: "INVALID_REFERRAL", reason: "invalid_code" });
    }

    const referrer = refRes.rows[0];
    if (String(referrer.id) === String(redeemingUser.id)) {
      return res.status(400).json({ error: "INVALID_REFERRAL", reason: "self_referral" });
    }

    const isCircular = await hasCircularReferralChain(referrer.id, redeemingUser.id);
    if (isCircular) {
      return res.status(400).json({ error: "INVALID_REFERRAL", reason: "circular_referral" });
    }

    const referrerType = referrer.role === "brand" ? "brand" : "creator";
    const referredType = redeemingUser.role === "brand" ? "brand" : "creator";

    let commissionPercent = 5.0;
    const activeSettings = await getActiveReferralSettings();
    if (activeSettings && typeof activeSettings.commission_percent === "number") {
      commissionPercent = activeSettings.commission_percent;
    }

    const insertRelRes = await query(
      `
      INSERT INTO referral_relationships (
        referrer_id, referrer_type, referred_id, referred_type,
        referral_code_used, status, commission_percent
      ) VALUES ($1, $2, $3, $4, $5, 'active', $6)
      RETURNING *;
      `,
      [referrer.id, referrerType, redeemingUser.id, referredType, normalizedCode, commissionPercent]
    );

    await query(`UPDATE profiles SET referred_by_user_id = $1 WHERE id = $2`, [referrer.id, redeemingUser.id]);
    await query(`UPDATE profiles SET referral_count = COALESCE(referral_count, 0) + 1 WHERE id = $1`, [referrer.id]);

    return res.status(200).json({
      success: true,
      referral_relationship_id: insertRelRes.rows[0].id,
      referrer: {
        id: referrer.id,
        name: referrer.full_name,
        type: referrerType,
      },
      commission_percent: commissionPercent,
    });
  } catch (error) {
    console.error("redeemReferralCode error:", error);
    if (error.code === "23505") {
      return res.status(409).json({ error: "USER_ALREADY_REFERRED" });
    }
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

/**
 * GET /api/v1/referrals/earnings
 */
export const getReferralEarnings = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const profile = await resolveProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const [activeRelRes, totalEarnedRes, txsRes] = await Promise.all([
      query(
        `SELECT COUNT(*) as c FROM referral_relationships WHERE referrer_id = $1 AND status = 'active'`,
        [profile.id]
      ),
      query(
        `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM wallet_transactions
        WHERE creator_id = $1 AND transaction_type = 'referral_commission' AND status = 'COMPLETED'
        `,
        [profile.id]
      ),
      query(
        `
        SELECT
          wt.*,
          COALESCE(p.full_name, p.handle, 'Referred User') as referred_user_name
        FROM wallet_transactions wt
        LEFT JOIN referral_relationships rr ON rr.id = wt.related_referral_id
        LEFT JOIN profiles p ON p.id = rr.referred_id
        WHERE wt.creator_id = $1 AND wt.transaction_type = 'referral_commission' AND wt.status = 'COMPLETED'
        ORDER BY wt.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [profile.id, limit, offset]
      ),
    ]);

    const active_referrals_count = parseInt(activeRelRes.rows[0]?.c || "0", 10);
    const total_earned = Number(Number(totalEarnedRes.rows[0]?.total || 0).toFixed(2));

    const earnings = txsRes.rows.map((tx) => ({
      referred_user_name: tx.referred_user_name,
      project_id: String(tx.campaign_id || tx.connection_id || ""),
      commission_amount: Number(Number(tx.amount || 0).toFixed(2)),
      date: tx.created_at ? new Date(tx.created_at).toISOString() : new Date().toISOString(),
    }));

    const payload = {
      total_earned,
      active_referrals_count,
      earnings,
    };

    return res.status(200).json({
      success: true,
      data: payload,
      ...payload,
    });
  } catch (error) {
    console.error("getReferralEarnings error:", error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

/**
 * GET /api/referrals/analytics
 */
export const getReferralAnalytics = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const profile = await resolveProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const timeframe = req.query.timeframe || "6m";
    const now = new Date();
    let startDate = new Date(0);
    if (timeframe === "1m") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (timeframe === "3m") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (timeframe === "6m") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (timeframe === "1y") {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    const [relsRes, commsRes] = await Promise.all([
      query(
        `
        SELECT rr.*, p.full_name, p.handle, p.email, p.avatar_url, p.role as user_role
        FROM referral_relationships rr
        LEFT JOIN profiles p ON p.id = rr.referred_id
        WHERE rr.referrer_id = $1
        `,
        [profile.id]
      ),
      query(
        `
        SELECT *
        FROM wallet_transactions
        WHERE creator_id = $1 AND transaction_type = 'referral_commission' AND status = 'COMPLETED'
        ORDER BY created_at ASC
        `,
        [profile.id]
      ),
    ]);

    const total_earned = commsRes.rows.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const filteredTxs = commsRes.rows.filter((tx) => {
      const txDate = new Date(tx.created_at || Date.now());
      return txDate >= startDate;
    });

    const chartMap = new Map();
    const isShortTimeframe = timeframe === "1m";

    if (isShortTimeframe) {
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 2)) {
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        chartMap.set(label, { label, amount: 0, count: 0 });
      }
    } else {
      for (let m = new Date(startDate); m <= now; m.setMonth(m.getMonth() + 1)) {
        const label = m.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        chartMap.set(label, { label, amount: 0, count: 0 });
      }
    }

    filteredTxs.forEach((tx) => {
      const d = new Date(tx.created_at || Date.now());
      const label = isShortTimeframe
        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      const existing = chartMap.get(label) || { label, amount: 0, count: 0 };
      existing.amount = Number((existing.amount + Number(tx.amount || 0)).toFixed(2));
      existing.count += 1;
      chartMap.set(label, existing);
    });

    const chartData = Array.from(chartMap.values());
    const creatorsCount = relsRes.rows.filter((r) => r.user_role === "creator").length;
    const brandsCount = relsRes.rows.filter((r) => r.user_role === "brand").length;

    const performers = relsRes.rows.map((r) => ({
      _id: r.referred_id,
      id: r.referred_id,
      fullName: r.full_name || "User",
      handle: r.handle || "",
      avatarUrl: r.avatar_url || "",
      role: r.user_role || "creator",
      commissionEarned: 0,
      totalVolume: 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        total_earned: Number(total_earned.toFixed(2)),
        timeframe_earned: Number(filteredTxs.reduce((s, t) => s + Number(t.amount || 0), 0).toFixed(2)),
        active_referrals_count: relsRes.rows.length,
        creators_count: creatorsCount,
        brands_count: brandsCount,
        chartData,
        topPerformers: performers.slice(0, 10),
        allReferrals: performers,
      },
    });
  } catch (error) {
    console.error("getReferralAnalytics error:", error);
    return res.status(500).json({ success: false, message: "Failed to load referral analytics." });
  }
};

/**
 * POST /api/v1/admin/referrals/:id/revoke
 */
export const revokeReferralRelationship = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `
      UPDATE referral_relationships SET
        status = 'revoked',
        updated_at = NOW()
      WHERE id::text = $1
      RETURNING *;
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "REFERRAL_RELATIONSHIP_NOT_FOUND" });
    }

    return res.status(200).json({ status: "revoked" });
  } catch (error) {
    console.error("revokeReferralRelationship error:", error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

/**
 * GET /api/v1/admin/referrals
 */
export const listAdminReferralRelationships = async (req, res) => {
  try {
    const { status, search } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`rr.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const sIdx = params.length;
      conditions.push(`(
        LOWER(ref.full_name) LIKE $${sIdx} OR
        LOWER(ref.email) LIKE $${sIdx} OR
        LOWER(refe.full_name) LIKE $${sIdx} OR
        LOWER(refe.email) LIKE $${sIdx} OR
        LOWER(rr.referral_code_used) LIKE $${sIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
      `
      SELECT
        rr.*,
        ref.id as referrer_id,
        ref.full_name as referrer_name,
        ref.email as referrer_email,
        ref.handle as referrer_handle,
        refe.id as referred_id,
        refe.full_name as referred_name,
        refe.email as referred_email,
        refe.handle as referred_handle,
        COALESCE((
          SELECT SUM(amount) FROM wallet_transactions WHERE related_referral_id = rr.id AND status = 'COMPLETED'
        ), 0) as total_commission_paid
      FROM referral_relationships rr
      LEFT JOIN profiles ref ON ref.id = rr.referrer_id
      LEFT JOIN profiles refe ON refe.id = rr.referred_id
      ${whereClause}
      ORDER BY rr.created_at DESC;
      `,
      params
    );

    const formattedData = rows.map((rel) => ({
      id: rel.id,
      referrer_id: rel.referrer_id,
      referrer_name: rel.referrer_name || "Unknown Referrer",
      referrer_email: rel.referrer_email || "",
      referrer_handle: rel.referrer_handle ? `@${rel.referrer_handle.replace(/^@/, "")}` : "",
      referrer_type: rel.referrer_type,
      referred_id: rel.referred_id,
      referred_name: rel.referred_name || "Unknown Referred",
      referred_email: rel.referred_email || "",
      referred_handle: rel.referred_handle ? `@${rel.referred_handle.replace(/^@/, "")}` : "",
      referred_type: rel.referred_type,
      referral_code_used: rel.referral_code_used || "N/A",
      status: rel.status,
      commission_percent: Number(rel.commission_percent || 5.0),
      total_commission_paid: Number(rel.total_commission_paid || 0),
      created_at: rel.created_at,
    }));

    return res.status(200).json({
      success: true,
      count: formattedData.length,
      relationships: formattedData,
    });
  } catch (error) {
    console.error("listAdminReferralRelationships error:", error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

/**
 * GET /api/v1/admin/referrals/relationships/:id/transactions
 */
export const getAdminRelationshipTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const relRes = await query(
      `
      SELECT
        rr.*,
        json_build_object(
          '_id', ref.id,
          'id', ref.id,
          'fullName', ref.full_name,
          'email', ref.email,
          'role', ref.role,
          'handle', ref.handle,
          'avatarUrl', ref.avatar_url
        ) as referrer_id,
        json_build_object(
          '_id', refe.id,
          'id', refe.id,
          'fullName', refe.full_name,
          'email', refe.email,
          'role', refe.role,
          'handle', refe.handle,
          'avatarUrl', refe.avatar_url
        ) as referred_id
      FROM referral_relationships rr
      LEFT JOIN profiles ref ON ref.id = rr.referrer_id
      LEFT JOIN profiles refe ON refe.id = rr.referred_id
      WHERE rr.id::text = $1;
      `,
      [id]
    );

    if (relRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Referral relationship not found" });
    }

    const relationship = relRes.rows[0];

    const txsRes = await query(
      `
      SELECT
        wt.*,
        c.title as campaign_title
      FROM wallet_transactions wt
      LEFT JOIN campaigns c ON c.id = wt.campaign_id
      WHERE wt.related_referral_id::text = $1 OR wt.creator_id = $2
      ORDER BY wt.created_at DESC;
      `,
      [id, relationship.referrer_id?.id]
    );

    const transactions = txsRes.rows.map((tx) => ({
      _id: tx.id,
      amount: Number(tx.amount || 0),
      currency: tx.currency || "INR",
      type: tx.type,
      transaction_type: tx.transaction_type,
      status: tx.status,
      referenceId: tx.reference_id,
      description: tx.description,
      date: tx.created_at,
      projectTitle: tx.campaign_title || "Project Collaboration",
    }));

    return res.status(200).json({
      success: true,
      relationship,
      transactions,
    });
  } catch (error) {
    console.error("getAdminRelationshipTransactions error:", error);
    return res.status(500).json({ success: false, message: "Failed to load relationship transactions." });
  }
};
