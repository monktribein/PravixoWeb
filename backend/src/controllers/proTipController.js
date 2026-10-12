import { query } from "../config/postgres.js";
import { formatProTip } from "../utils/formatters.js";

export const getProTips = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM pro_tips ORDER BY created_at DESC;`
    );

    res.status(200).json({
      success: true,
      data: rows.map(formatProTip),
    });
  } catch (error) {
    console.error("Get pro tips error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pro tips.",
    });
  }
};

export const createProTip = async (req, res) => {
  try {
    const { title, content, category, image, iconName, author, isPublished } = req.body;

    const { rows } = await query(
      `
      INSERT INTO pro_tips (title, content, category, image, icon_name, author, is_published, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *;
      `,
      [
        title,
        content,
        category || "",
        image || "",
        iconName || "Lightbulb",
        author || "",
        isPublished !== undefined ? Boolean(isPublished) : true,
      ]
    );

    res.status(201).json({
      success: true,
      data: formatProTip(rows[0]),
    });
  } catch (error) {
    console.error("Create pro tip error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create pro tip.",
    });
  }
};

export const updateProTip = async (req, res) => {
  try {
    const { tipId } = req.params;
    const { title, content, category, image, iconName, author, isPublished } = req.body;

    const { rows } = await query(
      `
      UPDATE pro_tips SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        category = COALESCE($3, category),
        image = COALESCE($4, image),
        icon_name = COALESCE($5, icon_name),
        author = COALESCE($6, author),
        is_published = COALESCE($7, is_published),
        updated_at = NOW()
      WHERE id::text = $8
      RETURNING *;
      `,
      [
        title || null,
        content || null,
        category !== undefined ? category : null,
        image !== undefined ? image : null,
        iconName !== undefined ? iconName : null,
        author !== undefined ? author : null,
        isPublished !== undefined ? Boolean(isPublished) : null,
        tipId,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pro tip not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: formatProTip(rows[0]),
    });
  } catch (error) {
    console.error("Update pro tip error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update pro tip.",
    });
  }
};

export const deleteProTip = async (req, res) => {
  try {
    const { tipId } = req.params;

    const { rows } = await query(
      `DELETE FROM pro_tips WHERE id::text = $1 RETURNING *;`,
      [tipId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pro tip not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Pro tip deleted successfully.",
    });
  } catch (error) {
    console.error("Delete pro tip error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete pro tip.",
    });
  }
};