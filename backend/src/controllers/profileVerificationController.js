import { query } from "../config/postgres.js";
import { formatProfile } from "../utils/formatters.js";
import { sendPushToUsers } from "../utils/webPush.js";

export const submitVerification = async (req, res) => {
  try {
    const { profileId } = req.body;

    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    const checkRes = await query(
      "SELECT * FROM profiles WHERE id::text = $1",
      [profileId.trim()]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    const creatorProfile = checkRes.rows[0];

    const hasVerificationDocument = Boolean(
      creatorProfile.aadhar_url ||
      creatorProfile.aadhar_storage_id ||
      creatorProfile.pan_url ||
      creatorProfile.pan_storage_id
    );

    if (!hasVerificationDocument) {
      return res.status(400).json({
        success: false,
        message: "Save an Aadhaar or PAN document before requesting verification.",
      });
    }

    const missingFields = [];
    if (!creatorProfile.full_name) missingFields.push("Name");
    if (!creatorProfile.handle) missingFields.push("Handle / Username");
    if (!creatorProfile.phone) missingFields.push("Phone");
    if (!creatorProfile.bio) missingFields.push("Bio");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required information for verification: ${missingFields.join(", ")}`,
      });
    }

    const updateRes = await query(
      `UPDATE profiles
       SET verification_status = 'pending', updated_at = NOW()
       WHERE id::text = $1
       RETURNING *`,
      [profileId.trim()]
    );

    const updatedProfile = updateRes.rows[0];

    // Notify admins
    const adminsRes = await query(
      "SELECT id FROM profiles WHERE role = 'admin' AND is_deleted = false"
    );

    if (adminsRes.rows.length > 0) {
      const now = Date.now();
      for (const admin of adminsRes.rows) {
        await query(
          `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            admin.id,
            updatedProfile.id,
            "verification_requested",
            `${updatedProfile.full_name} has submitted their profile for verification.`,
            "/admin/users",
            now,
          ]
        );
      }

      const adminIds = adminsRes.rows.map((a) => a.id);
      sendPushToUsers(adminIds, {
        title: `New Verification Request 🪪`,
        body: `${updatedProfile.full_name} has submitted their profile for verification.`,
        url: `/admin/users`,
      }).catch((err) => console.error("Verification push error:", err.message));
    }

    return res.status(200).json({
      success: true,
      data: formatProfile(updatedProfile),
    });
  } catch (error) {
    console.error("Submit verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit verification.",
    });
  }
};

export const submitBrandVerification = async (req, res) => {
  try {
    const {
      profileId,
      gstNumber,
      gstCertificateStorageId,
      gstCertificateUrl,
    } = req.body;

    if (!profileId || !gstNumber || !gstCertificateStorageId) {
      return res.status(400).json({
        success: false,
        message: "Required GST verification fields are missing.",
      });
    }

    const checkRes = await query(
      "SELECT * FROM profiles WHERE id::text = $1",
      [profileId.trim()]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    const brandProfile = checkRes.rows[0];

    const missingFields = [];
    if (!brandProfile.handle) missingFields.push("Handle / Username");
    if (!brandProfile.category) missingFields.push("Category");
    if (!brandProfile.website) missingFields.push("Website");
    if (!brandProfile.location) missingFields.push("Location");
    if (!brandProfile.company_size) missingFields.push("Company Size");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required information for verification: ${missingFields.join(", ")}`,
      });
    }

    const updateRes = await query(
      `UPDATE profiles
       SET verification_status = 'pending',
           gst_number = $1,
           gst_certificate_storage_id = $2,
           gst_certificate_url = $3,
           updated_at = NOW()
       WHERE id::text = $4
       RETURNING *`,
      [
        gstNumber,
        gstCertificateStorageId,
        gstCertificateUrl || "",
        profileId.trim(),
      ]
    );

    const updatedProfile = updateRes.rows[0];

    // Notify admins
    const adminsRes = await query(
      "SELECT id FROM profiles WHERE role = 'admin' AND is_deleted = false"
    );

    if (adminsRes.rows.length > 0) {
      const now = Date.now();
      for (const admin of adminsRes.rows) {
        await query(
          `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            admin.id,
            updatedProfile.id,
            "verification_requested",
            `${updatedProfile.full_name} has submitted their brand profile for verification.`,
            "/admin/users",
            now,
          ]
        );
      }

      const adminIds = adminsRes.rows.map((a) => a.id);
      sendPushToUsers(adminIds, {
        title: `New Brand Verification Request 🏢`,
        body: `${updatedProfile.full_name} has submitted their brand profile for verification.`,
        url: `/admin/users`,
      }).catch((err) => console.error("Verification push error:", err.message));
    }

    return res.status(200).json({
      success: true,
      data: formatProfile(updatedProfile),
    });
  } catch (error) {
    console.error("Brand verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit brand verification.",
    });
  }
};
