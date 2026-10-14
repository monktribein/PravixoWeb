import { query } from "../config/postgres.js";
import { formatReview, formatProfile } from "../utils/formatters.js";

// Helper: Find Profile
const findProfile = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [String(idOrUserId)]
  );
  return res.rows[0] ? formatProfile(res.rows[0]) : null;
};

// 1. Check whether brand or creator can review the other party
export const canReview = async (req, res) => {
  try {
    const { targetId } = req.params;
    const { reviewerId } = req.query;

    if (!reviewerId || !targetId) {
      return res.status(200).json({
        success: true,
        data: { canReview: false, campaigns: [], reason: "Missing reviewer or target profile" },
      });
    }

    const [reviewer, target] = await Promise.all([findProfile(reviewerId), findProfile(targetId)]);

    if (!reviewer || !target) {
      return res.status(200).json({
        success: true,
        data: { canReview: false, campaigns: [], reason: "Profile not found" },
      });
    }

    if (String(reviewer.id) === String(target.id)) {
      return res.status(200).json({
        success: true,
        data: { canReview: false, campaigns: [], reason: "Cannot review own profile" },
      });
    }

    // Find accepted/active collaborations between reviewer and target
    const connRes = await query(
      `SELECT c.*, camp.title as campaign_title
       FROM connections c
       LEFT JOIN campaigns camp ON c.campaign_id = camp.id
       WHERE (
         (c.brand_id = $1 AND c.creator_id = $2) OR
         (c.brand_id = $2 AND c.creator_id = $1)
       ) AND (
         c.status = 'accepted' OR
         c.collaboration_status = 'AMOUNT_AGREED' OR
         c.payment_status IN ('PAID', 'PAYMENT_INITIATED')
       )`,
      [reviewer.id, target.id]
    );

    if (connRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          canReview: false,
          campaigns: [],
          reason: "You can only review brands or creators you have collaborated with.",
        },
      });
    }

    const campaignsMap = new Map();
    for (const conn of connRes.rows) {
      if (conn.campaign_id && conn.campaign_title) {
        campaignsMap.set(String(conn.campaign_id), {
          id: conn.campaign_id,
          title: conn.campaign_title,
        });
      }
    }

    const campaigns = Array.from(campaignsMap.values());
    if (campaigns.length === 0) {
      campaigns.push({ id: "collab_direct", title: "Direct Collaboration" });
    }

    // Check if reviewer has already reviewed this target
    const existingRes = await query(
      `SELECT id FROM reviews WHERE reviewer_id = $1 AND target_id = $2 LIMIT 1`,
      [reviewer.id, target.id]
    );

    if (existingRes.rows.length > 0) {
      return res.status(200).json({
        success: true,
        data: {
          canReview: false,
          alreadyReviewed: true,
          campaigns,
          reason: "You have already reviewed this profile.",
        },
      });
    }

    const convRes = await query(
      `SELECT id FROM conversations 
       WHERE (creator_id = $1 AND brand_id = $2) OR (creator_id = $2 AND brand_id = $1)
       LIMIT 1`,
      [reviewer.id, target.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        canReview: true,
        campaigns,
        conversationId: convRes.rows[0]?.id || undefined,
      },
    });
  } catch (error) {
    console.error("Can review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check review eligibility.",
    });
  }
};

// 2. Submit Review
export const submitReview = async (req, res) => {
  try {
    const {
      targetId,
      reviewerId,
      creatorId,
      brandId,
      conversationId,
      rating,
      title,
      text,
      campaignRef,
    } = req.body;

    const actualReviewerId = reviewerId || (creatorId && brandId ? brandId : null);
    const actualTargetId = targetId || (creatorId && brandId ? creatorId : null);

    if (!actualReviewerId || !actualTargetId || rating === undefined || !title || !text) {
      return res.status(400).json({
        success: false,
        message: "Required review fields are missing.",
      });
    }

    const [reviewer, target] = await Promise.all([
      findProfile(actualReviewerId),
      findProfile(actualTargetId),
    ]);

    if (!reviewer || !target) {
      return res.status(404).json({
        success: false,
        message: "Reviewer or Target profile not found.",
      });
    }

    if (String(reviewer.id) === String(target.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot write a review for your own profile.",
      });
    }

    const collabRes = await query(
      `SELECT id FROM connections
       WHERE (
         (brand_id = $1 AND creator_id = $2) OR
         (brand_id = $2 AND creator_id = $1)
       ) AND (
         status = 'accepted' OR
         collaboration_status = 'AMOUNT_AGREED' OR
         payment_status IN ('PAID', 'PAYMENT_INITIATED')
       ) LIMIT 1`,
      [reviewer.id, target.id]
    );

    if (collabRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Only brands and creators who have collaborated can submit a review.",
      });
    }

    let validConversationId = null;
    if (conversationId) {
      const convCheck = await query(`SELECT id FROM conversations WHERE id::text = $1 LIMIT 1`, [
        String(conversationId),
      ]);
      if (convCheck.rows.length > 0) {
        validConversationId = convCheck.rows[0].id;
      }
    }

    const existingRes = await query(
      `SELECT id FROM reviews WHERE reviewer_id = $1 AND target_id = $2 LIMIT 1`,
      [reviewer.id, target.id]
    );

    if (existingRes.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a review for this profile.",
      });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5 stars.",
      });
    }

    const targetIsCreator = target.role !== "brand";
    const targetCreatorId = targetIsCreator ? target.id : reviewer.id;
    const targetBrandId = targetIsCreator ? reviewer.id : target.id;

    const insRes = await query(
      `INSERT INTO reviews (
        target_id, reviewer_id, reviewer_role, creator_id, brand_id, conversation_id,
        rating, title, text, campaign_ref, status, visible, created_at, created_at_dt, updated_at_dt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', true, $11, NOW(), NOW())
      RETURNING *`,
      [
        target.id,
        reviewer.id,
        reviewer.role || (targetIsCreator ? "brand" : "creator"),
        targetCreatorId,
        targetBrandId,
        validConversationId,
        numRating,
        title.trim(),
        text.trim(),
        campaignRef ? campaignRef.trim() : "",
        Date.now(),
      ]
    );
    const review = formatReview(insRes.rows[0]);

    // Update target's average rating in Profile if needed
    try {
      const avgRes = await query(
        `SELECT AVG(rating)::numeric(3,1) as avg_rating, COUNT(*)::int as count 
         FROM reviews 
         WHERE target_id = $1 AND reviewer_id != $1 AND status != 'rejected' AND visible = true`,
        [target.id]
      );
      const avgRating = Number(avgRes.rows[0]?.avg_rating || 0);
      const count = Number(avgRes.rows[0]?.count || 0);
      await query(
        `UPDATE profiles SET starting_price = COALESCE(starting_price, 0) WHERE id = $1`,
        [target.id]
      );
    } catch (err) {
      console.warn("Profile stats update note:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully!",
      data: review,
    });
  } catch (error) {
    console.error("Submit review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit review.",
    });
  }
};

// 3. List Reviews for Target
export const listReviewsForTarget = async (req, res) => {
  try {
    const targetId = req.params.targetId || req.params.creatorId;
    const includePending = req.query.includePending === "true";

    const profile = await findProfile(targetId);
    const targetUuid = profile?.id || targetId;

    const sql = `
      SELECT r.*,
             row_to_json(p.*) as reviewer
      FROM reviews r
      LEFT JOIN profiles p ON r.reviewer_id = p.id
      WHERE (r.target_id::text = $1 OR r.creator_id::text = $1 OR r.brand_id::text = $1
             OR r.target_id IN (SELECT id FROM profiles WHERE id::text = $1 OR user_id = $1))
        AND r.reviewer_id::text != $1
        AND (r.visible IS TRUE OR r.visible IS NULL)
        ${includePending ? "" : "AND (r.status IN ('approved', 'pending') OR r.status IS NULL)"}
      ORDER BY r.created_at DESC
    `;

    const revRes = await query(sql, [String(targetUuid)]);

    const results = revRes.rows.map((row) => {
      const review = formatReview(row);
      const revProfile = row.reviewer ? formatProfile(row.reviewer) : null;
      const cleanHandle = revProfile?.handle
        ? revProfile.handle.startsWith("@")
          ? revProfile.handle.slice(1)
          : revProfile.handle
        : "";
      const finalName = revProfile?.fullName || revProfile?.handle || "Verified User";
      const finalAvatar = revProfile?.avatarUrl || null;
      const finalRole = review.reviewerRole || revProfile?.role || "brand";
      const finalGender = revProfile?.gender || "male";
      const finalCompany = finalRole === "brand" ? "Brand Partner" : "Verified Creator";

      return {
        ...review,
        reviewerId: revProfile?.id || review.reviewerId,
        reviewerHandle: cleanHandle,
        reviewerName: finalName,
        reviewerAvatar: finalAvatar,
        reviewerRole: finalRole,
        reviewerGender: finalGender,
        reviewerCompany: finalCompany,
        brandName: finalName,
        brandAvatar: finalAvatar,
        brandHandle: cleanHandle,
        reviewer: {
          _id: revProfile?.id || review.reviewerId,
          id: revProfile?.id || review.reviewerId,
          fullName: finalName,
          name: finalName,
          brandName: finalName,
          handle: cleanHandle,
          avatarUrl: finalAvatar,
          gender: finalGender,
          role: finalRole,
          companyName: finalCompany,
        },
      };
    });

    // Also include any reviews from video_reviews table targeting this profile if not already present
    try {
      const targetName = profile?.fullName || "";
      const vSql = `
        SELECT vr.*, row_to_json(p.*) as reviewer
        FROM video_reviews vr
        LEFT JOIN profiles p ON vr.reviewer_id = p.id
        WHERE (vr.target_id::text = $1 ${targetName ? "OR vr.target_name ILIKE $2" : ""})
        ORDER BY vr.created_at DESC
      `;
      const vParams = targetName ? [String(targetUuid), `%${targetName}%`] : [String(targetUuid)];
      const vRes = await query(vSql, vParams);
      const existingReviewerIds = new Set(results.map((r) => String(r.reviewerId || r.reviewer_id)));

      for (const vRow of vRes.rows) {
        if (!existingReviewerIds.has(String(vRow.reviewer_id))) {
          const revProfile = vRow.reviewer ? formatProfile(vRow.reviewer) : null;
          const cleanHandle = revProfile?.handle ? revProfile.handle.replace(/^@/, "") : "";
          const finalName = vRow.reviewer_name || revProfile?.fullName || revProfile?.handle || "Verified Brand";
          const finalAvatar = vRow.reviewer_avatar || revProfile?.avatarUrl || null;

          results.push({
            _id: vRow.id,
            id: vRow.id,
            targetId: vRow.target_id || targetUuid,
            reviewerId: vRow.reviewer_id,
            reviewerHandle: cleanHandle,
            reviewerName: finalName,
            reviewerAvatar: finalAvatar,
            reviewerRole: "brand",
            reviewerGender: revProfile?.gender || "male",
            reviewerCompany: "Brand Partner",
            rating: Number(vRow.rating || 5),
            title: vRow.campaign_name ? `Campaign: ${vRow.campaign_name}` : "Verified Collaboration",
            text: vRow.review_text,
            status: "approved",
            visible: true,
            createdAt: vRow.created_at,
            reviewer: {
              _id: vRow.reviewer_id,
              id: vRow.reviewer_id,
              fullName: finalName,
              name: finalName,
              brandName: finalName,
              handle: cleanHandle,
              avatarUrl: finalAvatar,
              role: "brand",
              companyName: "Brand Partner",
            },
          });
        }
      }
    } catch (e) {
      console.warn("Video reviews merge note in listReviewsForTarget:", e.message);
    }

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("List reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
};

// 4. Average rating calculation
export const getAverageRating = async (req, res) => {
  try {
    const targetId = req.params.targetId || req.params.creatorId;
    const profile = await findProfile(targetId);
    const targetUuid = profile?.id || targetId;

    const countRes = await query(
      `SELECT AVG(rating)::numeric(3,1) as avg_rating, COUNT(*)::int as count 
       FROM reviews 
       WHERE (target_id::text = $1 OR creator_id::text = $1 OR brand_id::text = $1)
         AND reviewer_id::text != $1
         AND status = 'approved'
         AND visible = true`,
      [targetUuid]
    );

    const count = Number(countRes.rows[0]?.count || 0);
    const rating = count > 0 ? Number(countRes.rows[0]?.avg_rating || 5.0) : 5.0;

    return res.status(200).json({
      success: true,
      data: {
        rating,
        reviewsCount: count,
      },
    });
  } catch (error) {
    console.error("Average rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate average rating.",
    });
  }
};

// 5. ADMIN: Get all reviews
export const getAdminReviews = async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT r.*,
             row_to_json(rev.*) as reviewer,
             row_to_json(tgt.*) as target
      FROM reviews r
      LEFT JOIN profiles rev ON r.reviewer_id = rev.id
      LEFT JOIN profiles tgt ON r.target_id = tgt.id
    `;
    const params = [];
    if (status && status !== "all") {
      sql += ` WHERE r.status = $1`;
      params.push(status);
    }
    sql += ` ORDER BY r.created_at DESC`;

    const revRes = await query(sql, params);

    const populated = revRes.rows.map((row) => {
      const rev = formatReview(row);
      const reviewer = row.reviewer ? formatProfile(row.reviewer) : null;
      const target = row.target ? formatProfile(row.target) : null;

      const reviewerGender = reviewer?.gender || "male";
      const targetGender = target?.gender || "female";
      const revName = reviewer?.fullName || "User";
      const revRole = rev.reviewerRole || reviewer?.role || "brand";
      const revAvatar = reviewer?.avatarUrl || null;
      const tgtName = target?.fullName || "Target User";
      const tgtRole = target?.role || (revRole === "brand" ? "creator" : "brand");
      const tgtAvatar = target?.avatarUrl || null;

      return {
        ...rev,
        feedback: rev.text || "",
        content: rev.text || "",
        reviewerName: revName,
        reviewerRole: revRole,
        reviewerAvatar: revAvatar,
        reviewerGender,
        targetName: tgtName,
        targetUserName: tgtName,
        targetRole: tgtRole,
        targetUserRole: tgtRole,
        targetAvatar: tgtAvatar,
        targetUserAvatar: tgtAvatar,
        targetGender,
      };
    });

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    console.error("Admin get reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin reviews.",
    });
  }
};

// 6. ADMIN: Approve review
export const approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const updRes = await query(
      `UPDATE reviews SET status = 'approved', visible = true, updated_at_dt = NOW() WHERE id::text = $1 RETURNING *`,
      [reviewId]
    );

    if (updRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Review approved successfully and is now visible on display!",
      data: formatReview(updRes.rows[0]),
    });
  } catch (error) {
    console.error("Approve review error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve review." });
  }
};

// 7. ADMIN: Reject review
export const rejectReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const updRes = await query(
      `UPDATE reviews SET status = 'rejected', updated_at_dt = NOW() WHERE id::text = $1 RETURNING *`,
      [reviewId]
    );

    if (updRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Review rejected.",
      data: formatReview(updRes.rows[0]),
    });
  } catch (error) {
    console.error("Reject review error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject review." });
  }
};

// 8. Toggle visibility
export const toggleReviewVisibility = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const updRes = await query(
      `UPDATE reviews SET visible = NOT visible, updated_at_dt = NOW() WHERE id::text = $1 RETURNING visible`,
      [reviewId]
    );

    if (updRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    return res.status(200).json({
      success: true,
      data: { visible: updRes.rows[0].visible },
    });
  } catch (error) {
    console.error("Toggle visibility error:", error);
    return res.status(500).json({ success: false, message: "Failed to update visibility." });
  }
};