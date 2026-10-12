import { query } from "../config/postgres.js";
import { formatProfile } from "../utils/formatters.js";

// Helper to check valid UUID
const isUuid = (str) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

export const listFavorites = async (req, res) => {
  try {
    const { brandId } = req.query;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: "brandId is required.",
      });
    }

    const favsRes = await query(
      `SELECT f.*, p.full_name, p.avatar_url, p.category, p.instagram_followers, p.youtube_followers, p.gender, p.role
       FROM favorites f
       LEFT JOIN profiles p ON p.id::text = f.creator_id OR p.user_id = f.creator_id
       WHERE f.brand_id::text = $1`,
      [brandId.trim()]
    );

    const populatedFavorites = favsRes.rows.map((row) => {
      const isLive = Boolean(row.full_name);
      const totalFollowers =
        Number(row.instagram_followers || 0) + Number(row.youtube_followers || 0);

      return {
        id: row.creator_id,
        isLive,
        name: row.full_name || `Creator ${String(row.creator_id).slice(0, 4)}`,
        avatar: row.avatar_url || null,
        avatarUrl: row.avatar_url || null,
        category: row.category || "Creator",
        followers: totalFollowers > 0 ? `${totalFollowers}` : "10k+",
        gender: row.gender || "",
        role: row.role || "creator",
      };
    });

    return res.status(200).json({
      success: true,
      data: populatedFavorites,
    });
  } catch (error) {
    console.error("List favorites error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch favorites.",
    });
  }
};

export const addFavorite = async (req, res) => {
  try {
    const { brandId, creatorId } = req.body;

    if (!brandId || !creatorId) {
      return res.status(400).json({
        success: false,
        message: "brandId and creatorId are required.",
      });
    }

    // Check if brand exists in profiles
    const brandCheck = await query(
      "SELECT id FROM profiles WHERE id::text = $1 OR user_id = $1",
      [brandId.trim()]
    );
    const validBrandId = brandCheck.rows[0]?.id || (isUuid(brandId) ? brandId.trim() : null);

    if (!validBrandId) {
      return res.status(404).json({
        success: false,
        message: "Brand profile not found.",
      });
    }

    const existingRes = await query(
      "SELECT id FROM favorites WHERE brand_id = $1 AND creator_id = $2",
      [validBrandId, creatorId.trim()]
    );

    if (existingRes.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Creator is already in favorites.",
      });
    }

    const insertRes = await query(
      "INSERT INTO favorites (brand_id, creator_id) VALUES ($1, $2) RETURNING *",
      [validBrandId, creatorId.trim()]
    );

    return res.status(201).json({
      success: true,
      data: {
        _id: insertRes.rows[0].id,
        id: insertRes.rows[0].id,
        brandId: insertRes.rows[0].brand_id,
        creatorId: insertRes.rows[0].creator_id,
        createdAt: insertRes.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add favorite.",
    });
  }
};

export const removeFavorite = async (req, res) => {
  try {
    const { brandId, creatorId } = req.body;

    if (!brandId || !creatorId) {
      return res.status(400).json({
        success: false,
        message: "brandId and creatorId are required.",
      });
    }

    const deleteRes = await query(
      `DELETE FROM favorites
       WHERE (brand_id::text = $1 OR brand_id IN (SELECT id FROM profiles WHERE user_id = $1))
         AND creator_id = $2
       RETURNING id`,
      [brandId.trim(), creatorId.trim()]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Favorite not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Favorite removed successfully.",
    });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove favorite.",
    });
  }
};

export const checkFavorite = async (req, res) => {
  try {
    const { brandId, creatorId } = req.query;

    if (!brandId || !creatorId) {
      return res.status(400).json({
        success: false,
        message: "brandId and creatorId are required.",
      });
    }

    const checkRes = await query(
      `SELECT id FROM favorites
       WHERE (brand_id::text = $1 OR brand_id IN (SELECT id FROM profiles WHERE user_id = $1))
         AND creator_id = $2`,
      [brandId.trim(), creatorId.trim()]
    );

    return res.status(200).json({
      success: true,
      data: {
        isFavorite: checkRes.rows.length > 0,
      },
    });
  } catch (error) {
    console.error("Check favorite error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check favorite.",
    });
  }
};