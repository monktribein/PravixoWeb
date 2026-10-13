import { query } from "../config/postgres.js";
import { formatPricingTier } from "../utils/formatters.js";

// Helper to check valid UUID format
const isUuid = (str) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

// ==========================================
// GET PRICING BY PROFILE
// ==========================================
export const getByProfile = async (req, res) => {
  try {
    const { profileId } = req.params;

    if (!profileId || profileId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
        data: [],
      });
    }

    const result = await query(
      `SELECT * FROM pricing_tiers
       WHERE profile_id::text = $1
       ORDER BY sort_order ASC`,
      [profileId.trim()]
    );

    const pricing = result.rows.map(formatPricingTier);

    // Deduplicate repetitive tiers by normalized name (case-insensitive)
    const seen = new Set();
    const uniquePricing = [];
    for (const tier of pricing) {
      const key = (tier.name || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        uniquePricing.push(tier);
      }
    }

    return res.status(200).json({
      success: true,
      data: uniquePricing,
    });
  } catch (error) {
    console.error("Get pricing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pricing.",
      data: [],
    });
  }
};

// ==========================================
// CREATE / UPDATE PRICING
// ==========================================
export const upsertMany = async (req, res) => {
  try {
    const { profileId, tiers } = req.body;

    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: "profileId is required.",
      });
    }

    if (!Array.isArray(tiers)) {
      return res.status(400).json({
        success: false,
        message: "tiers must be an array.",
      });
    }

    // Verify profile exists in Supabase
    const profileRes = await query(
      "SELECT id FROM profiles WHERE id::text = $1",
      [profileId.trim()]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    const targetProfileId = profileRes.rows[0].id;

    // Deduplicate incoming tiers by normalized name
    const seenNames = new Set();
    const cleanTiers = [];
    for (const t of tiers) {
      const key = String(t?.name || "").trim().toLowerCase();
      if (key && !seenNames.has(key)) {
        seenNames.add(key);
        cleanTiers.push(t);
      }
    }

    // Filter incoming IDs that are valid UUIDs
    const incomingIds = cleanTiers
      .map((t) => t?.id || t?._id)
      .filter((id) => id && isUuid(id));

    // Delete existing tiers for this profile that are NOT in the incoming array
    if (incomingIds.length > 0) {
      await query(
        `DELETE FROM pricing_tiers
         WHERE profile_id = $1 AND id NOT IN (${incomingIds.map((_, i) => `$${i + 2}`).join(", ")})`,
        [targetProfileId, ...incomingIds]
      );
    } else {
      await query("DELETE FROM pricing_tiers WHERE profile_id = $1", [targetProfileId]);
    }

    // Update existing or create new tiers
    for (let index = 0; index < cleanTiers.length; index++) {
      const tier = cleanTiers[index];
      const tierId = tier?.id || tier?._id;
      const name = String(tier?.name || `Tier ${index + 1}`).trim();
      const price = Number(tier?.price) || 0;
      const sortOrder = tier?.sortOrder !== undefined ? Number(tier.sortOrder) : index;

      if (tierId && isUuid(tierId)) {
        await query(
          `UPDATE pricing_tiers
           SET name = $1, price = $2, sort_order = $3, updated_at = NOW()
           WHERE id = $4 AND profile_id = $5`,
          [name, price, sortOrder, tierId, targetProfileId]
        );
      } else {
        await query(
          `INSERT INTO pricing_tiers (profile_id, name, price, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [targetProfileId, name, price, sortOrder]
        );
      }
    }

    // Recalculate Starting Price
    const allTiersRes = await query(
      `SELECT * FROM pricing_tiers
       WHERE profile_id = $1
       ORDER BY sort_order ASC`,
      [targetProfileId]
    );

    const validPrices = allTiersRes.rows
      .map((t) => Number(t.price))
      .filter((p) => p > 0);

    const startingPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

    await query(
      `UPDATE profiles
       SET starting_price = $1, updated_at = NOW()
       WHERE id = $2`,
      [startingPrice, targetProfileId]
    );

    return res.status(200).json({
      success: true,
      message: "Pricing tiers updated successfully.",
      data: allTiersRes.rows.map(formatPricingTier),
    });
  } catch (error) {
    console.error("Upsert pricing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update pricing tiers.",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE PRICING TIER
// ==========================================
export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Pricing tier ID is required.",
      });
    }

    const tierRes = await query(
      "SELECT id, profile_id FROM pricing_tiers WHERE id::text = $1",
      [id.trim()]
    );

    if (tierRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pricing tier not found.",
      });
    }

    const profileId = tierRes.rows[0].profile_id;

    await query("DELETE FROM pricing_tiers WHERE id::text = $1", [id.trim()]);

    // Recalculate Starting Price
    const remainingRes = await query(
      "SELECT price FROM pricing_tiers WHERE profile_id = $1",
      [profileId]
    );

    const validPrices = remainingRes.rows
      .map((t) => Number(t.price))
      .filter((p) => p > 0);

    const startingPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

    await query(
      "UPDATE profiles SET starting_price = $1, updated_at = NOW() WHERE id = $2",
      [startingPrice, profileId]
    );

    return res.status(200).json({
      success: true,
      message: "Pricing tier removed successfully.",
    });
  } catch (error) {
    console.error("Remove pricing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove pricing tier.",
      error: error.message,
    });
  }
};