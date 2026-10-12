import { query } from "../config/postgres.js";

const resolveProfileId = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT id FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [idOrUserId]
  );
  return res.rows[0]?.id || null;
};

const formatPortfolioImage = (img) => {
  if (!img) return null;
  return {
    _id: img.id,
    id: img.id,
    profileId: img.profile_id,
    imageStorageId: img.image_storage_id,
    sortOrder: Number(img.sort_order || 0),
    createdAt: img.created_at,
    updatedAt: img.updated_at,
  };
};

export const listPortfolioImages = async (req, res) => {
  try {
    const { profileId } = req.query;
    let text = `SELECT * FROM portfolio_images ORDER BY sort_order ASC;`;
    let params = [];

    if (profileId) {
      const resolvedId = await resolveProfileId(profileId);
      if (resolvedId) {
        text = `SELECT * FROM portfolio_images WHERE profile_id = $1 ORDER BY sort_order ASC;`;
        params = [resolvedId];
      } else {
        return res.status(200).json({ success: true, data: [] });
      }
    }

    const { rows } = await query(text, params);

    res.status(200).json({
      success: true,
      data: rows.map(formatPortfolioImage),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch portfolio images.",
    });
  }
};

export const createPortfolioImage = async (req, res) => {
  try {
    const { profileId, imageStorageId, sortOrder } = req.body;

    if (!profileId || !imageStorageId || sortOrder === undefined) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing.",
      });
    }

    const resolvedId = await resolveProfileId(profileId);
    if (!resolvedId) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID.",
      });
    }

    const { rows } = await query(
      `
      INSERT INTO portfolio_images (profile_id, image_storage_id, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *;
      `,
      [resolvedId, imageStorageId, Number(sortOrder || 0)]
    );

    res.status(201).json({
      success: true,
      data: formatPortfolioImage(rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create portfolio image.",
    });
  }
};

export const updatePortfolioImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageStorageId, sortOrder } = req.body;

    const { rows } = await query(
      `
      UPDATE portfolio_images SET
        image_storage_id = COALESCE($1, image_storage_id),
        sort_order = COALESCE($2, sort_order),
        updated_at = NOW()
      WHERE id::text = $3
      RETURNING *;
      `,
      [imageStorageId || null, sortOrder !== undefined ? Number(sortOrder) : null, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Portfolio image not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: formatPortfolioImage(rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update portfolio image.",
    });
  }
};

export const deletePortfolioImage = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `DELETE FROM portfolio_images WHERE id::text = $1 RETURNING *;`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Portfolio image not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Portfolio image deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete portfolio image.",
    });
  }
};

export const reorderPortfolioImages = async (req, res) => {
  try {
    const { images } = req.body;

    if (!Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: "Images array is required.",
      });
    }

    for (const img of images) {
      await query(
        `UPDATE portfolio_images SET sort_order = $1, updated_at = NOW() WHERE id::text = $2`,
        [Number(img.sortOrder || 0), img.id || img._id]
      );
    }

    res.status(200).json({
      success: true,
      message: "Portfolio images reordered successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reorder portfolio images.",
    });
  }
};