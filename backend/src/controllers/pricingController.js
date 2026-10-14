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

    if (!profileId || profileId === "undefined" || profileId === "null") {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const cleanId = String(profileId).trim();

    const result = await query(
      `SELECT * FROM pricing_tiers
       WHERE profile_id::text = $1
          OR profile_id IN (SELECT id FROM profiles WHERE id::text = $1 OR user_id = $1)
       ORDER BY sort_order ASC`,
      [cleanId]
    );

    let pricing = result.rows.map(formatPricingTier);

    // If pricing_tiers is empty, fallback to profiles.custom_pricing_packages
    if (pricing.length === 0) {
      const pRes = await query(
        `SELECT custom_pricing_packages, starting_price FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
        [cleanId]
      );
      if (pRes.rows[0]) {
        let pk = pRes.rows[0].custom_pricing_packages;
        if (typeof pk === "string") {
          try { pk = JSON.parse(pk); } catch (e) { pk = []; }
        }
        if (Array.isArray(pk) && pk.length > 0) {
          pricing = pk.map((t, idx) => ({
            _id: t.id || t._id || `pkg-${idx}`,
            id: t.id || t._id || `pkg-${idx}`,
            name: t.name || `Package ${idx + 1}`,
            price: Number(t.price || 0),
            sortOrder: t.sortOrder !== undefined ? Number(t.sortOrder) : idx,
            description: t.description || "",
          }));
        }
      }
    }

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

    const cleanId = String(profileId).trim();

    // Verify profile exists in Supabase (check both id and user_id)
    const profileRes = await query(
      "SELECT id, handle FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1",
      [cleanId]
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
        cleanTiers.push({
          ...t,
          name: t?.name?.trim() || "Package",
          price: Number(t?.price) || 0,
          description: t?.description || "",
        });
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

    // Recalculate Starting Price & update both starting_price AND custom_pricing_packages
    const allTiersRes = await query(
      `SELECT * FROM pricing_tiers
       WHERE profile_id = $1
       ORDER BY sort_order ASC`,
      [targetProfileId]
    );

    const formattedTiers = allTiersRes.rows.map(formatPricingTier);

    const validPrices = formattedTiers
      .map((t) => Number(t.price))
      .filter((p) => p > 0);

    const startingPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

    // Keep custom_pricing_packages and starting_price fully synchronized
    await query(
      `UPDATE profiles
       SET starting_price = $1,
           custom_pricing_packages = $2::jsonb,
           updated_at = NOW()
       WHERE id = $3`,
      [startingPrice, JSON.stringify(formattedTiers), targetProfileId]
    );

    return res.status(200).json({
      success: true,
      message: "Pricing tiers updated successfully.",
      data: formattedTiers,
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