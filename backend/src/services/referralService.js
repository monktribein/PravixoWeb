import { query } from "../config/postgres.js";
import { formatProfile, formatWallet, formatWalletTransaction } from "../utils/formatters.js";
import { creditCreatorWallet } from "../controllers/walletController.js";
import { sendPushToUser } from "../utils/webPush.js";
import { appEvents } from "../utils/eventEmitter.js";

/**
 * Retrieve active referral campaign settings or initialize default settings if none exists.
 */
export const getActiveReferralSettings = async () => {
  let res = await query(`SELECT * FROM referral_settings LIMIT 1`);
  if (res.rows.length === 0) {
    const defaultTerms = JSON.stringify([
      "Invite other creators to Previxo using your unique referral link.",
      "When the referred creator registers and completes profile verification, your reward is credited.",
      "Rewards are credited directly to your Previxo Creator Wallet.",
      "Self-referrals and duplicate accounts are strictly prohibited and will be disqualified.",
    ]);
    const insertRes = await query(
      `INSERT INTO referral_settings (
        is_enabled, reward_amount, currency, qualification_trigger, max_referrals_per_user, terms
      ) VALUES (true, 500, 'INR', 'profile_verified', 0, $1::jsonb)
      RETURNING *`,
      [defaultTerms]
    );
    return {
      id: insertRes.rows[0].id,
      isEnabled: insertRes.rows[0].is_enabled,
      rewardAmount: Number(insertRes.rows[0].reward_amount || 500),
      currency: insertRes.rows[0].currency || "INR",
      qualificationTrigger: insertRes.rows[0].qualification_trigger || "profile_verified",
      maxReferralsPerUser: Number(insertRes.rows[0].max_referrals_per_user || 0),
      campaignExpiryDate: insertRes.rows[0].campaign_expiry_date,
      terms: insertRes.rows[0].terms,
    };
  }

  const r = res.rows[0];
  return {
    id: r.id,
    isEnabled: r.is_enabled,
    rewardAmount: Number(r.reward_amount || 500),
    currency: r.currency || "INR",
    qualificationTrigger: r.qualification_trigger || "profile_verified",
    maxReferralsPerUser: Number(r.max_referrals_per_user || 0),
    campaignExpiryDate: r.campaign_expiry_date,
    terms: r.terms,
  };
};

/**
 * Creates a referral record between referrer and referred creator.
 */
export const recordReferralOnSignup = async ({ referralCode, newCreatorProfile }) => {
  if (!referralCode || !newCreatorProfile) {
    return { success: false, reason: "Missing parameters" };
  }

  const normalizedCode = referralCode.trim().toUpperCase();

  // Find referring profile
  const referrerRes = await query(
    `SELECT * FROM profiles WHERE UPPER(referral_code) = $1 LIMIT 1`,
    [normalizedCode]
  );
  if (referrerRes.rows.length === 0) {
    return { success: false, reason: "Invalid referral code" };
  }
  const referrer = formatProfile(referrerRes.rows[0]);

  // Prevent self-referral
  const newProfileId = newCreatorProfile.id || newCreatorProfile._id;
  if (
    String(referrer.id) === String(newProfileId) ||
    referrer.email.toLowerCase() === (newCreatorProfile.email || "").toLowerCase()
  ) {
    return { success: false, reason: "Self-referral is not allowed" };
  }

  // Check campaign settings
  const settings = await getActiveReferralSettings();
  if (!settings.isEnabled) {
    return { success: false, reason: "Referral campaign is currently paused" };
  }

  if (settings.campaignExpiryDate && new Date(settings.campaignExpiryDate) < new Date()) {
    return { success: false, reason: "Referral campaign has expired" };
  }

  // Check max referrals per user limit
  const refCountRes = await query(
    `SELECT COUNT(*)::int as count FROM referrals WHERE referrer_creator_id = $1`,
    [referrer.id]
  );
  const currentReferrals = refCountRes.rows[0]?.count || 0;
  if (settings.maxReferralsPerUser > 0 && currentReferrals >= settings.maxReferralsPerUser) {
    return { success: false, reason: "Referrer has reached the maximum referral limit" };
  }

  // Prevent duplicate referral
  const existingRes = await query(
    `SELECT id FROM referrals WHERE referred_creator_id = $1 LIMIT 1`,
    [newProfileId]
  );
  if (existingRes.rows.length > 0) {
    return { success: false, reason: "Creator has already been referred" };
  }

  // Create Referral record
  const insertRefRes = await query(
    `INSERT INTO referrals (
      referrer_creator_id, referred_creator_id, referral_code, status, qualification_condition, reward_amount, currency
    ) VALUES ($1, $2, $3, 'registered', $4, $5, $6)
    RETURNING *`,
    [
      referrer.id,
      newProfileId,
      normalizedCode,
      settings.qualificationTrigger,
      settings.rewardAmount,
      settings.currency,
    ]
  );
  const referral = insertRefRes.rows[0];

  // Notify referrer of registration
  try {
    const notifText = `${newCreatorProfile.fullName || "A creator"} registered using your referral code! Reward will be credited upon qualification.`;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at, created_at_dt)
       VALUES ($1, $2, 'referral_registered', $3, '/dashboard', $4::jsonb, $5, NOW())`,
      [
        referrer.id,
        newProfileId,
        notifText,
        JSON.stringify({
          referralId: referral.id,
          referredCreatorId: newProfileId,
          referredCreatorName: newCreatorProfile.fullName,
        }),
        Date.now(),
      ]
    );

    sendPushToUser(referrer.id, {
      title: "New Referral Registered!",
      body: notifText,
      url: "/dashboard",
    }).catch(() => {});
  } catch (err) {
    console.error("[ReferralService] Notification error on registration:", err);
  }

  // If trigger condition is "on_register", qualify immediately
  if (settings.qualificationTrigger === "on_register") {
    await processReferralQualification({
      referredCreatorId: newProfileId,
      triggerType: "on_register",
    });
  }

  return { success: true, referral };
};

/**
 * Qualify a referral and disburse reward to the referring creator.
 */
export const processReferralQualification = async ({
  referredCreatorId,
  triggerType = "profile_verified",
  adminOverride = false,
  notes = "",
}) => {
  if (!referredCreatorId) return { success: false, message: "Missing referredCreatorId" };

  const settings = await getActiveReferralSettings();

  if (!adminOverride && !settings.isEnabled) {
    return { success: false, message: "Referral campaign is disabled." };
  }

  const refRes = await query(
    `SELECT * FROM referrals WHERE referred_creator_id::text = $1 LIMIT 1`,
    [String(referredCreatorId)]
  );
  if (refRes.rows.length === 0) {
    return { success: false, message: "No referral record found for this creator." };
  }
  const referral = refRes.rows[0];

  if (referral.status === "reward_credited") {
    return {
      success: true,
      message: "Referral has already qualified and reward has been credited.",
      alreadyCredited: true,
      referral,
    };
  }

  if (referral.status === "rejected") {
    return { success: false, message: "Referral was rejected." };
  }

  if (
    !adminOverride &&
    settings.qualificationTrigger !== "on_register" &&
    settings.qualificationTrigger !== triggerType
  ) {
    return {
      success: false,
      message: `Trigger type (${triggerType}) does not match configured campaign trigger (${settings.qualificationTrigger}).`,
    };
  }

  const rewardAmount = Number(settings.rewardAmount || 0);

  // Mark as qualified
  await query(
    `UPDATE referrals SET status = 'qualified', qualified_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [referral.id]
  );

  if (rewardAmount <= 0) {
    await query(
      `UPDATE referrals SET status = 'reward_credited', updated_at = NOW() WHERE id = $1`,
      [referral.id]
    );
    return { success: true, referral, rewardAmount: 0 };
  }

  // Check if reward record already exists
  const rewRes = await query(
    `SELECT * FROM referral_rewards WHERE referral_id = $1 LIMIT 1`,
    [referral.id]
  );
  if (rewRes.rows.length > 0 && rewRes.rows[0].status === "credited") {
    await query(
      `UPDATE referrals SET status = 'reward_credited', updated_at = NOW() WHERE id = $1`,
      [referral.id]
    );
    return {
      success: true,
      message: "Reward already credited.",
      reward: rewRes.rows[0],
      referral,
    };
  }

  // Look up referred profile name
  const pRes = await query(
    `SELECT full_name, handle FROM profiles WHERE id::text = $1 LIMIT 1`,
    [String(referredCreatorId)]
  );
  const referredName = pRes.rows[0]?.full_name || pRes.rows[0]?.handle || "Creator";
  const refTransactionId = `REF-REW-${referral.id}`;

  try {
    const { transaction } = await creditCreatorWallet({
      creatorId: referral.referrer_creator_id,
      amount: rewardAmount,
      referenceId: refTransactionId,
      description: `Referral Reward for inviting ${referredName}`,
    });

    let rewardRecord;
    if (rewRes.rows.length === 0) {
      const insRew = await query(
        `INSERT INTO referral_rewards (
          referral_id, recipient_profile_id, amount, currency, status, credited_at
        ) VALUES ($1, $2, $3, $4, 'credited', NOW())
        RETURNING *`,
        [referral.id, referral.referrer_creator_id, rewardAmount, settings.currency || "INR"]
      );
      rewardRecord = insRew.rows[0];
    } else {
      const updRew = await query(
        `UPDATE referral_rewards SET status = 'credited', credited_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
        [rewRes.rows[0].id]
      );
      rewardRecord = updRew.rows[0];
    }

    await query(
      `UPDATE referrals SET status = 'reward_credited', updated_at = NOW() WHERE id = $1`,
      [referral.id]
    );

    const rewardText = `Congratulations! You received ₹${rewardAmount} in your Creator Wallet for referring ${referredName}!`;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at, created_at_dt)
       VALUES ($1, $2, 'referral_reward_credited', $3, '/dashboard', $4::jsonb, $5, NOW())`,
      [
        referral.referrer_creator_id,
        referral.referred_creator_id,
        rewardText,
        JSON.stringify({
          referralId: referral.id,
          rewardId: rewardRecord.id,
          rewardAmount,
        }),
        Date.now(),
      ]
    );

    sendPushToUser(referral.referrer_creator_id, {
      title: "Referral Reward Credited! 🎁",
      body: rewardText,
      url: "/dashboard",
    }).catch(() => {});

    return {
      success: true,
      message: `Reward of ₹${rewardAmount} successfully credited!`,
      referral,
      reward: rewardRecord,
    };
  } catch (error) {
    console.error("[ReferralService] Error crediting referral reward:", error);
    await query(
      `UPDATE referrals SET status = 'reward_pending', updated_at = NOW() WHERE id = $1`,
      [referral.id]
    );
    return {
      success: false,
      message: "Failed to credit wallet: " + error.message,
    };
  }
};

/**
 * Reverse a project payout and any associated referral commission.
 */
export const reversePayoutAndReferralCommission = async ({ payout_id }) => {
  if (!payout_id) {
    throw new Error("payout_id is required");
  }

  // Find original payout transaction
  const txRes = await query(
    `SELECT * FROM wallet_transactions 
     WHERE payout_id::text = $1 OR id::text = $1 OR reference_id = $1 
     LIMIT 1`,
    [String(payout_id)]
  );

  if (txRes.rows.length === 0) {
    return {
      success: false,
      message: `No wallet transaction found for payout ${payout_id}`,
      reversed_payout: false,
      reversed_commission: false,
    };
  }

  const payoutTx = txRes.rows[0];

  // Deduct from creator's wallet if not already reversed
  if (payoutTx.status !== "reversed" && payoutTx.status !== "REVERSED") {
    await query(
      `UPDATE wallets 
       SET available_balance = available_balance - $1,
           total_earned = total_earned - $1,
           updated_at = NOW()
       WHERE creator_id = $2`,
      [Number(payoutTx.amount), payoutTx.creator_id]
    );
  }

  // Find linked referral_commission transaction
  let commRes = await query(
    `SELECT * FROM wallet_transactions 
     WHERE (related_transaction_id = $1 AND transaction_type = 'referral_commission')
        OR id = $2 
     LIMIT 1`,
    [payoutTx.id, payoutTx.related_transaction_id || null]
  );

  let commissionTx = commRes.rows[0] || null;
  let reversalCommissionTx = null;

  if (commissionTx) {
    const originalCommissionAmount = Number(commissionTx.amount);
    const referrerId = commissionTx.creator_id;

    if (commissionTx.status === "COMPLETED") {
      await query(
        `UPDATE wallets 
         SET available_balance = available_balance - $1,
             total_earned = total_earned - $1,
             updated_at = NOW()
         WHERE creator_id = $2`,
        [originalCommissionAmount, referrerId]
      );
    }

    const reversalRef = `REV-COMM-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const revRes = await query(
      `INSERT INTO wallet_transactions (
        creator_id, collaboration_id, campaign_id, type, transaction_type, amount, currency,
        status, description, reference_id, related_transaction_id, related_referral_id
      ) VALUES ($1, $2, $3, 'DEBIT', 'refund_reversal', $4, $5, 'COMPLETED', $6, $7, $8, $9)
      RETURNING *`,
      [
        referrerId,
        commissionTx.collaboration_id,
        commissionTx.campaign_id,
        -originalCommissionAmount,
        commissionTx.currency || "INR",
        "Reversal of referral commission for refunded/disputed payout",
        reversalRef,
        commissionTx.id,
        commissionTx.related_referral_id,
      ]
    );
    reversalCommissionTx = revRes.rows[0];

    await query(
      `UPDATE wallet_transactions SET status = 'reversed', updated_at = NOW() WHERE id = $1`,
      [commissionTx.id]
    );
  }

  await query(
    `UPDATE wallet_transactions SET status = 'reversed', updated_at = NOW() WHERE id = $1`,
    [payoutTx.id]
  );

  return {
    success: true,
    payout_transaction_id: payoutTx.id,
    commission_transaction_id: commissionTx?.id || null,
    reversal_transaction_id: reversalCommissionTx?.id || null,
    reversed_payout: true,
    reversed_commission: Boolean(commissionTx),
  };
};

/**
 * Process project payout hook with referral commission.
 */
export const processProjectPayoutWithReferral = async ({
  creatorId,
  collaborationId,
  campaignId = null,
  payoutId = null,
  gross_payout_amount,
  total_deal_amount = null,
  platform_fee = 0,
  transactionReference,
  description = "Project payout",
}) => {
  const commonRef =
    transactionReference ||
    `PAYOUT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const cRes = await query(
    `SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [String(creatorId)]
  );
  if (cRes.rows.length === 0) {
    throw new Error(`Creator ${creatorId} not found`);
  }
  const creator = formatProfile(cRes.rows[0]);

  // Check referral relationship
  const relRes = await query(
    `SELECT * FROM referral_relationships WHERE referred_id = $1 AND status = 'active' LIMIT 1`,
    [creator.id]
  );
  const referralRelationship = relRes.rows[0] || null;

  if (!referralRelationship) {
    const creator_net_amount = Math.max(0, gross_payout_amount - platform_fee);
    const creatorResult = await creditCreatorWallet({
      creatorId: creator.id,
      amount: creator_net_amount,
      collaborationId,
      campaignId,
      payoutId,
      referenceId: commonRef,
      description,
      transaction_type: "project_payout",
    });

    const breakdown = {
      creator_id: creator.id,
      project_id: campaignId || collaborationId || payoutId,
      payout_id: payoutId,
      collaboration_id: collaborationId,
      campaign_id: campaignId,
      common_reference: commonRef,
      gross_payout_amount,
      platform_fee,
      commission_percent: 0,
      commission_amount: 0,
      referrer_name: null,
      creator_net_amount,
      has_active_referral: false,
      referrer_id: null,
      creator_transaction_id: creatorResult?.transaction?.id || null,
      referrer_transaction_id: null,
      referral_relationship_id: null,
    };

    appEvents.emit("payout.processed", breakdown);
    return { creatorResult, referrerResult: null, breakdown };
  }

  const commissionPercent = Number(referralRelationship.commission_percent || 5.0);
  const baseDealAmount =
    total_deal_amount && total_deal_amount > 0
      ? total_deal_amount
      : gross_payout_amount > 0
      ? gross_payout_amount / 0.8
      : gross_payout_amount;

  const commission_amount = Number((baseDealAmount * (commissionPercent / 100)).toFixed(2));
  const creator_net_amount = Number(Math.max(0, gross_payout_amount - platform_fee).toFixed(2));

  const creatorResult = await creditCreatorWallet({
    creatorId: creator.id,
    amount: creator_net_amount,
    collaborationId,
    campaignId,
    payoutId,
    referenceId: commonRef,
    description: `${description} (Net creator earnings)`,
    transaction_type: "project_payout",
    related_referral_id: referralRelationship.id,
  });

  const creatorTransactionId = creatorResult?.transaction?.id;

  const refProfRes = await query(
    `SELECT full_name, is_suspended FROM profiles WHERE id = $1 LIMIT 1`,
    [referralRelationship.referrer_id]
  );
  const referrerProfile = refProfRes.rows[0];
  const referrerName = referrerProfile?.full_name || "Referrer";
  const referrerIsSuspended = Boolean(referrerProfile?.is_suspended);

  const commissionStatus = referrerIsSuspended ? "PENDING" : "COMPLETED";
  const commissionDesc = referrerIsSuspended
    ? `Referral commission (${commissionPercent}%) held in PENDING — referrer account suspended`
    : `Referral income (${commissionPercent}%) paid by Pravixo for collaboration of ${creator.fullName || "creator"}`;

  const referrerTxRef = `${commonRef}-COMM`;
  const referrerResult = await creditCreatorWallet({
    creatorId: referralRelationship.referrer_id,
    amount: commission_amount,
    collaborationId,
    campaignId,
    payoutId: null,
    referenceId: referrerTxRef,
    description: commissionDesc,
    transaction_type: "referral_commission",
    related_transaction_id: creatorTransactionId || null,
    related_referral_id: referralRelationship.id,
    status: commissionStatus,
  });

  if (creatorResult?.transaction && referrerResult?.transaction) {
    await query(
      `UPDATE wallet_transactions SET related_transaction_id = $1 WHERE id = $2`,
      [referrerResult.transaction.id, creatorResult.transaction.id]
    );
  }

  const breakdown = {
    creator_id: creator.id,
    project_id: campaignId || collaborationId || payoutId,
    payout_id: payoutId,
    collaboration_id: collaborationId,
    campaign_id: campaignId,
    common_reference: commonRef,
    gross_payout_amount,
    total_deal_amount: baseDealAmount,
    platform_fee,
    commission_percent: commissionPercent,
    commission_amount,
    referrer_name: referrerName,
    creator_net_amount,
    has_active_referral: true,
    referrer_id: referralRelationship.referrer_id,
    creator_transaction_id: creatorTransactionId || null,
    referrer_transaction_id: referrerResult?.transaction?.id || null,
    referral_relationship_id: referralRelationship.id,
  };

  appEvents.emit("payout.processed", breakdown);
  return { creatorResult, referrerResult, breakdown };
};
