import { query } from "../config/postgres.js";
import {
  formatProfile,
  formatConversation,
  formatMessage,
  formatCampaign,
  formatCampaignTask,
  formatPayment,
  formatWallet,
  formatWalletTransaction,
  formatWithdrawal,
  formatConnection,
  formatNotification,
  formatSubscriptionPackage,
  formatSubscriptionOffer,
  formatUserSubscription,
  formatPopupSetting,
  formatOfferAnalytics,
  formatVideoReview,
  formatBlog,
  formatProTip,
  formatBankDetails,
} from "../utils/formatters.js";
import { sendPushToUser, sendPushToUsers } from "../utils/webPush.js";
import {
  processReferralQualification,
  processProjectPayoutWithReferral,
  reversePayoutAndReferralCommission,
} from "../services/referralService.js";

// =====================================================
// AGGREGATE STATS
// GET /api/admin/stats
// =====================================================
export const getStats = async (req, res) => {
  try {
    const [
      usersRes,
      creatorsRes,
      brandsRes,
      convsRes,
      msgsRes,
      favsRes,
    ] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM profiles WHERE is_deleted IS NOT TRUE`),
      query(`SELECT COUNT(*)::int AS count FROM profiles WHERE role = 'creator' AND is_deleted IS NOT TRUE`),
      query(`SELECT COUNT(*)::int AS count FROM profiles WHERE role = 'brand' AND is_deleted IS NOT TRUE`),
      query(`SELECT COUNT(*)::int AS count FROM conversations`),
      query(`SELECT COUNT(*)::int AS count FROM messages`),
      query(`SELECT COUNT(*)::int AS count FROM favorites`),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers: usersRes.rows[0]?.count || 0,
        creators: creatorsRes.rows[0]?.count || 0,
        brands: brandsRes.rows[0]?.count || 0,
        conversations: convsRes.rows[0]?.count || 0,
        messages: msgsRes.rows[0]?.count || 0,
        favorites: favsRes.rows[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Admin getStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch aggregate stats.",
      error: error.message,
    });
  }
};

// =====================================================
// LIST ALL CONVERSATIONS
// GET /api/admin/conversations
// =====================================================
export const listAllConversations = async (req, res) => {
  try {
    const { type } = req.query;

    let sql = `
      SELECT c.*,
             row_to_json(cr.*) AS creator_data,
             row_to_json(br.*) AS brand_data,
             row_to_json(ad.*) AS admin_data,
             row_to_json(cp.*) AS campaign_data
      FROM conversations c
      LEFT JOIN profiles cr ON c.creator_id = cr.id
      LEFT JOIN profiles br ON c.brand_id = br.id
      LEFT JOIN profiles ad ON c.admin_id = ad.id
      LEFT JOIN campaigns cp ON c.campaign_id = cp.id
    `;
    const params = [];
    if (type) {
      params.push(type);
      sql += ` WHERE c.conversation_type = $1`;
    }
    sql += ` ORDER BY c.updated_at DESC, c.created_at DESC`;

    const convRes = await query(sql, params);
    const conversations = convRes.rows;

    const results = await Promise.all(
      conversations.map(async (c) => {
        const msgRes = await query(
          `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [c.id]
        );
        const countRes = await query(
          `SELECT COUNT(*)::int AS count FROM messages WHERE conversation_id = $1`,
          [c.id]
        );

        const lastMsg = msgRes.rows[0] ? formatMessage(msgRes.rows[0]) : null;
        const formattedConv = formatConversation(c);
        const creator = c.creator_data ? formatProfile(c.creator_data) : null;
        const brand = c.brand_data ? formatProfile(c.brand_data) : null;
        const admin = c.admin_data ? formatProfile(c.admin_data) : null;
        const campaign = c.campaign_data ? formatCampaign(c.campaign_data) : null;

        return {
          ...formattedConv,
          creatorId: creator,
          brandId: brand,
          adminId: admin,
          campaignId: campaign,
          creator,
          brand,
          admin,
          campaign,
          lastMessage: lastMsg,
          messageCount: countRes.rows[0]?.count || 0,
        };
      })
    );

    const sortedResults = results.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      data: sortedResults,
    });
  } catch (error) {
    console.error("Admin listAllConversations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list conversations.",
      error: error.message,
    });
  }
};

// =====================================================
// LIST MESSAGES FOR A CONVERSATION
// GET /api/admin/conversations/:id/messages
// =====================================================
export const listMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const convRes = await query(
      `SELECT c.*,
              row_to_json(cr.*) AS creator_data,
              row_to_json(br.*) AS brand_data,
              row_to_json(ad.*) AS admin_data,
              row_to_json(cp.*) AS campaign_data
       FROM conversations c
       LEFT JOIN profiles cr ON c.creator_id = cr.id
       LEFT JOIN profiles br ON c.brand_id = br.id
       LEFT JOIN profiles ad ON c.admin_id = ad.id
       LEFT JOIN campaigns cp ON c.campaign_id = cp.id
       WHERE c.id::text = $1`,
      [id]
    );

    if (convRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    const c = convRes.rows[0];
    const conversation = formatConversation(c);
    const creator = c.creator_data ? formatProfile(c.creator_data) : null;
    const brand = c.brand_data ? formatProfile(c.brand_data) : null;
    const admin = c.admin_data ? formatProfile(c.admin_data) : null;
    const campaign = c.campaign_data ? formatCampaign(c.campaign_data) : null;

    const msgRes = await query(
      `SELECT m.*, row_to_json(p.*) AS sender_data
       FROM messages m
       LEFT JOIN profiles p ON m.sender_id = p.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [c.id]
    );

    const messages = msgRes.rows.map((m) => {
      const formatted = formatMessage(m);
      if (m.sender_data) {
        formatted.senderId = formatProfile(m.sender_data);
      }
      return formatted;
    });

    return res.status(200).json({
      success: true,
      data: {
        conversation: {
          ...conversation,
          creatorId: creator,
          brandId: brand,
          adminId: admin,
          campaignId: campaign,
        },
        creator,
        brand,
        admin,
        campaign,
        messages,
      },
    });
  } catch (error) {
    console.error("Admin listMessages error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list messages.",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE PROFILE (CASCADE / PERMANENT PURGE)
// DELETE /api/admin/profiles/:id
// =====================================================
export const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, permanent } = req.body || {};
    const isPermanent = permanent === true || permanent === "true" || req.query?.permanent === "true";

    if (isPermanent) {
      const convRes = await query(
        `SELECT id FROM conversations WHERE creator_id::text = $1 OR brand_id::text = $1 OR admin_id::text = $1`,
        [id]
      );
      const convIds = convRes.rows.map((r) => r.id);

      if (convIds.length > 0) {
        await query(`DELETE FROM messages WHERE conversation_id = ANY($1::uuid[])`, [convIds]).catch(() => {});
        await query(`DELETE FROM conversations WHERE id = ANY($1::uuid[])`, [convIds]).catch(() => {});
      }

      await query(`DELETE FROM pricing_tiers WHERE profile_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM portfolios WHERE profile_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM favorites WHERE brand_id::text = $1 OR creator_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM addon_services WHERE creator_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM addon_bookings WHERE profile_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM connections WHERE requester_id::text = $1 OR recipient_id::text = $1 OR creator_id::text = $1 OR brand_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM creator_bank_details WHERE profile_id::text = $1 OR creator_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM user_subscriptions WHERE profile_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM wallet_transactions WHERE profile_id::text = $1 OR creator_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM wallets WHERE profile_id::text = $1 OR creator_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM withdrawals WHERE creator_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM notifications WHERE recipient_id::text = $1 OR sender_id::text = $1`, [id]).catch(() => {});
      await query(`DELETE FROM profiles WHERE id::text = $1`, [id]);

      return res.status(200).json({
        success: true,
        permanent: true,
        message: "User and all associated data permanently deleted from database.",
      });
    }

    // SOFT DELETE
    await query(
      `UPDATE profiles
       SET is_deleted = true, delete_reason = $1, updated_at = NOW()
       WHERE id::text = $2`,
      [reason || "Violation of platform terms.", id]
    );

    const senderId = req.user?.profileId || req.user?.id || id;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
       VALUES ($1, $2, 'account_deleted', $3, NOW())`,
      [id, senderId, `Your account has been deleted. Reason: ${reason || "Violation of platform terms."}`]
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      permanent: false,
      message: "Profile moved to deleted users.",
    });
  } catch (error) {
    console.error("Admin deleteProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete profile.",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE CONVERSATION
// DELETE /api/admin/conversations/:id
// =====================================================
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM messages WHERE conversation_id::text = $1`, [id]);
    await query(`DELETE FROM conversations WHERE id::text = $1`, [id]);
    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (error) {
    console.error("Admin deleteConversation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete conversation.",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE PROFILE ROLE
// PATCH /api/admin/profiles/:id/role
// =====================================================
export const updateProfileRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["creator", "brand"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'creator' or 'brand'.",
      });
    }

    const updated = await query(
      `UPDATE profiles SET role = $1, updated_at = NOW() WHERE id::text = $2 RETURNING *`,
      [role, id]
    );

    return res.status(200).json({
      success: true,
      data: formatProfile(updated.rows[0]),
    });
  } catch (error) {
    console.error("Admin updateProfileRole error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile role.",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE VERIFICATION STATUS (KYC APPROVE/REJECT)
// PATCH /api/admin/profiles/:id/verification
// =====================================================
export const updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;

    if (!["unverified", "pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status.",
      });
    }

    const updated = await query(
      `UPDATE profiles SET verification_status = $1, updated_at = NOW() WHERE id::text = $2 RETURNING *`,
      [status, id]
    );

    const profile = formatProfile(updated.rows[0]);

    if (profile) {
      const senderId = req.user?.profileId || req.user?.id || profile.id;
      const userDashboardUrl = profile.role === "creator" ? "/dashboard/influencer" : "/dashboard/customer";

      if (status === "rejected") {
        const rejText = `Your verification request was rejected. Reason: ${rejectReason || "Does not meet guidelines."}`;
        await query(
          `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
           VALUES ($1, $2, 'verification_rejected', $3, NOW())`,
          [profile.id, senderId, rejText]
        ).catch((e) => console.warn("Failed to create rejection notification:", e.message));

        sendPushToUser(profile.id, {
          title: "Verification Update ⚠️",
          body: rejText,
          url: userDashboardUrl,
        }).catch((err) => console.error("Verification reject push error:", err.message));
      } else if (status === "verified") {
        const appText = `Congratulations! Your ${profile.role === "creator" ? "Creator" : "Brand"} profile has been verified. 🎉`;
        await query(
          `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
           VALUES ($1, $2, 'verification_approved', $3, NOW())`,
          [profile.id, senderId, appText]
        ).catch((e) => console.warn("Failed to create approval notification:", e.message));

        sendPushToUser(profile.id, {
          title: "Profile Verified! 🎖️",
          body: appText,
          url: userDashboardUrl,
        }).catch((err) => console.error("Verification approve push error:", err.message));

        if (profile.role === "creator") {
          try {
            await processReferralQualification({
              referredCreatorId: profile.id,
              triggerType: "profile_verified",
            });
          } catch (refErr) {
            console.error("[Verification] Error processing referral qualification:", refErr);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Verification status updated to ${status}.`,
      data: profile,
    });
  } catch (error) {
    console.error("Admin updateVerificationStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update verification status.",
      error: error.message,
    });
  }
};

// =====================================================
// GET PENDING CREATORS KYC
// GET /api/admin/verification/creators/pending
// =====================================================
export const getPendingCreators = async (req, res) => {
  try {
    const r = await query(
      `SELECT * FROM profiles WHERE role = 'creator' AND verification_status = 'pending' AND is_deleted IS NOT TRUE ORDER BY created_at DESC`
    );
    return res.status(200).json({ success: true, data: r.rows.map(formatProfile) });
  } catch (error) {
    console.error("Admin getPendingCreators error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch pending creators.", error: error.message });
  }
};

// =====================================================
// GET PENDING BRANDS KYC
// GET /api/admin/verification/brands/pending
// =====================================================
export const getPendingBrands = async (req, res) => {
  try {
    const r = await query(
      `SELECT * FROM profiles WHERE role = 'brand' AND verification_status = 'pending' AND is_deleted IS NOT TRUE ORDER BY created_at DESC`
    );
    return res.status(200).json({ success: true, data: r.rows.map(formatProfile) });
  } catch (error) {
    console.error("Admin getPendingBrands error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch pending brands.", error: error.message });
  }
};

// =====================================================
// GET CREATOR VERIFICATION HISTORY
// GET /api/admin/verification/creators/history
// =====================================================
export const getCreatorVerificationHistory = async (req, res) => {
  try {
    const r = await query(
      `SELECT * FROM profiles WHERE role = 'creator' AND verification_status IN ('verified', 'rejected', 'unverified') AND is_deleted IS NOT TRUE ORDER BY updated_at DESC`
    );
    return res.status(200).json({ success: true, data: r.rows.map(formatProfile) });
  } catch (error) {
    console.error("Admin getCreatorVerificationHistory error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch creator history.", error: error.message });
  }
};

// =====================================================
// GET BRAND VERIFICATION HISTORY
// GET /api/admin/verification/brands/history
// =====================================================
export const getBrandVerificationHistory = async (req, res) => {
  try {
    const r = await query(
      `SELECT * FROM profiles WHERE role = 'brand' AND verification_status IN ('verified', 'rejected', 'unverified') AND is_deleted IS NOT TRUE ORDER BY updated_at DESC`
    );
    return res.status(200).json({ success: true, data: r.rows.map(formatProfile) });
  } catch (error) {
    console.error("Admin getBrandVerificationHistory error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch brand history.", error: error.message });
  }
};

// =====================================================
// SUSPEND PROFILE
// POST /api/admin/profiles/:id/suspend
// =====================================================
export const suspendProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, durationDays } = req.body;
    const days = Number(durationDays) || 7;
    const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const r = await query(
      `UPDATE profiles
       SET is_suspended = true,
           suspension_reason = $1,
           suspended_until = $2,
           updated_at = NOW()
       WHERE id::text = $3
       RETURNING *`,
      [reason || "Violation of platform guidelines.", suspendedUntil, id]
    );

    const profile = formatProfile(r.rows[0]);
    if (profile) {
      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
         VALUES ($1, $2, 'account_suspended', $3, NOW())`,
        [profile.id, req.user?.profileId || req.user?.id || profile.id, `Your account has been suspended for ${days} days. Reason: ${reason || "Violation of platform guidelines."}`]
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: `Profile suspended for ${days} days.`,
      data: profile,
    });
  } catch (error) {
    console.error("Admin suspendProfile error:", error);
    return res.status(500).json({ success: false, message: "Failed to suspend profile.", error: error.message });
  }
};

// =====================================================
// UNSUSPEND PROFILE
// POST /api/admin/profiles/:id/unsuspend
// =====================================================
export const unsuspendProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `UPDATE profiles
       SET is_suspended = false,
           suspension_reason = '',
           suspended_until = NULL,
           updated_at = NOW()
       WHERE id::text = $1
       RETURNING *`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Profile unsuspended successfully.",
      data: formatProfile(r.rows[0]),
    });
  } catch (error) {
    console.error("Admin unsuspendProfile error:", error);
    return res.status(500).json({ success: false, message: "Failed to unsuspend profile.", error: error.message });
  }
};

// =====================================================
// LIST ALL TASKS
// GET /api/admin/tasks
// =====================================================
export const listAllTasks = async (req, res) => {
  try {
    const tasksRes = await query(`
      SELECT t.*,
             row_to_json(cp.*) AS campaign_data,
             row_to_json(cr.*) AS creator_data,
             row_to_json(br.*) AS brand_data
      FROM campaign_tasks t
      LEFT JOIN campaigns cp ON t.campaign_id = cp.id
      LEFT JOIN profiles cr ON t.creator_id = cr.id
      LEFT JOIN profiles br ON t.brand_id = br.id
      ORDER BY t.created_at DESC
    `);

    const formattedTasks = tasksRes.rows.map((t) => {
      const camp = t.campaign_data ? formatCampaign(t.campaign_data) : null;
      const creator = t.creator_data ? formatProfile(t.creator_data) : null;
      const brand = t.brand_data ? formatProfile(t.brand_data) : null;
      const ft = formatCampaignTask(t);
      return {
        ...ft,
        campaign: camp,
        creator,
        brand,
      };
    });

    const connRes = await query(`
      SELECT c.*,
             row_to_json(cp.*) AS campaign_data,
             row_to_json(cr.*) AS creator_data,
             row_to_json(br.*) AS brand_data
      FROM connections c
      LEFT JOIN campaigns cp ON c.campaign_id = cp.id
      LEFT JOIN profiles cr ON c.creator_id = cr.id
      LEFT JOIN profiles br ON c.brand_id = br.id
      WHERE (c.deliverables_tracking IS NOT NULL AND jsonb_array_length(c.deliverables_tracking::jsonb) > 0)
         OR c.all_deliverables_completed = true
         OR c.payment_release_status IN ('WAITING_72_HOURS', 'ELIGIBLE_FOR_RELEASE', 'RELEASED')
      ORDER BY c.created_at DESC
    `);

    const connectionTasks = [];
    const existingTaskConnectionIds = new Set(
      formattedTasks.map((t) => t.connectionId?.toString()).filter(Boolean)
    );

    for (const c of connRes.rows) {
      const cIdStr = c.id.toString();
      const camp = c.campaign_data ? formatCampaign(c.campaign_data) : null;
      const creator = c.creator_data ? formatProfile(c.creator_data) : null;
      const brand = c.brand_data ? formatProfile(c.brand_data) : null;

      let derivedStatus = "in_progress";
      if (c.payment_release_status === "RELEASED" || c.approval_completed_at) {
        derivedStatus = "approved";
      } else if (c.all_deliverables_completed || c.work_completed_at) {
        derivedStatus = "completed";
      }

      const deliverables = Array.isArray(c.deliverables_tracking)
        ? c.deliverables_tracking
        : (typeof c.deliverables_tracking === "string" ? JSON.parse(c.deliverables_tracking || "[]") : []);

      if (deliverables.length > 0) {
        for (const deliv of deliverables) {
          let delivStatus = derivedStatus;
          if (deliv.status === "COMPLETED" || deliv.status === "APPROVED") {
            delivStatus = c.payment_release_status === "RELEASED" ? "approved" : "completed";
          } else if (deliv.status === "IN_PROGRESS" || deliv.status === "SUBMITTED") {
            delivStatus = "in_progress";
          } else if (deliv.status === "REJECTED") {
            delivStatus = "revision_requested";
          }

          connectionTasks.push({
            _id: deliv._id || deliv.id || `${cIdStr}-${deliv.type}`,
            campaignId: c.campaign_id || null,
            creatorId: c.creator_id || null,
            brandId: c.brand_id || null,
            connectionId: c.id,
            campaign: camp,
            creator,
            brand,
            title: `${deliv.type || "Deliverable"} (${deliv.completedQuantity || 0}/${deliv.requiredQuantity || 1} completed)`,
            description: `Deliverable requirement for ${camp?.title || "Campaign"}`,
            deliverables: `${deliv.requiredQuantity || 1} ${deliv.type || "Deliverable"}`,
            priority: "medium",
            status: delivStatus,
            dueDate: camp?.endDate || deliv.updatedAt || deliv.createdAt || c.created_at || Date.now(),
            startedAt: deliv.createdAt || c.agreed_at || c.created_at || null,
            completedAt: (deliv.status === "COMPLETED" || deliv.status === "APPROVED" || c.all_deliverables_completed) ? (deliv.updatedAt || c.payout_released_at || c.approval_completed_at || c.work_completed_at || deliv.createdAt) : null,
            createdAt: deliv.createdAt || c.created_at || Date.now(),
            updatedAt: deliv.updatedAt || c.updated_at || Date.now(),
          });
        }
      } else if (!existingTaskConnectionIds.has(cIdStr)) {
        connectionTasks.push({
          _id: c.id,
          campaignId: c.campaign_id || null,
          creatorId: c.creator_id || null,
          brandId: c.brand_id || null,
          connectionId: c.id,
          campaign: camp,
          creator,
          brand,
          title: `Collaboration Deliverable - ${camp?.title || "Direct Collaboration"}`,
          description: c.pitch || "Collaboration deliverables",
          deliverables: "Collaboration Deliverables",
          priority: "medium",
          status: derivedStatus,
          dueDate: camp?.endDate || c.updated_at || c.created_at || Date.now(),
          startedAt: c.agreed_at || c.created_at || null,
          completedAt: c.payout_released_at || c.approval_completed_at || c.work_completed_at || null,
          createdAt: c.created_at || Date.now(),
          updatedAt: c.updated_at || Date.now(),
        });
      }
    }

    const allCombined = [...formattedTasks, ...connectionTasks].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      data: allCombined,
    });
  } catch (error) {
    console.error("Admin listAllTasks error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list tasks.",
      error: error.message,
    });
  }
};

// =====================================================
// HELPER: SYNC 72-HOUR PAYMENT RELEASE ELIGIBILITY (TASK 10)
// =====================================================
export const syncCollaboration72HourEligibility = async () => {
  try {
    const now = Date.now();
    const waitingRes = await query(`
      SELECT c.*,
             row_to_json(cr.*) AS creator_data,
             row_to_json(br.*) AS brand_data,
             row_to_json(cp.*) AS campaign_data
      FROM connections c
      LEFT JOIN profiles cr ON c.creator_id = cr.id
      LEFT JOIN profiles br ON c.brand_id = br.id
      LEFT JOIN campaigns cp ON c.campaign_id = cp.id
      WHERE c.payment_status = 'PAID'
        AND c.all_deliverables_completed = true
        AND c.payment_release_eligible_at IS NOT NULL
        AND c.payment_release_status IN ('WAITING_72_HOURS', 'NOT_APPLICABLE')
    `);

    const adminsRes = await query(`SELECT id FROM profiles WHERE role = 'admin'`);
    const admins = adminsRes.rows;

    for (const collab of waitingRes.rows) {
      const eligibleTime = Number(collab.payment_release_eligible_at);
      if (now >= eligibleTime) {
        await query(
          `UPDATE connections SET payment_release_status = 'ELIGIBLE_FOR_RELEASE', updated_at = NOW() WHERE id = $1`,
          [collab.id]
        );

        if (!collab.admin_notified_of_eligibility) {
          const brandName = collab.brand_data?.full_name || "Brand";
          const creatorName = collab.creator_data?.full_name || "Creator";
          const campaignTitle = collab.campaign_data?.title || "Campaign";
          const creatorAmt = Number(collab.creator_amount || 0).toLocaleString("en-IN");

          for (const admin of admins) {
            await query(
              `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
               VALUES ($1, $2, 'payment_release_eligible', $3, NOW())`,
              [
                admin.id,
                collab.creator_id,
                `Creator payment (₹${creatorAmt}) for "${campaignTitle}" (${creatorName} & ${brandName}) is now eligible for release after the 72-hour review period.`,
              ]
            ).catch(() => {});
          }

          await query(
            `UPDATE connections SET admin_notified_of_eligibility = true WHERE id = $1`,
            [collab.id]
          );
        }
      } else if (collab.payment_release_status !== "WAITING_72_HOURS") {
        await query(
          `UPDATE connections SET payment_release_status = 'WAITING_72_HOURS', updated_at = NOW() WHERE id = $1`,
          [collab.id]
        );
      }
    }
  } catch (err) {
    console.error("Error in syncCollaboration72HourEligibility:", err);
  }
};

// =====================================================
// LIST ALL PAYMENTS & ESCROW
// GET /api/admin/payments
// =====================================================
export const listAllPayments = async (req, res) => {
  try {
    await syncCollaboration72HourEligibility();

    const payRes = await query(`
      SELECT p.*,
             row_to_json(cp.*) AS campaign_data,
             row_to_json(cr.*) AS creator_data,
             row_to_json(br.*) AS brand_data,
             row_to_json(t.*) AS task_data
      FROM payments p
      LEFT JOIN campaigns cp ON p.campaign_id = cp.id
      LEFT JOIN profiles cr ON p.creator_id = cr.id
      LEFT JOIN profiles br ON p.brand_id = br.id
      LEFT JOIN campaign_tasks t ON p.task_id = t.id
      ORDER BY p.created_at DESC
    `);

    const withAudit = await Promise.all(
      payRes.rows.map(async (p) => {
        const auditRes = await query(
          `SELECT * FROM payment_audit_logs WHERE payment_id = $1 ORDER BY created_at DESC`,
          [p.id]
        );
        const fp = formatPayment(p);
        return {
          ...fp,
          campaign: p.campaign_data ? formatCampaign(p.campaign_data) : null,
          creator: p.creator_data ? formatProfile(p.creator_data) : null,
          brand: p.brand_data ? formatProfile(p.brand_data) : null,
          task: p.task_data ? formatCampaignTask(p.task_data) : null,
          auditLogs: auditRes.rows.map((l) => ({
            _id: l.id,
            id: l.id,
            paymentId: l.payment_id,
            action: l.action,
            details: l.details,
            createdAt: l.created_at,
          })),
        };
      })
    );

    return res.status(200).json({ success: true, data: withAudit });
  } catch (error) {
    console.error("Admin listAllPayments error:", error);
    return res.status(500).json({ success: false, message: "Failed to list payments.", error: error.message });
  }
};

// =====================================================
// LIST COLLABORATION 72-HOUR PAYMENT RELEASES (TASK 10)
// GET /api/admin/payments/collaborations
// =====================================================
export const listCollaborationPaymentReleases = async (req, res) => {
  try {
    await syncCollaboration72HourEligibility();
    const { status } = req.query;

    let sql = `
      SELECT c.*,
             row_to_json(cp.*) AS campaign_data,
             row_to_json(cr.*) AS creator_data,
             row_to_json(br.*) AS brand_data,
             row_to_json(p.*) AS payment_data
      FROM connections c
      LEFT JOIN campaigns cp ON c.campaign_id = cp.id
      LEFT JOIN profiles cr ON c.creator_id = cr.id
      LEFT JOIN profiles br ON c.brand_id = br.id
      LEFT JOIN payments p ON c.payment_id = p.id
      WHERE c.payment_status = 'PAID'
        AND c.all_deliverables_completed = true
    `;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` AND c.payment_release_status = $1`;
    }
    sql += ` ORDER BY c.work_completed_at DESC NULLS LAST, c.created_at DESC`;

    const r = await query(sql, params);
    const now = Date.now();

    const enriched = r.rows.map((c) => {
      const isEligible = c.payment_release_eligible_at && now >= Number(c.payment_release_eligible_at);
      const releaseStatus = isEligible ? "ELIGIBLE_FOR_RELEASE" : (c.payment_release_status || "WAITING_72_HOURS");
      const remainingMs = c.payment_release_eligible_at ? Math.max(0, Number(c.payment_release_eligible_at) - now) : 0;

      return {
        _id: c.id,
        id: c.id,
        campaign: c.campaign_data ? formatCampaign(c.campaign_data) : null,
        creator: c.creator_data ? formatProfile(c.creator_data) : null,
        brand: c.brand_data ? formatProfile(c.brand_data) : null,
        payment: c.payment_data ? formatPayment(c.payment_data) : null,
        creatorAmount: Number(c.creator_amount || 0),
        pravixoFee: Number(c.pravixo_fee || 0),
        brandTotal: Number(c.brand_total || 0),
        paymentStatus: c.payment_status,
        allDeliverablesCompleted: Boolean(c.all_deliverables_completed),
        deliverablesTracking: c.deliverables_tracking || [],
        workCompletedAt: c.work_completed_at,
        approvalCompletedAt: c.approval_completed_at,
        paymentReleaseEligibleAt: c.payment_release_eligible_at,
        paymentReleaseStatus: releaseStatus,
        remainingMs,
        createdAt: c.created_at,
      };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error("Admin listCollaborationPaymentReleases error:", error);
    return res.status(500).json({ success: false, message: "Failed to list collaboration payment releases.", error: error.message });
  }
};

// =====================================================
// GET SINGLE COLLABORATION PAYMENT RELEASE DETAILS (TASK 10)
// GET /api/admin/payments/collaborations/:id
// =====================================================
export const getCollaborationPaymentReleaseDetails = async (req, res) => {
  try {
    const { id } = req.params;
    await syncCollaboration72HourEligibility();

    const r = await query(
      `SELECT c.*,
              row_to_json(cp.*) AS campaign_data,
              row_to_json(cr.*) AS creator_data,
              row_to_json(br.*) AS brand_data,
              row_to_json(p.*) AS payment_data
       FROM connections c
       LEFT JOIN campaigns cp ON c.campaign_id = cp.id
       LEFT JOIN profiles cr ON c.creator_id = cr.id
       LEFT JOIN profiles br ON c.brand_id = br.id
       LEFT JOIN payments p ON c.payment_id = p.id
       WHERE c.id::text = $1`,
      [id]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Collaboration not found." });
    }

    const c = r.rows[0];
    const now = Date.now();
    const isEligible = c.payment_release_eligible_at && now >= Number(c.payment_release_eligible_at);
    const releaseStatus = isEligible ? "ELIGIBLE_FOR_RELEASE" : (c.payment_release_status || "WAITING_72_HOURS");
    const remainingMs = c.payment_release_eligible_at ? Math.max(0, Number(c.payment_release_eligible_at) - now) : 0;

    return res.status(200).json({
      success: true,
      data: {
        ...formatConnection(c),
        campaign: c.campaign_data ? formatCampaign(c.campaign_data) : null,
        creator: c.creator_data ? formatProfile(c.creator_data) : null,
        brand: c.brand_data ? formatProfile(c.brand_data) : null,
        payment: c.payment_data ? formatPayment(c.payment_data) : null,
        paymentReleaseStatus: releaseStatus,
        remainingMs,
      },
    });
  } catch (error) {
    console.error("Admin getCollaborationPaymentReleaseDetails error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch collaboration payment release details.", error: error.message });
  }
};

// =====================================================
// RELEASE CREATOR PAYOUT (TASK 11)
// POST /api/admin/payments/collaborations/:id/release
// =====================================================
export const releaseCreatorPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};

    const connRes = await query(
      `SELECT c.*,
              row_to_json(cp.*) AS campaign_data,
              row_to_json(cr.*) AS creator_data,
              row_to_json(br.*) AS brand_data
       FROM connections c
       LEFT JOIN campaigns cp ON c.campaign_id = cp.id
       LEFT JOIN profiles cr ON c.creator_id = cr.id
       LEFT JOIN profiles br ON c.brand_id = br.id
       WHERE c.id::text = $1`,
      [id]
    );

    if (connRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Collaboration not found." });
    }

    const connection = connRes.rows[0];

    if (connection.payment_status !== "PAID") {
      return res.status(400).json({ success: false, message: "Cannot release payout: Collaboration payment is not in PAID status." });
    }

    const deliverables = Array.isArray(connection.deliverables_tracking)
      ? connection.deliverables_tracking
      : (typeof connection.deliverables_tracking === "string" ? JSON.parse(connection.deliverables_tracking || "[]") : []);

    const allApproved = deliverables.length > 0 && deliverables.every(
      (deliv) => (deliv.completedQuantity || 0) >= (deliv.requiredQuantity || 1)
    );

    if (!connection.all_deliverables_completed || !allApproved) {
      return res.status(400).json({ success: false, message: "Cannot release payout: Not all required campaign deliverables are approved." });
    }

    const now = Date.now();
    if (!connection.payment_release_eligible_at || now < Number(connection.payment_release_eligible_at)) {
      return res.status(400).json({ success: false, message: "Cannot release payout: 72-hour review period has not yet elapsed." });
    }

    if (connection.payment_release_status === "RELEASED") {
      return res.status(400).json({ success: false, message: "Payout has already been released for this collaboration." });
    }

    const creatorAmount = Number(connection.creator_amount || 0);
    if (!creatorAmount || creatorAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid or zero creator payout amount in collaboration record." });
    }

    const adminId = req.user?.id || req.user?.profileId;
    const transactionReference = `PAYOUT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const campaignTitle = connection.campaign_data?.title || "Collaboration Campaign";

    // Insert payout
    const payoutRes = await query(
      `INSERT INTO payouts (collaboration_id, payment_id, campaign_id, brand_id, creator_id, amount, currency, status, payout_method, transaction_reference, initiated_by, initiated_at, completed_at, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'INR', 'COMPLETED', 'MANUAL_BANK_TRANSFER', $7, $8, $9, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        connection.id,
        connection.payment_id || null,
        connection.campaign_id || null,
        connection.brand_id,
        connection.creator_id,
        creatorAmount,
        transactionReference,
        adminId,
        now,
        notes || "Manual Admin Payout Release",
      ]
    );
    const payout = payoutRes.rows[0];

    // Update connection
    await query(
      `UPDATE connections
       SET payment_release_status = 'RELEASED',
           payout_id = $1,
           payout_released_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [payout.id, now, connection.id]
    );

    // Update payment if exists
    if (connection.payment_id) {
      await query(
        `UPDATE payments
         SET payment_status = 'completed',
             holding_status = 'released',
             payout_status = 'processed',
             released_at = $1,
             payout_reference = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [now, transactionReference, connection.payment_id]
      );

      await query(
        `INSERT INTO payment_audit_logs (payment_id, action, details, created_at)
         VALUES ($1, 'Manual Payout Released', $2, NOW())`,
        [connection.payment_id, JSON.stringify({ message: `Admin released Creator payout of ₹${creatorAmount.toLocaleString("en-IN")}. Ref: ${transactionReference}` })]
      ).catch(() => {});
    }

    // Process Referral and Wallet credit
    let walletResult = null;
    let payoutBreakdown = null;
    try {
      const payoutProcessRes = await processProjectPayoutWithReferral({
        creatorId: connection.creator_id,
        collaborationId: connection.id,
        campaignId: connection.campaign_id || null,
        payoutId: payout.id,
        gross_payout_amount: creatorAmount,
        total_deal_amount: Number(connection.brand_total || 0) || (connection.pravixo_fee ? creatorAmount + Number(connection.pravixo_fee) : Math.round(creatorAmount / 0.8)),
        platform_fee: 0,
        transactionReference,
        description: `Payment released for collaboration (${campaignTitle})`,
      });
      walletResult = payoutProcessRes.creatorResult;
      payoutBreakdown = payoutProcessRes.breakdown;
    } catch (walletErr) {
      console.error("Wallet credit / referral commission error:", walletErr);
    }

    const finalCreatorCredited = payoutBreakdown?.creator_net_amount ?? creatorAmount;

    // Send Notification & Push to Creator
    const creatorPayoutText = `₹${finalCreatorCredited.toLocaleString("en-IN")} has been added to your wallet from your completed collaboration for "${campaignTitle}" (Ref: ${transactionReference}).`;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at)
       VALUES ($1, $2, 'payment_released', $3, '/dashboard/influencer', $4, NOW())`,
      [connection.creator_id, adminId || connection.brand_id, creatorPayoutText, JSON.stringify({ collaborationId: connection.id, amount: creatorAmount, reference: transactionReference })]
    ).catch(() => {});

    sendPushToUser(connection.creator_id, {
      title: "Payout Received in Wallet! 💰🎉",
      body: creatorPayoutText,
      url: "/dashboard/influencer",
    }).catch((err) => console.error("Creator payout push error:", err.message));

    // Send Notification & Push to Brand
    const brandPayoutText = `Creator payout of ₹${creatorAmount.toLocaleString("en-IN")} for "${campaignTitle}" has been released and completed.`;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at)
       VALUES ($1, $2, 'payment_released', $3, '/dashboard/customer', $4, NOW())`,
      [connection.brand_id, adminId || connection.creator_id, brandPayoutText, JSON.stringify({ collaborationId: connection.id, amount: creatorAmount, reference: transactionReference })]
    ).catch(() => {});

    sendPushToUser(connection.brand_id, {
      title: "Collaboration Payout Released ✅",
      body: brandPayoutText,
      url: "/dashboard/customer",
    }).catch((err) => console.error("Brand payout push error:", err.message));

    // Post to Conversation Chat if exists
    try {
      let convSql = `SELECT id FROM conversations WHERE creator_id = $1 AND brand_id = $2`;
      const convParams = [connection.creator_id, connection.brand_id];
      if (connection.campaign_id) {
        convParams.push(connection.campaign_id);
        convSql += ` AND campaign_id = $3`;
      }
      convSql += ` LIMIT 1`;
      const convFound = await query(convSql, convParams);

      if (convFound.rows.length > 0) {
        await query(
          `INSERT INTO messages (conversation_id, sender_id, text, message_type, metadata, read, created_at)
           VALUES ($1, $2, $3, 'system', $4, false, NOW())`,
          [
            convFound.rows[0].id,
            adminId || connection.brand_id,
            `[Payout Released] Admin released creator payout of ₹${creatorAmount.toLocaleString("en-IN")}. Transaction Ref: ${transactionReference}. Collaboration complete.`,
            JSON.stringify({ payoutId: payout.id, amount: creatorAmount, transactionReference, releasedAt: now }),
          ]
        );
      }
    } catch (chatErr) {
      console.warn("Could not post payout message to chat:", chatErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully released ₹${creatorAmount.toLocaleString("en-IN")} payout to creator.`,
      data: {
        payout,
        connection: formatConnection(connection),
        wallet: walletResult?.wallet || null,
        transaction: walletResult?.transaction || null,
      },
    });
  } catch (error) {
    console.error("Admin releaseCreatorPayout error:", error);
    return res.status(500).json({ success: false, message: "Failed to release creator payout.", error: error.message });
  }
};

// =====================================================
// RESOLVE PAYMENT DISPUTE
// POST /api/admin/payments/:id/resolve-dispute
// =====================================================
export const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const payRes = await query(`SELECT * FROM payments WHERE id::text = $1`, [id]);
    if (payRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    const payment = payRes.rows[0];
    if (payment.payment_status !== "disputed") {
      return res.status(400).json({ success: false, message: "Payment is not in disputed status." });
    }

    const now = Date.now();
    const grossAmount = Number(payment.gross_amount || 0);
    const creatorAmount = Number(payment.creator_amount || 0);

    if (resolution === "release") {
      const bankRes = await query(
        `SELECT id FROM creator_bank_details WHERE creator_id = $1 OR profile_id = $1 LIMIT 1`,
        [payment.creator_id]
      );
      const bankId = bankRes.rows[0]?.id || null;
      const ref = "RESOLVE-" + Math.random().toString(36).substring(2, 9).toUpperCase();

      await query(
        `UPDATE payments
         SET payment_status = 'completed',
             holding_status = 'released',
             released_at = $1,
             payout_status = 'processed',
             payout_reference = $2,
             creator_bank_account_id = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [now, ref, bankId, payment.id]
      );

      await query(
        `INSERT INTO payment_audit_logs (payment_id, action, details, created_at)
         VALUES ($1, 'Released', $2, NOW())`,
        [payment.id, JSON.stringify({ message: "Dispute resolved by Admin. Funds released to Creator." })]
      );

      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, task_id, read, created_at)
         VALUES ($1, $2, 'payment_released', $3, $4, false, NOW())`,
        [payment.brand_id, payment.brand_id, `Admin resolved dispute: Escrow payment of ₹${grossAmount.toLocaleString()} released to Creator.`, payment.task_id]
      );

      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, task_id, read, created_at)
         VALUES ($1, $2, 'payment_released', $3, $4, false, NOW())`,
        [payment.creator_id, payment.brand_id, `Admin resolved dispute: Escrow payment of ₹${creatorAmount.toLocaleString()} released to your account.`, payment.task_id]
      );
    } else {
      await query(
        `UPDATE payments
         SET payment_status = 'refunded',
             holding_status = 'refunded',
             refund_status = 'processed',
             refund_amount = $1,
             refund_reason = 'Admin Dispute Settlement Refund',
             updated_at = NOW()
         WHERE id = $2`,
        [grossAmount, payment.id]
      );

      await query(
        `INSERT INTO payment_audit_logs (payment_id, action, details, created_at)
         VALUES ($1, 'Refund Initiated', $2, NOW())`,
        [payment.id, JSON.stringify({ message: "Admin resolved dispute. Refund processed back to Brand." })]
      );

      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, task_id, read, created_at)
         VALUES ($1, $2, 'payment_released', $3, $4, false, NOW())`,
        [payment.brand_id, payment.brand_id, `Admin resolved dispute: Escrow payment of ₹${grossAmount.toLocaleString()} refunded to your account.`, payment.task_id]
      );

      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, task_id, read, created_at)
         VALUES ($1, $2, 'revision_requested', $3, $4, false, NOW())`,
        [payment.creator_id, payment.brand_id, `Admin resolved dispute: Escrow payment of ₹${creatorAmount.toLocaleString()} has been refunded to Brand.`, payment.task_id]
      );

      try {
        const payoutIdToReverse = payment.payout_reference || payment.id;
        const connRes = await query(`SELECT payout_id FROM connections WHERE id = $1`, [payment.connection_id]);
        const targetPayoutId = connRes.rows[0]?.payout_id || payoutIdToReverse;
        await reversePayoutAndReferralCommission({ payout_id: targetPayoutId });
      } catch (revErr) {
        console.warn("Dispute refund auto-reversal error:", revErr.message);
      }
    }

    const updatedPayment = await query(`SELECT * FROM payments WHERE id = $1`, [payment.id]);
    return res.status(200).json({
      success: true,
      message: `Dispute resolved with ${resolution}.`,
      data: formatPayment(updatedPayment.rows[0]),
    });
  } catch (error) {
    console.error("Admin resolveDispute error:", error);
    return res.status(500).json({ success: false, message: "Failed to resolve dispute.", error: error.message });
  }
};

// =====================================================
// GET REVENUE STATS
// GET /api/admin/revenue-stats
// =====================================================
export const getRevenueStats = async (req, res) => {
  try {
    const payRes = await query(`SELECT * FROM payments`);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    let todayRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;
    let totalRevenue = 0;
    let platformCommissionEarned = 0;
    let paymentsInHolding = 0;
    let releasedPayments = 0;
    let disputedPayments = 0;

    for (const p of payRes.rows) {
      const isPaid =
        p.payment_status !== "pending" &&
        p.payment_status !== "invoice_generated" &&
        p.payment_status !== "refunded";

      if (isPaid) {
        const gross = Number(p.gross_amount || 0);
        const comm = Number(p.platform_commission_amount || 0);
        totalRevenue += gross;
        platformCommissionEarned += comm;

        const timeDiff = now - new Date(p.created_at).getTime();
        if (timeDiff <= oneDay) todayRevenue += gross;
        if (timeDiff <= oneWeek) weeklyRevenue += gross;
        if (timeDiff <= oneMonth) monthlyRevenue += gross;

        if (p.payment_status === "holding") {
          paymentsInHolding += gross;
        } else if (p.payment_status === "completed" || p.payment_status === "released") {
          releasedPayments += gross;
        } else if (p.payment_status === "disputed") {
          disputedPayments += gross;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        todayRevenue,
        weeklyRevenue,
        monthlyRevenue,
        totalRevenue,
        platformCommissionEarned,
        paymentsInHolding,
        releasedPayments,
        disputedPayments,
      },
    });
  } catch (error) {
    console.error("Admin getRevenueStats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch revenue stats.", error: error.message });
  }
};

// =====================================================
// GET WEBHOOK LOGS
// GET /api/admin/webhooks/logs
// =====================================================
export const getWebhookLogs = async (req, res) => {
  try {
    const r = await query(`SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 100`);
    const logs = r.rows.map((w) => ({
      _id: w.id,
      id: w.id,
      eventType: w.event_type,
      payload: w.payload,
      headers: w.headers,
      status: w.status,
      errorMessage: w.error_message,
      createdAt: w.created_at,
    }));
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error("Admin getWebhookLogs error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch webhook logs.", error: error.message });
  }
};

// =====================================================
// LIST ALL PROFILES
// GET /api/admin/profiles
// =====================================================
export const listAllProfiles = async (req, res) => {
  try {
    const r = await query(
      `SELECT * FROM profiles WHERE role IN ('creator', 'brand') AND is_deleted IS NOT TRUE ORDER BY created_at DESC`
    );
    return res.status(200).json({ success: true, data: r.rows.map(formatProfile) });
  } catch (error) {
    console.error("Admin listAllProfiles error:", error);
    return res.status(500).json({ success: false, message: "Failed to list profiles.", error: error.message });
  }
};

// =====================================================
// RESTORE PROFILE (UNDO SOFT DELETE)
// POST /api/admin/profiles/:id/restore
// =====================================================
export const restoreProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `UPDATE profiles SET is_deleted = false, delete_reason = '', updated_at = NOW() WHERE id::text = $1 RETURNING *`,
      [id]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const senderId = req.user?.profileId || req.user?.id || id;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
       VALUES ($1, $2, 'account_restored', 'Your account has been restored by admin. You can now access the platform again.', NOW())`,
      [id, senderId]
    ).catch(() => {});

    return res.status(200).json({ success: true, message: "Profile restored successfully." });
  } catch (error) {
    console.error("Admin restoreProfile error:", error);
    return res.status(500).json({ success: false, message: "Failed to restore profile.", error: error.message });
  }
};

// =====================================================
// SEND ADMIN MESSAGE (notification) TO A USER
// POST /api/admin/profiles/:id/message
// =====================================================
export const sendAdminMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message cannot be empty." });
    }

    const prof = await query(`SELECT id FROM profiles WHERE id::text = $1`, [id]);
    if (prof.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const senderId = req.user?.profileId || req.user?.id || id;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
       VALUES ($1, $2, 'admin_message', $3, NOW())`,
      [id, senderId, `Message from Admin: ${message.trim()}`]
    );

    return res.status(200).json({ success: true, message: "Message sent successfully." });
  } catch (error) {
    console.error("Admin sendAdminMessage error:", error);
    return res.status(500).json({ success: false, message: "Failed to send message.", error: error.message });
  }
};

// =====================================================
// LIST ALL SUBSCRIPTIONS
// GET /api/admin/subscriptions
// =====================================================
export const listAllSubscriptions = async (req, res) => {
  try {
    const r = await query(`
      SELECT s.*,
             row_to_json(p.*) AS profile_data,
             row_to_json(pkg.*) AS package_data,
             row_to_json(o.*) AS offer_data
      FROM user_subscriptions s
      LEFT JOIN profiles p ON s.profile_id = p.id
      LEFT JOIN subscription_packages pkg ON s.package_id = pkg.id
      LEFT JOIN subscription_offers o ON s.offer_id = o.id
      ORDER BY s.created_at DESC
    `);

    const formatted = r.rows.map((sub) => {
      const profile = sub.profile_data || {};
      const pkg = sub.package_data || {};
      return {
        _id: sub.id,
        id: sub.id,
        profileId: profile.id || sub.profile_id,
        user: profile.full_name || "Unknown User",
        email: profile.email || "",
        handle: profile.handle ? `@${profile.handle}` : "",
        avatarUrl: profile.avatar_url || null,
        role: profile.role || "creator",
        currentPlan: pkg.name || "Custom Plan",
        packageId: pkg.id,
        packageName: pkg.name,
        packagePrice: pkg.price,
        billingPeriod: pkg.billing_period,
        startDate: sub.start_date,
        expiryDate: sub.expiry_date,
        status: sub.status,
        createdAt: sub.created_at,
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Admin listAllSubscriptions error:", error);
    return res.status(500).json({ success: false, message: "Failed to list subscriptions.", error: error.message });
  }
};

// =====================================================
// APPROVE SUBSCRIPTION UPGRADE REQUEST
// PATCH /api/admin/subscriptions/:id/approve
// =====================================================
export const approveSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subRes = await query(`
      SELECT s.*,
             row_to_json(pkg.*) AS package_data,
             row_to_json(p.*) AS profile_data
      FROM user_subscriptions s
      LEFT JOIN subscription_packages pkg ON s.package_id = pkg.id
      LEFT JOIN profiles p ON s.profile_id = p.id
      WHERE s.id::text = $1
    `, [id]);

    if (subRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Subscription request not found." });
    }

    const subscription = subRes.rows[0];
    if (subscription.status === "active") {
      return res.status(400).json({ success: false, message: "Subscription is already active." });
    }

    const profileId = subscription.profile_id;
    const pkg = subscription.package_data;

    // Cancel prior active subscriptions
    await query(
      `UPDATE user_subscriptions SET status = 'cancelled', updated_at = NOW() WHERE profile_id = $1 AND id != $2 AND status = 'active'`,
      [profileId, subscription.id]
    );

    const startDate = Date.now();
    let expiryDate;
    const billingPeriod = (pkg?.billing_period || "month").toLowerCase();

    if (billingPeriod.includes("year") || billingPeriod.includes("annual")) {
      expiryDate = startDate + 365 * 24 * 60 * 60 * 1000;
    } else if (billingPeriod.includes("month")) {
      expiryDate = startDate + 30 * 24 * 60 * 60 * 1000;
    } else if (billingPeriod.includes("week")) {
      expiryDate = startDate + 7 * 24 * 60 * 60 * 1000;
    } else if (billingPeriod.includes("day")) {
      expiryDate = startDate + 24 * 60 * 60 * 1000;
    } else {
      expiryDate = startDate + 30 * 24 * 60 * 60 * 1000;
    }

    const updatedRes = await query(
      `UPDATE user_subscriptions
       SET start_date = $1, expiry_date = $2, status = 'active', updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [startDate, expiryDate, subscription.id]
    );

    const adminId = req.user?.id || req.user?.profileId || profileId;
    const packageName = pkg?.name || "Premium";
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at)
       VALUES ($1, $2, 'subscription_upgrade_approved', $3, $4, $5, NOW())`,
      [
        profileId,
        adminId,
        `Congratulations! Your upgrade request for the "${packageName}" plan has been approved by admin and is now active!`,
        subscription.profile_data?.role === "brand" ? "/dashboard/brand" : "/dashboard/influencer",
        JSON.stringify({ subscriptionId: subscription.id, packageId: pkg?.id, packageName }),
      ]
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Subscription for ${subscription.profile_data?.full_name || "User"} approved successfully.`,
      data: formatUserSubscription(updatedRes.rows[0]),
    });
  } catch (error) {
    console.error("Admin approveSubscription error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve subscription.", error: error.message });
  }
};

// =====================================================
// REJECT SUBSCRIPTION UPGRADE REQUEST
// PATCH /api/admin/subscriptions/:id/reject
// =====================================================
export const rejectSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const subRes = await query(`
      SELECT s.*,
             row_to_json(pkg.*) AS package_data,
             row_to_json(p.*) AS profile_data
      FROM user_subscriptions s
      LEFT JOIN subscription_packages pkg ON s.package_id = pkg.id
      LEFT JOIN profiles p ON s.profile_id = p.id
      WHERE s.id::text = $1
    `, [id]);

    if (subRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Subscription request not found." });
    }

    const subscription = subRes.rows[0];
    const updatedRes = await query(
      `UPDATE user_subscriptions SET status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [subscription.id]
    );

    const profileId = subscription.profile_id;
    const pkg = subscription.package_data;
    const adminId = req.user?.id || req.user?.profileId || profileId;
    const packageName = pkg?.name || "Premium";
    const reasonMsg = reason ? ` Reason: ${reason}` : "";

    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at)
       VALUES ($1, $2, 'subscription_upgrade_rejected', $3, $4, $5, NOW())`,
      [
        profileId,
        adminId,
        `Your upgrade request for the "${packageName}" plan was declined by admin.${reasonMsg}`,
        subscription.profile_data?.role === "brand" ? "/dashboard/brand" : "/dashboard/influencer",
        JSON.stringify({ subscriptionId: subscription.id, packageId: pkg?.id, packageName, reason }),
      ]
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Subscription upgrade request rejected.",
      data: formatUserSubscription(updatedRes.rows[0]),
    });
  } catch (error) {
    console.error("Admin rejectSubscription error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject subscription.", error: error.message });
  }
};

// =====================================================
// SUBSCRIPTION PACKAGES CRUD
// =====================================================
export const getPackages = async (req, res) => {
  try {
    const r = await query(`SELECT * FROM subscription_packages ORDER BY sort_order ASC`);
    res.status(200).json({ success: true, data: r.rows.map(formatSubscriptionPackage) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPackage = async (req, res) => {
  try {
    const b = req.body;
    const r = await query(
      `INSERT INTO subscription_packages (name, price, original_price, billing_period, badge, features, active, target_role, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [b.name, b.price, b.originalPrice || b.original_price || null, b.billingPeriod || b.billing_period || 'month', b.badge || '', JSON.stringify(b.features || []), b.active !== false, b.targetRole || b.target_role || 'both', b.sortOrder || b.sort_order || 0]
    );
    res.status(201).json({ success: true, data: formatSubscriptionPackage(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePackage = async (req, res) => {
  try {
    const b = req.body;
    const r = await query(
      `UPDATE subscription_packages
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           original_price = COALESCE($3, original_price),
           billing_period = COALESCE($4, billing_period),
           badge = COALESCE($5, badge),
           features = COALESCE($6, features),
           active = COALESCE($7, active),
           target_role = COALESCE($8, target_role),
           sort_order = COALESCE($9, sort_order),
           updated_at = NOW()
       WHERE id::text = $10
       RETURNING *`,
      [b.name, b.price, b.originalPrice || b.original_price, b.billingPeriod || b.billing_period, b.badge, b.features ? JSON.stringify(b.features) : null, b.active, b.targetRole || b.target_role, b.sortOrder || b.sort_order, req.params.id]
    );
    res.status(200).json({ success: true, data: formatSubscriptionPackage(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePackage = async (req, res) => {
  try {
    await query(`DELETE FROM subscription_packages WHERE id::text = $1`, [req.params.id]);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const togglePackage = async (req, res) => {
  try {
    const r = await query(
      `UPDATE subscription_packages SET active = NOT active, updated_at = NOW() WHERE id::text = $1 RETURNING *`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data: formatSubscriptionPackage(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reorderPackages = async (req, res) => {
  try {
    const { packagesList } = req.body;
    if (Array.isArray(packagesList)) {
      await Promise.all(
        packagesList.map((p) =>
          query(`UPDATE subscription_packages SET sort_order = $1, updated_at = NOW() WHERE id::text = $2`, [p.sortOrder || p.sort_order || 0, p.id])
        )
      );
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// SUBSCRIPTION OFFERS CRUD
// =====================================================
export const getOffers = async (req, res) => {
  try {
    const r = await query(`SELECT * FROM subscription_offers ORDER BY created_at DESC`);
    res.status(200).json({ success: true, data: r.rows.map(formatSubscriptionOffer) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOffer = async (req, res) => {
  try {
    const b = req.body;
    const r = await query(
      `INSERT INTO subscription_offers (name, description, discount_percentage, discount_amount, banner_image_url, banner_storage_id, expiry_date, button_text, target_users, package_id, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [b.name, b.description || '', b.discountPercentage || b.discount_percentage || 0, b.discountAmount || b.discount_amount || 0, b.bannerImageUrl || b.banner_image_url || '', b.bannerStorageId || b.banner_storage_id || '', b.expiryDate || b.expiry_date || null, b.buttonText || b.button_text || 'Claim Offer', b.targetUsers || b.target_users || 'all', b.packageId || b.package_id || null, b.active !== false]
    );
    res.status(201).json({ success: true, data: formatSubscriptionOffer(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const b = req.body;
    const r = await query(
      `UPDATE subscription_offers
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           discount_percentage = COALESCE($3, discount_percentage),
           discount_amount = COALESCE($4, discount_amount),
           banner_image_url = COALESCE($5, banner_image_url),
           banner_storage_id = COALESCE($6, banner_storage_id),
           expiry_date = COALESCE($7, expiry_date),
           button_text = COALESCE($8, button_text),
           target_users = COALESCE($9, target_users),
           package_id = COALESCE($10, package_id),
           active = COALESCE($11, active),
           updated_at = NOW()
       WHERE id::text = $12
       RETURNING *`,
      [b.name, b.description, b.discountPercentage || b.discount_percentage, b.discountAmount || b.discount_amount, b.bannerImageUrl || b.banner_image_url, b.bannerStorageId || b.banner_storage_id, b.expiryDate || b.expiry_date, b.buttonText || b.button_text, b.targetUsers || b.target_users, b.packageId || b.package_id, b.active, req.params.id]
    );
    res.status(200).json({ success: true, data: formatSubscriptionOffer(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    await query(`DELETE FROM subscription_offers WHERE id::text = $1`, [req.params.id]);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleOffer = async (req, res) => {
  try {
    const r = await query(
      `UPDATE subscription_offers SET active = NOT active, updated_at = NOW() WHERE id::text = $1 RETURNING *`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data: formatSubscriptionOffer(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// POPUP SETTINGS
// =====================================================
export const getPopupSettings = async (req, res) => {
  try {
    let r = await query(`SELECT * FROM popup_settings LIMIT 1`);
    if (r.rows.length === 0) {
      r = await query(
        `INSERT INTO popup_settings (show_popup, popup_frequency, target_users, popup_expiry, created_at, updated_at)
         VALUES (false, 'every_login', 'both', $1, NOW(), NOW())
         RETURNING *`,
        [Date.now()]
      );
    }
    res.status(200).json({ success: true, data: formatPopupSetting(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePopupSettings = async (req, res) => {
  try {
    const b = req.body;
    let r = await query(`SELECT id FROM popup_settings LIMIT 1`);
    if (r.rows.length > 0) {
      r = await query(
        `UPDATE popup_settings
         SET show_popup = COALESCE($1, show_popup),
             popup_frequency = COALESCE($2, popup_frequency),
             target_users = COALESCE($3, target_users),
             popup_expiry = COALESCE($4, popup_expiry),
             active_offer_id = COALESCE($5, active_offer_id),
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [b.showPopup !== undefined ? b.showPopup : b.show_popup, b.popupFrequency || b.popup_frequency, b.targetUsers || b.target_users, b.popupExpiry || b.popup_expiry, b.activeOfferId || b.active_offer_id, r.rows[0].id]
      );
    } else {
      r = await query(
        `INSERT INTO popup_settings (show_popup, popup_frequency, target_users, popup_expiry, active_offer_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [b.showPopup || false, b.popupFrequency || 'every_login', b.targetUsers || 'both', b.popupExpiry || Date.now(), b.activeOfferId || null]
      );
    }
    res.status(200).json({ success: true, data: formatPopupSetting(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// SUBSCRIPTION ANALYTICS
// =====================================================
export const getSubscriptionAnalytics = async (req, res) => {
  try {
    const r = await query(`SELECT * FROM offer_analytics LIMIT 1`);
    if (r.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: { popupViews: 0, popupClicks: 0, upgradeClicks: 0, conversionRate: 0, revenue: 0 },
      });
    }
    res.status(200).json({ success: true, data: formatOfferAnalytics(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// CONTENT MANAGEMENT (CLIENT REVIEWS)
// =====================================================
const getFileUrl = (file) => {
  if (!file) return null;
  if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

export const getClientReviews = async (req, res) => {
  try {
    const r = await query(`SELECT * FROM video_reviews ORDER BY created_at DESC`);
    res.status(200).json({ success: true, data: r.rows.map(formatVideoReview) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createClientReview = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.files?.video?.[0]) {
      payload.videoUrl = getFileUrl(req.files.video[0]);
    }
    if (req.files?.thumbnail?.[0]) {
      payload.thumbnailUrl = getFileUrl(req.files.thumbnail[0]);
    }
    if (payload.rating) {
      payload.rating = Number(payload.rating);
    }
    if (!payload.videoUrl) {
      return res.status(400).json({ success: false, message: "A video file or URL is required." });
    }
    const r = await query(
      `INSERT INTO video_reviews (thumbnail_url, video_url, reviewer_name, reviewer_avatar, reviewer_id, target_id, target_name, target_avatar, campaign_name, review_type, review_text, rating, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [payload.thumbnailUrl || null, payload.videoUrl, payload.reviewerName || '', payload.reviewerAvatar || null, payload.reviewerId || null, payload.targetId || null, payload.targetName || '', payload.targetAvatar || null, payload.campaignName || '', payload.reviewType || 'brand', payload.reviewText || '', payload.rating || 5]
    );
    res.status(201).json({ success: true, data: formatVideoReview(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClientReview = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.files?.video?.[0]) {
      payload.videoUrl = getFileUrl(req.files.video[0]);
    }
    if (req.files?.thumbnail?.[0]) {
      payload.thumbnailUrl = getFileUrl(req.files.thumbnail[0]);
    }
    const r = await query(
      `UPDATE video_reviews
       SET thumbnail_url = COALESCE($1, thumbnail_url),
           video_url = COALESCE($2, video_url),
           reviewer_name = COALESCE($3, reviewer_name),
           reviewer_avatar = COALESCE($4, reviewer_avatar),
           target_name = COALESCE($5, target_name),
           campaign_name = COALESCE($6, campaign_name),
           review_type = COALESCE($7, review_type),
           review_text = COALESCE($8, review_text),
           rating = COALESCE($9, rating),
           updated_at = NOW()
       WHERE id::text = $10
       RETURNING *`,
      [payload.thumbnailUrl, payload.videoUrl, payload.reviewerName, payload.reviewerAvatar, payload.targetName, payload.campaignName, payload.reviewType, payload.reviewText, payload.rating ? Number(payload.rating) : null, req.params.id]
    );
    res.status(200).json({ success: true, data: formatVideoReview(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteClientReview = async (req, res) => {
  try {
    await query(`DELETE FROM video_reviews WHERE id::text = $1`, [req.params.id]);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// CONTENT MANAGEMENT (BLOGS)
// =====================================================
export const getBlogs = async (req, res) => {
  try {
    const r = await query(`SELECT * FROM blogs ORDER BY created_at DESC`);
    res.status(200).json({ success: true, data: r.rows.map(formatBlog) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBlog = async (req, res) => {
  try {
    const b = req.body;
    const r = await query(
      `INSERT INTO blogs (title, slug, content, excerpt, author, cover_image, cover_image_url, tags, published, category, target_role, featured, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [b.title, b.slug || b.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-'), b.content || '', b.excerpt || '', b.author || 'Admin', b.coverImage || b.cover_image || '', b.coverImageUrl || b.cover_image_url || '', JSON.stringify(b.tags || []), b.published !== false, b.category || 'General', b.targetRole || b.target_role || 'both', Boolean(b.featured)]
    );
    res.status(201).json({ success: true, data: formatBlog(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const b = req.body;
    const r = await query(
      `UPDATE blogs
       SET title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           content = COALESCE($3, content),
           excerpt = COALESCE($4, excerpt),
           author = COALESCE($5, author),
           cover_image = COALESCE($6, cover_image),
           cover_image_url = COALESCE($7, cover_image_url),
           tags = COALESCE($8, tags),
           published = COALESCE($9, published),
           category = COALESCE($10, category),
           target_role = COALESCE($11, target_role),
           featured = COALESCE($12, featured),
           updated_at = NOW()
       WHERE id::text = $13
       RETURNING *`,
      [b.title, b.slug, b.content, b.excerpt, b.author, b.coverImage || b.cover_image, b.coverImageUrl || b.cover_image_url, b.tags ? JSON.stringify(b.tags) : null, b.published, b.category, b.targetRole || b.target_role, b.featured, req.params.id]
    );
    res.status(200).json({ success: true, data: formatBlog(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    await query(`DELETE FROM blogs WHERE id::text = $1`, [req.params.id]);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// CONTENT MANAGEMENT (PRO TIPS)
// =====================================================
export const getProTips = async (req, res) => {
  try {
    const r = await query(`SELECT * FROM pro_tips ORDER BY created_at DESC`);
    res.status(200).json({ success: true, data: r.rows.map(formatProTip) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProTip = async (req, res) => {
  try {
    const b = req.body;
    const r = await query(
      `INSERT INTO pro_tips (title, content, category, image, icon_name, author, is_published, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [b.title, b.content || '', b.category || 'General', b.image || '', b.iconName || b.icon_name || '', b.author || 'Pravixo Team', b.isPublished !== false]
    );
    res.status(201).json({ success: true, data: formatProTip(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProTip = async (req, res) => {
  try {
    const b = req.body;
    const r = await query(
      `UPDATE pro_tips
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           category = COALESCE($3, category),
           image = COALESCE($4, image),
           icon_name = COALESCE($5, icon_name),
           author = COALESCE($6, author),
           is_published = COALESCE($7, is_published),
           updated_at = NOW()
       WHERE id::text = $8
       RETURNING *`,
      [b.title, b.content, b.category, b.image, b.iconName || b.icon_name, b.author, b.isPublished !== undefined ? b.isPublished : b.is_published, req.params.id]
    );
    res.status(200).json({ success: true, data: formatProTip(r.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProTip = async (req, res) => {
  try {
    await query(`DELETE FROM pro_tips WHERE id::text = $1`, [req.params.id]);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// UPDATE ADMIN CREDENTIALS
// PUT /api/admin/credentials
// =====================================================
export const updateAdminCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminId = req.user?.id || req.user?.profileId || req.profile?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    if (!email && !password) {
      return res.status(400).json({ success: false, message: "Provide email or password to update." });
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await query(
        `SELECT id FROM profiles WHERE LOWER(email) = $1 AND id::text != $2 LIMIT 1`,
        [normalizedEmail, adminId]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: "This email is already in use by another account." });
      }
    }

    let passwordHash = null;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
      }
      const bcrypt = (await import("bcryptjs")).default;
      passwordHash = await bcrypt.hash(password, 10);
    }

    let sql = `UPDATE profiles SET updated_at = NOW()`;
    const params = [];
    if (email) {
      params.push(email.trim().toLowerCase());
      sql += `, email = $${params.length}`;
    }
    if (passwordHash) {
      params.push(passwordHash);
      sql += `, password = $${params.length}`;
    }
    params.push(adminId);
    sql += ` WHERE id::text = $${params.length} RETURNING *`;

    const r = await query(sql, params);
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Admin profile not found." });
    }

    const updatedProfile = formatProfile(r.rows[0]);
    const jwt = (await import("jsonwebtoken")).default;
    const token = jwt.sign(
      {
        userId: updatedProfile.userId,
        email: updatedProfile.email,
        role: updatedProfile.role,
        profileId: updatedProfile.id.toString(),
      },
      process.env.JWT_SECRET || "default_jwt_secret",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Admin credentials updated successfully.",
      token,
      user: {
        _id: updatedProfile.id,
        id: updatedProfile.id,
        userId: updatedProfile.userId,
        email: updatedProfile.email,
        role: updatedProfile.role,
        fullName: updatedProfile.fullName,
      },
    });
  } catch (error) {
    console.error("Admin updateAdminCredentials error:", error);
    return res.status(500).json({ success: false, message: "Failed to update admin credentials.", error: error.message });
  }
};

// =====================================================
// BULK DELETE MESSAGES
// POST /api/admin/messages/bulk-delete
// =====================================================
export const bulkDeleteMessages = async (req, res) => {
  try {
    const { messageIds, deleteType } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: "No messages selected." });
    }

    if (!["all", "creator", "brand"].includes(deleteType)) {
      return res.status(400).json({ success: false, message: "Invalid delete type." });
    }

    if (deleteType === "all") {
      await query(
        `UPDATE messages SET deleted_by_admin = true, deleted_at = NOW(), updated_at = NOW() WHERE id::text = ANY($1::text[])`,
        [messageIds]
      );
    } else if (deleteType === "creator") {
      await query(
        `UPDATE messages SET deleted_for_creator = true, deleted_at = NOW(), updated_at = NOW() WHERE id::text = ANY($1::text[])`,
        [messageIds]
      );
    } else if (deleteType === "brand") {
      await query(
        `UPDATE messages SET deleted_for_brand = true, deleted_at = NOW(), updated_at = NOW() WHERE id::text = ANY($1::text[])`,
        [messageIds]
      );
    }

    return res.status(200).json({ success: true, message: "Messages deleted successfully." });
  } catch (error) {
    console.error("Bulk Delete Messages error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete messages." });
  }
};

// =====================================================
// ADMIN ACTIVITY FEED
// GET /api/admin/activity
// =====================================================
export const getAdminActivityFeed = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?.profileId;
    const limit = parseInt(req.query.limit) || 50;
    const since = req.query.since ? parseInt(req.query.since) : null;
    const sinceDate = since ? new Date(since) : null;

    let userSql = `SELECT id, full_name, avatar_url, role, handle, created_at FROM profiles WHERE is_deleted IS NOT TRUE`;
    const userParams = [];
    if (sinceDate) {
      userParams.push(sinceDate);
      userSql += ` AND created_at > $1`;
    }
    userSql += ` ORDER BY created_at DESC LIMIT 20`;
    const newUsers = await query(userSql, userParams);

    const signupEvents = newUsers.rows.map((u) => ({
      _id: "signup_" + u.id,
      id: "signup_" + u.id,
      type: "signup",
      role: u.role,
      title: "New " + u.role + " joined",
      text: u.full_name + (u.handle ? " (@" + u.handle + ")" : "") + " created an account",
      body: u.full_name + (u.handle ? " (@" + u.handle + ")" : "") + " created an account",
      avatarUrl: u.avatar_url || null,
      actorName: u.full_name,
      createdAt: new Date(u.created_at).getTime(),
      timestamp: new Date(u.created_at).getTime(),
    }));

    let convSql = `
      SELECT c.*,
             row_to_json(cr.*) AS creator_data,
             row_to_json(br.*) AS brand_data
      FROM conversations c
      LEFT JOIN profiles cr ON c.creator_id = cr.id
      LEFT JOIN profiles br ON c.brand_id = br.id
    `;
    const convParams = [];
    if (sinceDate) {
      convParams.push(sinceDate);
      convSql += ` WHERE c.created_at > $1`;
    }
    convSql += ` ORDER BY c.created_at DESC LIMIT 15`;
    const recentConversations = await query(convSql, convParams);

    const collaborationEvents = recentConversations.rows.map((c) => {
      const crName = c.creator_data?.full_name || "A creator";
      const brName = c.brand_data?.full_name || "a brand";
      return {
        _id: "collab_" + c.id,
        id: "collab_" + c.id,
        type: "collaboration",
        title: "New collaboration started",
        text: `${crName} connected with ${brName}`,
        body: `${crName} connected with ${brName}`,
        avatarUrl: c.creator_data?.avatar_url || null,
        actorName: crName,
        createdAt: new Date(c.created_at).getTime(),
        timestamp: new Date(c.created_at).getTime(),
      };
    });

    let paySql = `SELECT * FROM payments`;
    const payParams = [];
    if (sinceDate) {
      payParams.push(sinceDate);
      paySql += ` WHERE created_at > $1`;
    }
    paySql += ` ORDER BY created_at DESC LIMIT 10`;
    const recentPayments = await query(paySql, payParams);

    const paymentEvents = recentPayments.rows.map((p) => {
      const amt = Number(p.amount || p.gross_amount || 0);
      return {
        _id: "payment_" + p.id,
        id: "payment_" + p.id,
        type: "payment",
        title: "Payment processed",
        text: `A payment of ₹${(amt > 1000 ? amt : amt / 100).toLocaleString("en-IN")} was recorded`,
        body: `A payment of ₹${(amt > 1000 ? amt : amt / 100).toLocaleString("en-IN")} was recorded`,
        avatarUrl: null,
        actorName: "Payment System",
        createdAt: new Date(p.created_at).getTime(),
        timestamp: new Date(p.created_at).getTime(),
      };
    });

    let notifSql = `
      SELECT n.*,
             row_to_json(s.*) AS sender_data
      FROM notifications n
      LEFT JOIN profiles s ON n.sender_id = s.id
      WHERE (n.recipient_id::text = $1
         OR n.type IN ('campaign_pending_verification', 'campaign_approved', 'campaign_rejected', 'dispute_raised', 'withdrawal_requested', 'verification_requested', 'payment_release_eligible', 'subscription_upgrade_requested'))
    `;
    const notifParams = [adminId || "00000000-0000-0000-0000-000000000000"];
    if (sinceDate) {
      notifParams.push(sinceDate);
      notifSql += ` AND n.created_at > $${notifParams.length}`;
    }
    notifSql += ` ORDER BY n.created_at DESC LIMIT 30`;
    const systemNotifications = await query(notifSql, notifParams);

    const notifEvents = systemNotifications.rows.map((n) => {
      const time = n.created_at ? new Date(n.created_at).getTime() : Date.now();
      let title = "Platform Alert";
      if (n.type === "campaign_pending_verification") title = "New Campaign Submitted";
      else if (n.type === "subscription_upgrade_requested") title = "Subscription Upgrade Request";
      else if (n.type === "withdrawal_requested") title = "Withdrawal Request";
      else if (n.type === "verification_requested") title = "Verification Request";
      return {
        _id: String(n.id),
        id: String(n.id),
        type: n.type,
        title,
        text: n.text,
        body: n.text,
        targetUrl: n.target_url || "",
        avatarUrl: n.sender_data?.avatar_url || null,
        actorName: n.sender_data?.full_name || "System",
        createdAt: time,
        timestamp: time,
        read: Boolean(n.read),
      };
    });

    const allEvents = [...notifEvents, ...signupEvents, ...collaborationEvents, ...paymentEvents]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return res.status(200).json({ success: true, data: allEvents, count: allEvents.length });
  } catch (error) {
    console.error("Admin getAdminActivityFeed error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch activity feed.", error: error.message });
  }
};

// =====================================================
// LIST ADMIN CAMPAIGNS FOR VERIFICATION
// GET /api/admin/campaigns
// =====================================================
export const listAdminCampaigns = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT c.*, row_to_json(b.*) AS brand_data
      FROM campaigns c
      LEFT JOIN profiles b ON c.brand_id = b.id
    `;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` WHERE c.status = $1`;
    }
    sql += ` ORDER BY c.created_at DESC`;

    const r = await query(sql, params);
    const campaigns = r.rows.map((c) => {
      const fc = formatCampaign(c);
      return {
        ...fc,
        brandId: c.brand_data ? formatProfile(c.brand_data) : fc.brandId,
        brand: c.brand_data ? formatProfile(c.brand_data) : null,
      };
    });

    return res.status(200).json({ success: true, data: campaigns });
  } catch (error) {
    console.error("Admin listAdminCampaigns error:", error);
    return res.status(500).json({ success: false, message: "Failed to list campaigns.", error: error.message });
  }
};

// =====================================================
// VERIFY CAMPAIGN (APPROVE / REJECT / RESET TO PENDING / CLOSE)
// PATCH /api/admin/campaigns/:id/verify
// =====================================================
export const verifyCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationFeedback } = req.body;
    const normalizedStatus = status === "PENDING" ? "PENDING_VERIFICATION" : status;

    if (!["APPROVED", "REJECTED", "PENDING_VERIFICATION", "CLOSED"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED, REJECTED, PENDING_VERIFICATION, or CLOSED.",
      });
    }

    const campRes = await query(`
      SELECT c.*, row_to_json(b.*) AS brand_data
      FROM campaigns c
      LEFT JOIN profiles b ON c.brand_id = b.id
      WHERE c.id::text = $1
    `, [id]);

    if (campRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Campaign not found." });
    }

    const campaign = campRes.rows[0];

    const updatedRes = await query(
      `UPDATE campaigns
       SET status = $1,
           verification_feedback = COALESCE($2, verification_feedback),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [normalizedStatus, verificationFeedback !== undefined ? verificationFeedback : null, campaign.id]
    );

    const updatedCamp = formatCampaign(updatedRes.rows[0]);
    const adminId = req.user?.id || req.user?.profileId;
    const brandId = campaign.brand_id;
    const notifType = normalizedStatus === "APPROVED" ? "campaign_approved" : normalizedStatus === "REJECTED" ? "campaign_rejected" : "campaign_updated";
    const notifText = normalizedStatus === "APPROVED"
      ? `Great news! Your campaign "${campaign.title}" has been approved by Admin and is now live for Creators.`
      : normalizedStatus === "REJECTED"
      ? `Your campaign "${campaign.title}" was not approved.${verificationFeedback ? ` Reason: ${verificationFeedback}` : ""}`
      : `Your campaign "${campaign.title}" status has been updated to ${normalizedStatus}.`;

    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [brandId, adminId || brandId, notifType, notifText]
    ).catch(() => {});

    sendPushToUser(brandId, {
      title: normalizedStatus === "APPROVED" ? "Campaign Approved! 🎉" : "Campaign Verification Update",
      body: notifText,
      url: `/dashboard/customer`,
    }).catch((err) => console.error("Brand push error:", err.message));

    if (normalizedStatus === "APPROVED") {
      const brandName = campaign.brand_data?.full_name || "A Brand";

      let creatorsRes = await query(
        `SELECT id FROM profiles WHERE role = 'creator' AND (category = $1 OR pref_niches ILIKE $2)`,
        [campaign.category, `%${campaign.category || ""}%`]
      );

      if (creatorsRes.rows.length === 0) {
        creatorsRes = await query(`SELECT id FROM profiles WHERE role = 'creator'`);
      }

      const creatorIds = creatorsRes.rows.map((c) => c.id);
      if (creatorIds.length > 0) {
        for (const cId of creatorIds) {
          await query(
            `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
             VALUES ($1, $2, 'new_campaign_available', $3, NOW())`,
            [cId, brandId, `${brandName} launched a new campaign: "${campaign.title}"`]
          ).catch(() => {});
        }

        sendPushToUsers(creatorIds, {
          title: `${brandName} launched a new campaign! 🚀`,
          body: campaign.title,
          icon: campaign.brand_data?.avatar_url || "/logo192.png",
          url: `/browse`,
        }).catch((err) => console.error("Creator push error:", err.message));
      }
    }

    return res.status(200).json({
      success: true,
      message: `Campaign status updated to ${normalizedStatus} successfully.`,
      data: updatedCamp,
    });
  } catch (error) {
    console.error("Admin verifyCampaign error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify campaign.", error: error.message });
  }
};

// =====================================================
// DELETE CAMPAIGN (PERMANENTLY)
// DELETE /api/admin/campaigns/:id
// =====================================================
export const deleteAdminCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const camp = await query(`SELECT id FROM campaigns WHERE id::text = $1`, [id]);
    if (camp.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Campaign not found." });
    }

    await query(`DELETE FROM campaign_tasks WHERE campaign_id::text = $1`, [id]).catch(() => {});
    await query(`DELETE FROM connections WHERE campaign_id::text = $1`, [id]).catch(() => {});
    await query(`DELETE FROM favorites WHERE target_id::text = $1`, [id]).catch(() => {});
    await query(`DELETE FROM campaigns WHERE id::text = $1`, [id]);

    return res.status(200).json({ success: true, message: "Campaign deleted permanently from database." });
  } catch (error) {
    console.error("Admin deleteAdminCampaign error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete campaign.", error: error.message });
  }
};

// =====================================================
// DELETE ALL TEST/DUMMY CAMPAIGNS
// POST /api/admin/campaigns/cleanup-test
// =====================================================
export const deleteTestCampaigns = async (req, res) => {
  try {
    const r = await query(
      `SELECT id FROM campaigns
       WHERE title ~* 'Task 20|Task 21|test|dummy|^Test Campaign'
          OR description ~* 'Task 20|Task 21|test|dummy|^Test Campaign'
          OR category ~* '^test$'`
    );

    const testIds = r.rows.map((c) => c.id);
    if (testIds.length > 0) {
      await query(`DELETE FROM campaign_tasks WHERE campaign_id = ANY($1::uuid[])`, [testIds]).catch(() => {});
      await query(`DELETE FROM connections WHERE campaign_id = ANY($1::uuid[])`, [testIds]).catch(() => {});
      await query(`DELETE FROM favorites WHERE target_id = ANY($1::uuid[])`, [testIds]).catch(() => {});
      const del = await query(`DELETE FROM campaigns WHERE id = ANY($1::uuid[]) RETURNING id`, [testIds]);

      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${del.rows.length} test campaigns from database.`,
        deletedCount: del.rows.length,
      });
    }

    return res.status(200).json({ success: true, message: "No test campaigns found to delete.", deletedCount: 0 });
  } catch (error) {
    console.error("Admin deleteTestCampaigns error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete test campaigns.", error: error.message });
  }
};

// =====================================================
// OPEN OR CREATE ADMIN CONVERSATION (WITH BRAND OR CREATOR)
// POST /api/admin/conversations/open
// =====================================================
export const openAdminConversation = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?.profileId;
    const { targetUserId, campaignId, initialMessage } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "targetUserId is required." });
    }

    const profRes = await query(`SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`, [targetUserId]);
    if (profRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    const targetProfile = profRes.rows[0];
    const isCreator = targetProfile.role === "creator";
    const convType = isCreator ? "admin_creator" : "admin_brand";

    let convRes;
    if (campaignId) {
      convRes = await query(
        `SELECT * FROM conversations
         WHERE admin_id = $1 AND ${isCreator ? "creator_id" : "brand_id"} = $2 AND conversation_type = $3 AND campaign_id::text = $4 LIMIT 1`,
        [adminId, targetProfile.id, convType, campaignId]
      );
    } else {
      convRes = await query(
        `SELECT * FROM conversations
         WHERE admin_id = $1 AND ${isCreator ? "creator_id" : "brand_id"} = $2 AND conversation_type = $3 LIMIT 1`,
        [adminId, targetProfile.id, convType]
      );
    }

    let conversation = convRes.rows[0];
    if (!conversation) {
      const insertRes = await query(
        `INSERT INTO conversations (admin_id, creator_id, brand_id, conversation_type, campaign_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
         RETURNING *`,
        [
          adminId,
          isCreator ? targetProfile.id : null,
          !isCreator ? targetProfile.id : null,
          convType,
          campaignId || null,
        ]
      );
      conversation = insertRes.rows[0];
    }

    if (initialMessage && initialMessage.trim()) {
      await query(
        `INSERT INTO messages (conversation_id, sender_id, text, read, created_at)
         VALUES ($1, $2, $3, false, NOW())`,
        [conversation.id, adminId, initialMessage.trim()]
      );

      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, created_at)
         VALUES ($1, $2, 'admin_message', $3, NOW())`,
        [
          targetProfile.id,
          adminId,
          `New message from Pravixo Admin: "${initialMessage.trim().slice(0, 60)}${initialMessage.trim().length > 60 ? "..." : ""}"`,
        ]
      ).catch(() => {});
    }

    const popRes = await query(`
      SELECT c.*,
             row_to_json(cr.*) AS creator_data,
             row_to_json(br.*) AS brand_data,
             row_to_json(ad.*) AS admin_data,
             row_to_json(cp.*) AS campaign_data
      FROM conversations c
      LEFT JOIN profiles cr ON c.creator_id = cr.id
      LEFT JOIN profiles br ON c.brand_id = br.id
      LEFT JOIN profiles ad ON c.admin_id = ad.id
      LEFT JOIN campaigns cp ON c.campaign_id = cp.id
      WHERE c.id = $1
    `, [conversation.id]);

    const c = popRes.rows[0];
    const populated = {
      ...formatConversation(c),
      creatorId: c.creator_data ? formatProfile(c.creator_data) : null,
      brandId: c.brand_data ? formatProfile(c.brand_data) : null,
      adminId: c.admin_data ? formatProfile(c.admin_data) : null,
      campaignId: c.campaign_data ? formatCampaign(c.campaign_data) : null,
    };

    return res.status(200).json({
      success: true,
      message: "Admin conversation ready.",
      data: populated,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Admin openAdminConversation error:", error);
    return res.status(500).json({ success: false, message: "Failed to open admin conversation.", error: error.message });
  }
};

// =====================================================
// LIST CREATOR WITHDRAWAL REQUESTS (TASK 14)
// GET /api/admin/withdrawals
// =====================================================
export const listWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT w.*,
             row_to_json(cr.*) AS creator_data,
             row_to_json(pb.*) AS processed_by_data,
             row_to_json(bk.*) AS bank_details_data
      FROM withdrawals w
      LEFT JOIN profiles cr ON w.creator_id = cr.id
      LEFT JOIN profiles pb ON w.processed_by = pb.id
      LEFT JOIN creator_bank_details bk ON w.creator_id = bk.creator_id
    `;
    const params = [];
    if (status && status !== "all") {
      params.push(status);
      sql += ` WHERE w.status = $1`;
    }
    sql += ` ORDER BY w.requested_at DESC NULLS LAST, w.created_at DESC`;

    const r = await query(sql, params);
    const enriched = r.rows.map((w) => {
      const fw = formatWithdrawal(w);
      const bank = w.bank_details_data ? formatBankDetails(w.bank_details_data) : (w.bank_details_snapshot || null);
      return {
        ...fw,
        creator: w.creator_data ? formatProfile(w.creator_data) : null,
        creatorId: w.creator_data ? formatProfile(w.creator_data) : fw.creatorId,
        processedBy: w.processed_by_data ? formatProfile(w.processed_by_data) : null,
        bankDetails: bank,
      };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error("Admin listWithdrawals error:", error);
    return res.status(500).json({ success: false, message: "Failed to load withdrawal requests.", error: error.message });
  }
};

// =====================================================
// PROCESS / COMPLETE / REJECT CREATOR WITHDRAWAL (TASK 14)
// POST /api/admin/withdrawals/:id/process
// =====================================================
export const processWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes = "", failureReason = "" } = req.body;
    const adminId = req.user?.id || req.user?.profileId;

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'APPROVE' or 'REJECT'." });
    }

    const wRes = await query(`SELECT * FROM withdrawals WHERE id::text = $1`, [id]);
    if (wRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Withdrawal request not found." });
    }

    const withdrawal = wRes.rows[0];

    if (withdrawal.status !== "PENDING" && withdrawal.status !== "PROCESSING") {
      return res.status(400).json({
        success: false,
        message: `Withdrawal has already been processed with status: ${withdrawal.status}.`,
      });
    }

    const now = Date.now();
    const creatorId = withdrawal.creator_id;
    const amount = Number(withdrawal.amount);

    if (action === "APPROVE") {
      const payoutReference = `TXN-WDR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const updatedW = await query(
        `UPDATE withdrawals
         SET status = 'COMPLETED',
             payout_reference = $1,
             admin_notes = $2,
             processed_by = $3,
             processed_at = $4,
             completed_at = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [payoutReference, notes, adminId, now, withdrawal.id]
      );

      // Deduct pending_withdrawal_balance and increment total_withdrawn
      await query(
        `UPDATE wallets
         SET pending_withdrawal_balance = GREATEST(0, pending_withdrawal_balance - $1),
             total_withdrawn = total_withdrawn + $1,
             updated_at = NOW()
         WHERE creator_id = $2`,
        [amount, creatorId]
      );

      // Update wallet transaction
      await query(
        `UPDATE wallet_transactions
         SET status = 'COMPLETED',
             description = $1,
             updated_at = NOW()
         WHERE withdrawal_id = $2`,
        [`Withdrawal of ₹${amount.toLocaleString("en-IN")} completed (Ref: ${payoutReference})`, withdrawal.id]
      );

      // Notify creator
      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at)
         VALUES ($1, $2, 'withdrawal_completed', $3, '/dashboard/creator/wallet', $4, NOW())`,
        [
          creatorId,
          adminId,
          `Your ₹${amount.toLocaleString("en-IN")} withdrawal request has been completed (Ref: ${payoutReference}).`,
          JSON.stringify({ withdrawalId: withdrawal.id, amount, payoutReference }),
        ]
      ).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `Withdrawal of ₹${amount.toLocaleString("en-IN")} successfully processed and completed.`,
        data: formatWithdrawal(updatedW.rows[0]),
      });
    } else if (action === "REJECT") {
      const reason = failureReason || notes || "Declined by administrator";

      const updatedW = await query(
        `UPDATE withdrawals
         SET status = 'FAILED',
             failure_reason = $1,
             admin_notes = $2,
             processed_by = $3,
             processed_at = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [reason, notes, adminId, now, withdrawal.id]
      );

      // Restore wallet available_balance and deduct pending_withdrawal_balance
      const walletRes = await query(
        `UPDATE wallets
         SET available_balance = available_balance + $1,
             pending_withdrawal_balance = GREATEST(0, pending_withdrawal_balance - $1),
             updated_at = NOW()
         WHERE creator_id = $2
         RETURNING *`,
        [amount, creatorId]
      );

      const balAfter = Number(walletRes.rows[0]?.available_balance || 0);

      await query(
        `UPDATE wallet_transactions
         SET status = 'FAILED',
             description = $1,
             balance_after = $2,
             updated_at = NOW()
         WHERE withdrawal_id = $3`,
        [`Withdrawal failed: ${reason}. Funds restored.`, balAfter, withdrawal.id]
      );

      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at)
         VALUES ($1, $2, 'withdrawal_failed', $3, '/dashboard/creator/wallet', $4, NOW())`,
        [
          creatorId,
          adminId,
          `Your withdrawal request of ₹${amount.toLocaleString("en-IN")} was not completed (${reason}). The funds have been restored to your available wallet balance.`,
          JSON.stringify({ withdrawalId: withdrawal.id, amount, reason }),
        ]
      ).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `Withdrawal rejected and ₹${amount.toLocaleString("en-IN")} restored to creator's available wallet balance.`,
        data: formatWithdrawal(updatedW.rows[0]),
      });
    }
  } catch (error) {
    console.error("Admin processWithdrawal error:", error);
    return res.status(500).json({ success: false, message: "Failed to process withdrawal.", error: error.message });
  }
};
