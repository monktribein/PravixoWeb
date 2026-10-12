import { query } from "../config/postgres.js";
import { formatVideoReview } from "../utils/formatters.js";

const resolveProfileId = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT id, role, full_name, user_id, avatar_url FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [idOrUserId]
  );
  return res.rows[0] || null;
};

// =====================================
// CHECK IF USER CAN POST REVIEW (MUST BE COLLABORATED)
// =====================================
export const checkReviewEligibility = async (req, res) => {
  try {
    const { reviewerId } = req.query;

    if (!reviewerId) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: "Please log in with an active account to post a review.",
        collaborations: [],
      });
    }

    const reviewer = await resolveProfileId(reviewerId);
    if (!reviewer) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: "Profile not found.",
        collaborations: [],
      });
    }

    if (reviewer.role === "brand" && (reviewer.full_name === "Admin" || reviewer.user_id === "admin")) {
      return res.status(200).json({
        success: true,
        canReview: true,
        isAdmin: true,
        collaborations: [],
      });
    }

    // Find all accepted/active collaborations for this reviewer
    const connRes = await query(
      `
      SELECT
        c.*,
        row_to_json(b.*) as brand,
        row_to_json(cr.*) as creator,
        row_to_json(camp.*) as campaign
      FROM connections c
      LEFT JOIN profiles b ON b.id = c.brand_id
      LEFT JOIN profiles cr ON cr.id = c.creator_id
      LEFT JOIN campaigns camp ON camp.id = c.campaign_id
      WHERE (c.brand_id = $1 OR c.creator_id = $1)
        AND (c.status = 'accepted' OR c.collaboration_status = 'AMOUNT_AGREED' OR c.payment_status IN ('PAID', 'PAYMENT_INITIATED', 'ESCROW_PAID', 'RELEASED'));
      `,
      [reviewer.id]
    );

    if (connRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: "Only brands and creators who have collaborated together on Pravixo can post reviews.",
        collaborations: [],
      });
    }

    const collabs = connRes.rows.map((c) => {
      const isReviewerBrand = String(c.brand_id) === String(reviewer.id);
      const partner = isReviewerBrand ? c.creator : c.brand;
      return {
        connectionId: c.id,
        partnerId: partner?.id,
        partnerName: partner?.full_name || partner?.handle || "Collab Partner",
        partnerAvatar: partner?.avatar_url,
        campaignTitle: c.campaign?.title || "Direct Collaboration",
        targetRole: isReviewerBrand ? "creator" : "brand",
      };
    });

    return res.status(200).json({
      success: true,
      canReview: true,
      role: reviewer.role,
      reviewerName: reviewer.full_name,
      reviewerAvatar: reviewer.avatar_url,
      collaborations: collabs,
    });
  } catch (error) {
    console.error("Check review eligibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify review eligibility.",
    });
  }
};

// =====================================
// GET ALL VIDEO/TEXT REVIEWS
// =====================================
export const getVideoReviews = async (req, res) => {
  try {
    const { reviewType } = req.query;
    let text = `
      SELECT
        vr.*,
        row_to_json(t.*) as target,
        row_to_json(r.*) as reviewer
      FROM video_reviews vr
      LEFT JOIN profiles t ON t.id = vr.target_id
      LEFT JOIN profiles r ON r.id = vr.reviewer_id
      ORDER BY vr.created_at DESC;
    `;
    let params = [];

    if (reviewType) {
      text = `
        SELECT
          vr.*,
          row_to_json(t.*) as target,
          row_to_json(r.*) as reviewer
        FROM video_reviews vr
        LEFT JOIN profiles t ON t.id = vr.target_id
        LEFT JOIN profiles r ON r.id = vr.reviewer_id
        WHERE vr.review_type = $1
        ORDER BY vr.created_at DESC;
      `;
      params = [reviewType];
    }

    const { rows } = await query(text, params);

    const enhanced = rows.map((rev) => {
      const target = rev.target;
      const targetName = rev.target_name || target?.full_name || "";
      const targetAvatar = rev.target_avatar || target?.avatar_url || "";
      const reviewer = rev.reviewer;
      const reviewerAvatar = rev.reviewer_avatar || reviewer?.avatar_url || "";

      return {
        ...formatVideoReview(rev),
        targetName,
        targetAvatar,
        reviewerAvatar,
      };
    });

    return res.status(200).json({
      success: true,
      data: enhanced,
    });
  } catch (error) {
    console.error("Get video reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
};

// =====================================
// GET VIDEO REVIEW BY ID
// =====================================
export const getVideoReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(`SELECT * FROM video_reviews WHERE id::text = $1;`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatVideoReview(rows[0]),
    });
  } catch (error) {
    console.error("Get review by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch review.",
    });
  }
};

const getFileUrl = (file) => {
  if (!file) return null;
  if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

// =====================================
// CREATE VIDEO / TEXT REVIEW
// =====================================
export const createVideoReview = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (req.files?.video?.[0]) {
      payload.videoUrl = getFileUrl(req.files.video[0]);
    }
    if (req.files?.thumbnail?.[0]) {
      payload.thumbnailUrl = getFileUrl(req.files.thumbnail[0]);
    }

    if (!payload.reviewType) {
      payload.reviewType = payload.videoUrl ? "video" : "text";
    }

    if (payload.reviewType === "video" && !payload.videoUrl) {
      return res.status(400).json({
        success: false,
        message: "A video file or video link is required for video reviews.",
      });
    }

    if (!payload.reviewerName || !payload.reviewText) {
      return res.status(400).json({
        success: false,
        message: "Reviewer name and review text are required.",
      });
    }

    const { rows } = await query(
      `
      INSERT INTO video_reviews (
        thumbnail_url, video_url, reviewer_name, reviewer_avatar, reviewer_id,
        target_id, target_name, target_avatar, campaign_name, review_type,
        review_text, rating, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, NOW(), NOW()
      )
      RETURNING *;
      `,
      [
        payload.thumbnailUrl || "",
        payload.videoUrl || "",
        payload.reviewerName,
        payload.reviewerAvatar || "",
        payload.reviewerId || null,
        payload.targetId || null,
        payload.targetName || "",
        payload.targetAvatar || "",
        payload.campaignName || "",
        payload.reviewType || "video",
        payload.reviewText,
        Number(payload.rating || 5),
      ]
    );

    return res.status(201).json({
      success: true,
      data: formatVideoReview(rows[0]),
    });
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create review.",
    });
  }
};

// =====================================
// UPDATE VIDEO REVIEW
// =====================================
export const updateVideoReview = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (req.files?.video?.[0]) {
      updateData.videoUrl = getFileUrl(req.files.video[0]);
    }
    if (req.files?.thumbnail?.[0]) {
      updateData.thumbnailUrl = getFileUrl(req.files.thumbnail[0]);
    }

    const { rows } = await query(
      `
      UPDATE video_reviews SET
        thumbnail_url = COALESCE($1, thumbnail_url),
        video_url = COALESCE($2, video_url),
        reviewer_name = COALESCE($3, reviewer_name),
        review_text = COALESCE($4, review_text),
        rating = COALESCE($5, rating),
        updated_at = NOW()
      WHERE id::text = $6
      RETURNING *;
      `,
      [
        updateData.thumbnailUrl || null,
        updateData.videoUrl || null,
        updateData.reviewerName || null,
        updateData.reviewText || null,
        updateData.rating !== undefined ? Number(updateData.rating) : null,
        id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Video review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatVideoReview(rows[0]),
    });
  } catch (error) {
    console.error("Update video review error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update video review.",
    });
  }
};

// =====================================
// DELETE VIDEO REVIEW
// =====================================
export const deleteVideoReview = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(`DELETE FROM video_reviews WHERE id::text = $1 RETURNING *;`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Video review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Video review deleted successfully.",
    });
  } catch (error) {
    console.error("Delete video review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete video review.",
    });
  }
};