import { query } from "../config/postgres.js";
import { formatOfferAnalytics } from "../utils/formatters.js";

export const getOfferAnalytics = async (req, res) => {
  try {
    const { offerId } = req.params;

    let { rows } = await query(
      `SELECT * FROM offer_analytics WHERE offer_id::text = $1 LIMIT 1;`,
      [offerId]
    );

    if (rows.length === 0) {
      const insRes = await query(
        `
        INSERT INTO offer_analytics (offer_id, views, clicks, upgrades, revenue, created_at, updated_at)
        VALUES ($1, 0, 0, 0, 0, NOW(), NOW())
        RETURNING *;
        `,
        [offerId]
      );
      rows = insRes.rows;
    }

    res.status(200).json({
      success: true,
      data: formatOfferAnalytics(rows[0]),
    });
  } catch (error) {
    console.error("Get offer analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch offer analytics.",
    });
  }
};

export const updateOfferAnalytics = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { views, clicks, upgrades, revenue } = req.body;

    const upsertRes = await query(
      `
      INSERT INTO offer_analytics (offer_id, views, clicks, upgrades, revenue, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (offer_id) DO UPDATE SET
        views = offer_analytics.views + EXCLUDED.views,
        clicks = offer_analytics.clicks + EXCLUDED.clicks,
        upgrades = offer_analytics.upgrades + EXCLUDED.upgrades,
        revenue = offer_analytics.revenue + EXCLUDED.revenue,
        updated_at = NOW()
      RETURNING *;
      `,
      [offerId, views || 0, clicks || 0, upgrades || 0, revenue || 0]
    );

    res.status(200).json({
      success: true,
      data: formatOfferAnalytics(upsertRes.rows[0]),
    });
  } catch (error) {
    // If table doesn't have unique constraint on offer_id, fallback to select then update/insert
    try {
      const findRes = await query(`SELECT id FROM offer_analytics WHERE offer_id::text = $1 LIMIT 1;`, [offerId]);
      let savedRow;
      if (findRes.rows.length === 0) {
        const ins = await query(
          `INSERT INTO offer_analytics (offer_id, views, clicks, upgrades, revenue, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *;`,
          [offerId, views || 0, clicks || 0, upgrades || 0, revenue || 0]
        );
        savedRow = ins.rows[0];
      } else {
        const upd = await query(
          `UPDATE offer_analytics SET
            views = views + $1,
            clicks = clicks + $2,
            upgrades = upgrades + $3,
            revenue = revenue + $4,
            updated_at = NOW()
           WHERE id = $5 RETURNING *;`,
          [views || 0, clicks || 0, upgrades || 0, revenue || 0, findRes.rows[0].id]
        );
        savedRow = upd.rows[0];
      }
      return res.status(200).json({
        success: true,
        data: formatOfferAnalytics(savedRow),
      });
    } catch (fallbackErr) {
      console.error("Update offer analytics error:", fallbackErr);
      return res.status(500).json({
        success: false,
        message: "Failed to update offer analytics.",
      });
    }
  }
};