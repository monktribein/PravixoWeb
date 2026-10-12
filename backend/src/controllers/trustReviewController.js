import { query } from "../config/postgres.js";
import { formatTrustReview } from "../utils/formatters.js";

export const getTrustReviews = async (req, res) => {
  try {
    const { source } = req.query;
    let text = `SELECT * FROM trust_reviews ORDER BY created_at DESC;`;
    let params = [];

    if (source) {
      text = `SELECT * FROM trust_reviews WHERE source = $1 ORDER BY created_at DESC;`;
      params = [source];
    }

    const { rows } = await query(text, params);

    res.status(200).json({
      success: true,
      data: rows.map(formatTrustReview),
    });
  } catch (error) {
    console.error("Get trust reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trust reviews.",
    });
  }
};

export const createTrustReview = async (req, res) => {
  try {
    const { source, reviewerName, reviewText, rating } = req.body;

    const { rows } = await query(
      `
      INSERT INTO trust_reviews (source, reviewer_name, review_text, rating, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
      `,
      [source, reviewerName, reviewText, Number(rating || 5)]
    );

    res.status(201).json({
      success: true,
      data: formatTrustReview(rows[0]),
    });
  } catch (error) {
    console.error("Create trust review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create trust review.",
    });
  }
};

export const updateTrustReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { source, reviewerName, reviewText, rating } = req.body;

    const { rows } = await query(
      `
      UPDATE trust_reviews SET
        source = COALESCE($1, source),
        reviewer_name = COALESCE($2, reviewer_name),
        review_text = COALESCE($3, review_text),
        rating = COALESCE($4, rating)
      WHERE id::text = $5
      RETURNING *;
      `,
      [
        source || null,
        reviewerName || null,
        reviewText || null,
        rating !== undefined ? Number(rating) : null,
        reviewId,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trust review not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: formatTrustReview(rows[0]),
    });
  } catch (error) {
    console.error("Update trust review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update trust review.",
    });
  }
};

export const deleteTrustReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const { rows } = await query(
      `DELETE FROM trust_reviews WHERE id::text = $1 RETURNING *;`,
      [reviewId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trust review not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Trust review deleted successfully.",
    });
  } catch (error) {
    console.error("Delete trust review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete trust review.",
    });
  }
};