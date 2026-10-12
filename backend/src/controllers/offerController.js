import { query } from "../config/postgres.js";
import { formatOffer, formatProfile } from "../utils/formatters.js";
import { sendPushToUsers, sendPushToUser } from "../utils/webPush.js";

const resolveProfile = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [idOrUserId]
  );
  return res.rows[0] || null;
};

// POST /api/offers
export const createOffer = async (req, res) => {
  try {
    const {
      offerTitle,
      conditionText,
      offerCategory = "discount",
      discountPercent,
      monetaryBonus,
      validityHours,
    } = req.body;

    const userProfileId = req.user?._id || req.body.creatorId || req.body.brandId;
    if (!userProfileId) {
      return res.status(400).json({
        success: false,
        message: "User profile ID is required.",
      });
    }

    if (!offerTitle || !offerTitle.trim() || !conditionText || !conditionText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Offer title and condition text are required.",
      });
    }

    const numericValidity = Number(validityHours);
    if (isNaN(numericValidity) || numericValidity <= 0) {
      return res.status(400).json({
        success: false,
        message: "validityHours must be a positive number greater than 0.",
      });
    }

    const userProfile = await resolveProfile(userProfileId);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const isCreator = userProfile.role === "creator";
    const isBrand = userProfile.role === "brand";

    if (!isCreator && !isBrand) {
      return res.status(403).json({
        success: false,
        message: "Only creators and brands can publish offers.",
      });
    }

    const roleType = isCreator ? "creator" : "brand";

    let numDiscount = null;
    if (discountPercent !== undefined && discountPercent !== null) {
      numDiscount = Number(discountPercent);
      if (isNaN(numDiscount) || numDiscount < 1 || numDiscount > 90) {
        return res.status(400).json({
          success: false,
          message: "Discount percent must be between 1 and 90.",
        });
      }
    }

    const { rows } = await query(
      `
      INSERT INTO offers (
        creator_id, brand_id, creator_or_brand_type, offer_title, condition_text,
        offer_category, discount_percent, monetary_bonus, validity_hours, status,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, 'pending_approval',
        NOW(), NOW()
      )
      RETURNING *;
      `,
      [
        isCreator ? userProfile.id : null,
        isBrand ? userProfile.id : null,
        roleType,
        offerTitle.trim(),
        conditionText.trim(),
        offerCategory,
        numDiscount,
        monetaryBonus ? Number(monetaryBonus) : null,
        numericValidity,
      ]
    );

    const offer = rows[0];

    // Notify Admins
    try {
      const adminRes = await query(`SELECT id FROM profiles WHERE role = 'admin' AND is_deleted = false;`);
      for (const adm of adminRes.rows) {
        await query(
          `
          INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
          VALUES ($1, $2, 'admin_message', $3, '/offers', false, NOW());
          `,
          [
            adm.id,
            userProfile.id,
            `New ${roleType} offer submitted by ${userProfile.full_name || userProfile.handle}: "${offerTitle.trim()}" awaiting review.`,
          ]
        );
      }
    } catch (err) {
      console.error("Admin offer notification error:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Offer submitted successfully and sent to admin for approval.",
      data: formatOffer(offer),
    });
  } catch (error) {
    console.error("createOffer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create offer.",
      error: error.message,
    });
  }
};

// PUT /api/offers/:offerId/approve (Admin Only)
export const approveOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const adminId = req.user?._id || null;

    const findRes = await query(`SELECT * FROM offers WHERE id::text = $1;`, [offerId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    const offer = findRes.rows[0];

    if (offer.status === "active") {
      return res.status(200).json({
        success: true,
        message: "Offer is already active.",
        data: formatOffer(offer),
      });
    }

    const now = Date.now();
    const expiresAt = new Date(now + Number(offer.validity_hours) * 60 * 60 * 1000);

    const updRes = await query(
      `
      UPDATE offers SET
        status = 'active',
        approved_by = $1,
        approved_at = NOW(),
        expires_at = $2,
        rejection_reason = '',
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
      `,
      [adminId || null, expiresAt, offer.id]
    );

    const updatedOffer = updRes.rows[0];

    const isCreatorOffer = offer.creator_or_brand_type === "creator";
    const senderId = isCreatorOffer ? offer.creator_id : offer.brand_id;
    const targetRole = isCreatorOffer ? "brand" : "creator";
    const targetUrl = isCreatorOffer ? "/dashboard/customer" : "/dashboard/influencer";

    let senderName = isCreatorOffer ? "A creator" : "A brand";
    if (senderId) {
      const sProf = await query(`SELECT full_name, handle FROM profiles WHERE id = $1;`, [senderId]);
      if (sProf.rows.length > 0) {
        senderName = sProf.rows[0].full_name || sProf.rows[0].handle || senderName;
      }

      // Notify owner
      await query(
        `
        INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
        VALUES ($1, $2, 'admin_message', $3, $4, false, NOW());
        `,
        [senderId, adminId || senderId, `Your offer "${offer.offer_title}" has been approved by admin and is now live!`, targetUrl]
      ).catch((err) => console.error("Owner notification error:", err.message));

      sendPushToUser(senderId, {
        title: "Offer Approved & Live! 🎉",
        body: `Your offer "${offer.offer_title}" is now visible to all ${targetRole}s.`,
        url: targetUrl,
      }).catch((err) => console.error("Owner push error:", err.message));
    }

    // Broadcast to target audience
    const audienceRes = await query(
      `SELECT id FROM profiles WHERE role = $1 AND is_deleted = false;`,
      [targetRole]
    );

    if (audienceRes.rows.length > 0 && senderId) {
      const recipientIds = audienceRes.rows.map((p) => p.id);
      const notifText = `${senderName} launched an exclusive offer: ${offer.offer_title} — "${offer.condition_text}"`;

      for (const rId of recipientIds) {
        await query(
          `
          INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
          VALUES ($1, $2, 'new_offer', $3, $4, false, NOW());
          `,
          [rId, senderId, notifText, targetUrl]
        ).catch((err) => console.error("Audience notification error:", err.message));
      }

      sendPushToUsers(recipientIds, {
        title: isCreatorOffer ? `New Creator Deal! 🔥 ${offer.offer_title}` : `New Brand Opportunity! 💼 ${offer.offer_title}`,
        body: `${senderName}: ${offer.condition_text}`,
        url: targetUrl,
      }).catch((err) => console.error("Audience push error:", err.message));
    }

    return res.status(200).json({
      success: true,
      message: `Offer approved and broadcasted to ${audienceRes.rows.length} ${targetRole}s.`,
      data: formatOffer(updatedOffer),
    });
  } catch (error) {
    console.error("approveOffer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve offer.",
      error: error.message,
    });
  }
};

// PUT /api/offers/:offerId/reject (Admin Only)
export const rejectOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { reason = "Does not meet guidelines." } = req.body;
    const adminId = req.user?._id || null;

    const findRes = await query(`SELECT * FROM offers WHERE id::text = $1;`, [offerId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    const offer = findRes.rows[0];

    const updRes = await query(
      `UPDATE offers SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [reason, offer.id]
    );

    const ownerId = offer.creator_id || offer.brand_id;
    if (ownerId) {
      const targetUrl = offer.creator_or_brand_type === "creator" ? "/dashboard/influencer" : "/dashboard/customer";
      await query(
        `
        INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
        VALUES ($1, $2, 'admin_message', $3, $4, false, NOW());
        `,
        [ownerId, adminId || ownerId, `Your offer "${offer.offer_title}" was rejected by admin. Reason: ${reason}`, targetUrl]
      ).catch((err) => console.error("Reject notification error:", err.message));
    }

    return res.status(200).json({
      success: true,
      message: "Offer rejected successfully.",
      data: formatOffer(updRes.rows[0]),
    });
  } catch (error) {
    console.error("rejectOffer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject offer.",
      error: error.message,
    });
  }
};

// GET /api/offers/active
export const getActiveOffers = async (req, res) => {
  try {
    const { audience } = req.query;

    let roleFilter = "";
    if (audience === "brand") {
      roleFilter = "AND o.creator_or_brand_type = 'creator'";
    } else if (audience === "creator") {
      roleFilter = "AND o.creator_or_brand_type = 'brand'";
    }

    const { rows } = await query(
      `
      SELECT
        o.*,
        row_to_json(cr.*) as creator,
        row_to_json(br.*) as brand
      FROM offers o
      LEFT JOIN profiles cr ON cr.id = o.creator_id
      LEFT JOIN profiles br ON br.id = o.brand_id
      WHERE o.status = 'active' AND o.expires_at > NOW() ${roleFilter}
      ORDER BY o.approved_at DESC, o.created_at DESC;
      `
    );

    const formatted = rows.map((r) => ({
      ...formatOffer(r),
      creatorId: formatProfile(r.creator),
      brandId: formatProfile(r.brand),
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("getActiveOffers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active offers.",
      error: error.message,
    });
  }
};

// GET /api/offers/mine/:profileId
export const getMyOffers = async (req, res) => {
  try {
    const profileId = req.params.profileId || req.user?._id;
    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    const resolved = await resolveProfile(profileId);
    if (!resolved) {
      return res.status(200).json({ success: true, data: [] });
    }

    const { rows } = await query(
      `
      SELECT * FROM offers
      WHERE creator_id = $1 OR brand_id = $1
      ORDER BY created_at DESC;
      `,
      [resolved.id]
    );

    return res.status(200).json({
      success: true,
      data: rows.map(formatOffer),
    });
  } catch (error) {
    console.error("getMyOffers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch offers.",
      error: error.message,
    });
  }
};

// GET /api/offers/admin/all (Admin Only)
export const getAllOffersAdmin = async (req, res) => {
  try {
    const { rows } = await query(
      `
      SELECT
        o.*,
        row_to_json(cr.*) as creator,
        row_to_json(br.*) as brand,
        row_to_json(app.*) as approved_by_user,
        row_to_json(del.*) as deleted_by_user
      FROM offers o
      LEFT JOIN profiles cr ON cr.id = o.creator_id
      LEFT JOIN profiles br ON br.id = o.brand_id
      LEFT JOIN profiles app ON app.id = o.approved_by
      LEFT JOIN profiles del ON del.id = o.deleted_by
      ORDER BY o.created_at DESC;
      `
    );

    const formatted = rows.map((r) => ({
      ...formatOffer(r),
      creatorId: formatProfile(r.creator),
      brandId: formatProfile(r.brand),
      approvedBy: formatProfile(r.approved_by_user),
      deletedBy: formatProfile(r.deleted_by_user),
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("getAllOffersAdmin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all offers.",
      error: error.message,
    });
  }
};

// DELETE /api/offers/:offerId (Admin Only)
export const deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const adminId = req.user?._id || null;

    const findRes = await query(`SELECT * FROM offers WHERE id::text = $1;`, [offerId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    const offer = findRes.rows[0];

    const updRes = await query(
      `
      UPDATE offers SET
        status = 'deleted',
        deleted_by = $1,
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
      `,
      [adminId || null, offer.id]
    );

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully.",
      data: formatOffer(updRes.rows[0]),
    });
  } catch (error) {
    console.error("deleteOffer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete offer.",
      error: error.message,
    });
  }
};
