import { query } from "../config/postgres.js";
import { formatPopupSetting, formatSubscriptionOffer } from "../utils/formatters.js";

export const getPopupSettings = async (req, res) => {
  try {
    const { rows } = await query(
      `
      SELECT
        ps.*,
        row_to_json(so.*) as offer
      FROM popup_settings ps
      LEFT JOIN subscription_offers so ON so.id = ps.active_offer_id
      LIMIT 1;
      `
    );

    let data = null;
    if (rows.length > 0) {
      data = {
        ...formatPopupSetting(rows[0]),
        activeOfferId: formatSubscriptionOffer(rows[0].offer),
      };
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get popup settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch popup settings.",
    });
  }
};

export const updatePopupSettings = async (req, res) => {
  try {
    const {
      showPopup,
      popupFrequency,
      targetUsers,
      popupExpiry,
      activeOfferId,
    } = req.body;

    if (
      showPopup === undefined ||
      !popupFrequency ||
      !targetUsers ||
      !popupExpiry
    ) {
      return res.status(400).json({
        success: false,
        message: "Required popup settings are missing.",
      });
    }

    const findRes = await query(`SELECT id FROM popup_settings LIMIT 1;`);
    let settingsRow;

    if (findRes.rows.length === 0) {
      const insRes = await query(
        `
        INSERT INTO popup_settings (
          show_popup, popup_frequency, target_users, popup_expiry, active_offer_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *;
        `,
        [Boolean(showPopup), popupFrequency, targetUsers, Number(popupExpiry), activeOfferId || null]
      );
      settingsRow = insRes.rows[0];
    } else {
      const updRes = await query(
        `
        UPDATE popup_settings SET
          show_popup = $1,
          popup_frequency = $2,
          target_users = $3,
          popup_expiry = $4,
          active_offer_id = $5,
          updated_at = NOW()
        WHERE id = $6
        RETURNING *;
        `,
        [Boolean(showPopup), popupFrequency, targetUsers, Number(popupExpiry), activeOfferId || null, findRes.rows[0].id]
      );
      settingsRow = updRes.rows[0];
    }

    res.status(200).json({
      success: true,
      data: formatPopupSetting(settingsRow),
    });
  } catch (error) {
    console.error("Update popup settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update popup settings.",
    });
  }
};