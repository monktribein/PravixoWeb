import { query } from "../config/postgres.js";
import {
  getActiveReferralSettings,
  processReferralQualification,
} from "../services/referralService.js";

/**
 * GET /api/admin/referrals
 * List all referrals with pagination, filter by status, search by creator name or code.
 */
export const adminListReferrals = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const offset = (page - 1) * limit;
    const { status, search } = req.query;

    const conditions = [];
    const params = [];

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const sIdx = params.length;
      conditions.push(`(
        LOWER(r.referral_code) LIKE $${sIdx} OR
        LOWER(ref.full_name) LIKE $${sIdx} OR
        LOWER(ref.email) LIKE $${sIdx} OR
        LOWER(ref.handle) LIKE $${sIdx} OR
        LOWER(refe.full_name) LIKE $${sIdx} OR
        LOWER(refe.email) LIKE $${sIdx} OR
        LOWER(refe.handle) LIKE $${sIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await query(
      `
      SELECT COUNT(*) as total
      FROM referrals r
      LEFT JOIN profiles ref ON ref.id = r.referrer_creator_id
      LEFT JOIN profiles refe ON refe.id = r.referred_creator_id
      ${whereClause}
      `,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const { rows } = await query(
      `
      SELECT
        r.id,
        r.referrer_creator_id,
        r.referred_creator_id,
        r.referral_code,
        r.status,
        r.qualifying_event,
        r.qualified_at,
        r.created_at,
        r.updated_at,
        json_build_object(
          '_id', ref.id,
          'id', ref.id,
          'fullName', ref.full_name,
          'email', ref.email,
          'handle', ref.handle,
          'avatarUrl', ref.avatar_url
        ) AS "referrerCreatorId",
        json_build_object(
          '_id', refe.id,
          'id', refe.id,
          'fullName', refe.full_name,
          'email', refe.email,
          'handle', refe.handle,
          'avatarUrl', refe.avatar_url,
          'verificationStatus', refe.verification_status
        ) AS "referredCreatorId",
        CASE WHEN rw.id IS NOT NULL THEN
          json_build_object(
            '_id', rw.id,
            'id', rw.id,
            'rewardAmount', rw.amount,
            'status', rw.status,
            'creditedAt', rw.credited_at
          )
        ELSE NULL END AS reward
      FROM referrals r
      LEFT JOIN profiles ref ON ref.id = r.referrer_creator_id
      LEFT JOIN profiles refe ON refe.id = r.referred_creator_id
      LEFT JOIN referral_rewards rw ON rw.referral_id = r.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
      `,
      params
    );

    const formattedData = rows.map((r) => ({
      _id: r.id,
      id: r.id,
      referralCode: r.referral_code,
      status: r.status,
      qualifyingEvent: r.qualifying_event,
      qualifiedAt: r.qualified_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      referrerCreatorId: r.referrerCreatorId,
      referredCreatorId: r.referredCreatorId,
      reward: r.reward,
    }));

    return res.status(200).json({
      success: true,
      data: {
        referrals: formattedData,
        pagination: {
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("adminListReferrals error:", error);
    return res.status(500).json({ success: false, message: "Failed to list referrals." });
  }
};

/**
 * GET /api/admin/referrals/stats
 * Overview analytics for admin referral management.
 */
export const adminGetReferralStats = async (req, res) => {
  try {
    const [
      totalRefRes,
      registeredRes,
      qualifiedRes,
      creditedRes,
      rejectedRes,
      rewardsRes,
      uniqueRefRes,
      totalRelRes,
      activeRelRes,
      commRes,
    ] = await Promise.all([
      query(`SELECT COUNT(*) as c FROM referrals;`),
      query(`SELECT COUNT(*) as c FROM referrals WHERE status = 'registered';`),
      query(`SELECT COUNT(*) as c FROM referrals WHERE status = 'qualified';`),
      query(`SELECT COUNT(*) as c FROM referrals WHERE status = 'reward_credited';`),
      query(`SELECT COUNT(*) as c FROM referrals WHERE status = 'rejected';`),
      query(`SELECT COALESCE(SUM(amount), 0) as total FROM referral_rewards WHERE status = 'credited';`),
      query(`SELECT COUNT(DISTINCT referrer_creator_id) as c FROM referrals;`),
      query(`SELECT COUNT(*) as c FROM referral_relationships;`),
      query(`SELECT COUNT(*) as c FROM referral_relationships WHERE status = 'active';`),
      query(`SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE transaction_type = 'referral_commission' AND status = 'COMPLETED';`),
    ]);

    const totalReferrals = parseInt(totalRefRes.rows[0]?.c || "0", 10);
    const registeredCount = parseInt(registeredRes.rows[0]?.c || "0", 10);
    const qualifiedCount = parseInt(qualifiedRes.rows[0]?.c || "0", 10);
    const rewardCreditedCount = parseInt(creditedRes.rows[0]?.c || "0", 10);
    const rejectedCount = parseInt(rejectedRes.rows[0]?.c || "0", 10);
    const signupRewardsDisbursed = Number(rewardsRes.rows[0]?.total || 0);
    const recurringCommissionsDisbursed = Number(commRes.rows[0]?.total || 0);
    const totalRewardsDisbursed = Number((signupRewardsDisbursed + recurringCommissionsDisbursed).toFixed(2));
    const totalRelationships = parseInt(totalRelRes.rows[0]?.c || "0", 10);
    const activeRelationships = parseInt(activeRelRes.rows[0]?.c || "0", 10);
    const totalUniqueReferrers = parseInt(uniqueRefRes.rows[0]?.c || "0", 10);

    return res.status(200).json({
      success: true,
      data: {
        totalReferrals,
        registeredCount,
        qualifiedCount,
        rewardCreditedCount,
        rejectedCount,
        totalRewardsDisbursed,
        signupRewardsDisbursed,
        recurringCommissionsDisbursed,
        totalRelationships,
        activeRelationships,
        totalUniqueReferrers,
      },
    });
  } catch (error) {
    console.error("adminGetReferralStats error:", error);
    return res.status(500).json({ success: false, message: "Failed to load referral stats." });
  }
};

/**
 * GET /api/admin/referrals/settings
 * Fetch current referral campaign settings.
 */
export const adminGetReferralSettings = async (req, res) => {
  try {
    const settings = await getActiveReferralSettings();
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error("adminGetReferralSettings error:", error);
    return res.status(500).json({ success: false, message: "Failed to load settings." });
  }
};

/**
 * PUT /api/admin/referrals/settings
 * Update referral campaign settings.
 */
export const adminUpdateReferralSettings = async (req, res) => {
  try {
    const {
      isEnabled,
      rewardAmount,
      qualificationTrigger,
      maxReferralsPerUser,
      campaignExpiryDate,
      terms,
    } = req.body;

    const findRes = await query(`SELECT id FROM referral_settings LIMIT 1;`);
    let settingsRow;

    if (findRes.rows.length === 0) {
      const insRes = await query(
        `
        INSERT INTO referral_settings (
          is_enabled, reward_amount, qualification_trigger, max_referrals_per_user,
          campaign_expiry_date, terms
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING *;
        `,
        [
          isEnabled !== undefined ? Boolean(isEnabled) : true,
          rewardAmount !== undefined ? Number(rewardAmount) : 500,
          qualificationTrigger || "profile_verified",
          maxReferralsPerUser !== undefined ? Number(maxReferralsPerUser) : 0,
          campaignExpiryDate ? new Date(campaignExpiryDate) : null,
          JSON.stringify(terms || []),
        ]
      );
      settingsRow = insRes.rows[0];
    } else {
      const updRes = await query(
        `
        UPDATE referral_settings SET
          is_enabled = COALESCE($1, is_enabled),
          reward_amount = COALESCE($2, reward_amount),
          qualification_trigger = COALESCE($3, qualification_trigger),
          max_referrals_per_user = COALESCE($4, max_referrals_per_user),
          campaign_expiry_date = COALESCE($5, campaign_expiry_date),
          terms = COALESCE($6::jsonb, terms),
          updated_at = NOW()
        WHERE id = $7
        RETURNING *;
        `,
        [
          isEnabled !== undefined ? Boolean(isEnabled) : null,
          rewardAmount !== undefined ? Number(rewardAmount) : null,
          qualificationTrigger || null,
          maxReferralsPerUser !== undefined ? Number(maxReferralsPerUser) : null,
          campaignExpiryDate ? new Date(campaignExpiryDate) : null,
          terms ? JSON.stringify(terms) : null,
          findRes.rows[0].id,
        ]
      );
      settingsRow = updRes.rows[0];
    }

    return res.status(200).json({
      success: true,
      message: "Referral settings updated successfully.",
      data: {
        id: settingsRow.id,
        isEnabled: settingsRow.is_enabled,
        rewardAmount: Number(settingsRow.reward_amount || 0),
        currency: settingsRow.currency || "INR",
        qualificationTrigger: settingsRow.qualification_trigger,
        maxReferralsPerUser: Number(settingsRow.max_referrals_per_user || 0),
        campaignExpiryDate: settingsRow.campaign_expiry_date,
        terms: settingsRow.terms,
      },
    });
  } catch (error) {
    console.error("adminUpdateReferralSettings error:", error);
    return res.status(500).json({ success: false, message: "Failed to update settings." });
  }
};

/**
 * POST /api/admin/referrals/:id/qualify
 * Manually qualify a referral and disburse reward immediately.
 */
export const adminManuallyQualifyReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const refRes = await query(`SELECT * FROM referrals WHERE id::text = $1;`, [id]);
    if (refRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Referral not found." });
    }

    const referral = refRes.rows[0];
    const result = await processReferralQualification({
      referredCreatorId: referral.referred_creator_id,
      triggerType: "admin_manual",
      adminOverride: true,
      notes: "Manually qualified by Admin",
    });

    if (!result.success && !result.alreadyCredited) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("adminManuallyQualifyReferral error:", error);
    return res.status(500).json({ success: false, message: "Failed to manually qualify referral." });
  }
};

/**
 * POST /api/admin/referrals/:id/reject
 * Reject a referral for fraud / violation.
 */
export const adminRejectReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const refRes = await query(`SELECT * FROM referrals WHERE id::text = $1;`, [id]);
    if (refRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Referral not found." });
    }

    const referral = refRes.rows[0];
    if (referral.status === "reward_credited") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject a referral whose reward has already been credited.",
      });
    }

    const updRes = await query(
      `
      UPDATE referrals SET
        status = 'rejected',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
      `,
      [referral.id]
    );

    return res.status(200).json({
      success: true,
      message: "Referral rejected successfully.",
      data: updRes.rows[0],
    });
  } catch (error) {
    console.error("adminRejectReferral error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject referral." });
  }
};
