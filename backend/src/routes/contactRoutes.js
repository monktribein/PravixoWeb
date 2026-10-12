import express from "express";
import { query } from "../config/postgres.js";
import { formatContactInquiry } from "../utils/formatters.js";

const router = express.Router();

// Public: Submit a contact inquiry
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, subject, message) are required.",
      });
    }

    const { rows } = await query(
      `
      INSERT INTO contact_inquiries (name, email, subject, message, status)
      VALUES ($1, $2, $3, $4, 'unread')
      RETURNING *;
      `,
      [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]
    );

    return res.status(201).json({
      success: true,
      message: "Inquiry received successfully! Our team will get back to you shortly.",
      data: formatContactInquiry(rows[0]),
    });
  } catch (error) {
    console.error("Contact inquiry creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while sending inquiry.",
    });
  }
});

// Admin: Get all inquiries
router.get("/admin/all", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM contact_inquiries ORDER BY created_at DESC;`
    );
    return res.json({
      success: true,
      data: rows.map(formatContactInquiry),
    });
  } catch (error) {
    console.error("Fetch inquiries error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact inquiries.",
    });
  }
});

// Admin: Update inquiry status or admin notes
router.patch("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const { rows } = await query(
      `
      UPDATE contact_inquiries SET
        status = COALESCE($1, status),
        admin_notes = COALESCE($2, admin_notes),
        updated_at = NOW()
      WHERE id::text = $3
      RETURNING *;
      `,
      [status || null, adminNotes !== undefined ? adminNotes : null, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found.",
      });
    }

    return res.json({
      success: true,
      message: "Inquiry updated successfully.",
      data: formatContactInquiry(rows[0]),
    });
  } catch (error) {
    console.error("Update inquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update inquiry.",
    });
  }
});

// Admin: Delete an inquiry
router.delete("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `DELETE FROM contact_inquiries WHERE id::text = $1 RETURNING *;`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found.",
      });
    }

    return res.json({
      success: true,
      message: "Inquiry deleted successfully.",
      data: formatContactInquiry(rows[0]),
    });
  } catch (error) {
    console.error("Delete inquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete inquiry.",
    });
  }
});

export default router;
