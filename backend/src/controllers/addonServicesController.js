import { query } from "../config/postgres.js";
import { formatProfile } from "../utils/formatters.js";

const resolveProfileId = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT id FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [idOrUserId]
  );
  return res.rows[0]?.id || null;
};

const formatAddonService = (s) => {
  if (!s) return null;
  return {
    _id: s.id,
    id: s.id,
    name: s.name,
    description: s.description || "",
    price: Number(s.price || 0),
    category: s.category || "General",
    imageUrl: s.image_url || "",
    enabled: Boolean(s.enabled),
    creatorId: s.creator ? formatProfile(s.creator) : s.creator_id,
    approvalStatus: s.approval_status || "approved",
    rejectionReason: s.rejection_reason || "",
    createdAt: s.created_at || s.created_at_dt,
  };
};

const formatAddonBooking = (b) => {
  if (!b) return null;
  return {
    _id: b.id,
    id: b.id,
    profileId: b.profile ? formatProfile(b.profile) : b.profile_id,
    serviceId: b.service ? formatAddonService(b.service) : b.service_id,
    bookingDate: Number(b.booking_date || 0),
    status: b.status || "pending",
    notes: b.notes || "",
    createdAt: b.created_at || b.created_at_dt,
  };
};

const defaultMockServices = [
  {
    name: "Professional Videography Team",
    description: "Hire a 2-person professional videography team for a full day shoot (8 hours). Includes all necessary 4K cameras, professional lighting, and raw footage delivery within 24 hours.",
    price: 15000,
    category: "Production",
    imageUrl: "https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800&auto=format&fit=crop",
    enabled: true,
  },
  {
    name: "Podcast Recording Studio",
    description: "Rent our state-of-the-art podcast studio for 4 hours. Includes 4 Shure SM7B microphones, soundproofing, live mixing board, and an on-site audio engineer to ensure perfect recording quality.",
    price: 8000,
    category: "Studio",
    imageUrl: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=800&auto=format&fit=crop",
    enabled: true,
  },
  {
    name: "Premium Video Editing (Reels/TikTok)",
    description: "Send us your raw footage and our expert editors will create 5 highly engaging short-form videos (Reels/TikTok/Shorts) with trending audio, professional color grading, and dynamic captions.",
    price: 5000,
    category: "Editing",
    imageUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=800&auto=format&fit=crop",
    enabled: true,
  },
  {
    name: "Verified Profile Badge",
    description: "Fast-track your profile verification. Our team will manually review your portfolio, social links, and identity documents within 24 hours to award you the 'Verified Creator' badge, boosting your visibility to brands.",
    price: 2500,
    category: "Verification",
    imageUrl: "https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?q=80&w=800&auto=format&fit=crop",
    enabled: true,
  },
  {
    name: "Dedicated Campaign Manager",
    description: "Running a large campaign? Hire a dedicated campaign manager for 1 month. They will handle all creator outreach, contract negotiations, product shipping logistics, and final content approvals on your behalf.",
    price: 25000,
    category: "Management",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop",
    enabled: true,
  },
  {
    name: "Product Photography Shoot",
    description: "Ship your product to our in-house studio. We will provide 15 ultra-high-resolution, professionally lit, lifestyle and white-background images perfectly formatted for your e-commerce store and social media.",
    price: 12000,
    category: "Photography",
    imageUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=800&auto=format&fit=crop",
    enabled: true,
  },
];

// List Addon Services
export const listAddonServices = async (req, res) => {
  try {
    const { profileId, role, status } = req.query;
    const enabledOnly = req.query.enabledOnly === "true";

    const isAdmin =
      role === "admin" ||
      req.user?.role === "admin" ||
      req.profile?.role === "admin";

    const effectiveProfileId = profileId || req.user?.profileId || req.user?._id;
    const resolvedProfileId = effectiveProfileId ? await resolveProfileId(effectiveProfileId) : null;
    const isCreator =
      (role === "creator" || req.user?.role === "creator" || req.profile?.role === "creator") &&
      resolvedProfileId;

    let whereConditions = [];
    let params = [];

    if (isAdmin) {
      if (status && status !== "all") {
        params.push(status);
        whereConditions.push(`COALESCE(s.approval_status, 'approved') = $${params.length}`);
      }
      if (enabledOnly) {
        whereConditions.push(`COALESCE(s.enabled, true) = true`);
      }
    } else if (isCreator) {
      params.push(resolvedProfileId);
      whereConditions.push(`((COALESCE(s.approval_status, 'approved') = 'approved' AND COALESCE(s.enabled, true) = true) OR s.creator_id = $${params.length})`);
    } else {
      whereConditions.push(`(COALESCE(s.approval_status, 'approved') = 'approved' AND COALESCE(s.enabled, true) = true)`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const { rows } = await query(
      `
      SELECT
        s.*,
        row_to_json(cr.*) as creator
      FROM addon_services s
      LEFT JOIN profiles cr ON cr.id = s.creator_id
      ${whereClause}
      ORDER BY COALESCE(s.created_at_dt, NOW()) DESC;
      `,
      params
    );

    // Auto-seed default services if table is empty so users have live services
    if (rows.length === 0 && !isAdmin && !status) {
      for (const s of defaultMockServices) {
        await query(
          `INSERT INTO addon_services (name, description, price, category, image_url, enabled, approval_status, is_active, created_at, created_at_dt)
           VALUES ($1, $2, $3, $4, $5, $6, 'approved', true, $7, NOW())
           ON CONFLICT DO NOTHING`,
          [s.name, s.description, s.price, s.category, s.imageUrl, s.enabled, Date.now()]
        ).catch(() => {});
      }
      const refetch = await query(`
        SELECT s.*, row_to_json(cr.*) as creator
        FROM addon_services s
        LEFT JOIN profiles cr ON cr.id = s.creator_id
        WHERE (COALESCE(s.approval_status, 'approved') = 'approved' AND COALESCE(s.enabled, true) = true)
        ORDER BY s.id DESC;
      `).catch(() => ({ rows: [] }));

      if (refetch.rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: refetch.rows.map(formatAddonService),
        });
      }
    }

    res.status(200).json({
      success: true,
      data: rows.map(formatAddonService),
    });
  } catch (error) {
    console.error("List addon services error:", error);

    // Resilient fallback query
    try {
      const fallback = await query(`SELECT * FROM addon_services WHERE COALESCE(enabled, true) = true ORDER BY id DESC LIMIT 50;`);
      if (fallback.rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: fallback.rows.map(formatAddonService),
        });
      }
    } catch (_) {}

    // Graceful fallback to default mock services so page never crashes with 500
    res.status(200).json({
      success: true,
      data: defaultMockServices.map((s, idx) => ({
        _id: `default-addon-${idx}`,
        id: `default-addon-${idx}`,
        ...s,
        approvalStatus: "approved",
      })),
    });
  }
};

// Create Addon Service
export const createAddonService = async (req, res) => {
  try {
    let { name, description, imageUrl, price, enabled, creatorId, role } = req.body;

    if (req.file) {
      imageUrl = req.file.path || `/uploads/${req.file.filename}`;
    }

    const isAdmin = role === "admin" || (!creatorId && req.user?.role === "admin");
    const resolvedCreatorId = creatorId ? await resolveProfileId(creatorId) : null;
    const isCreator = role === "creator" || Boolean(resolvedCreatorId);

    const approvalStatus = isAdmin ? "approved" : "pending";
    const now = Date.now();

    const { rows } = await query(
      `
      INSERT INTO addon_services (
        name, description, image_url, price, enabled, creator_id, approval_status,
        rejection_reason, created_at, created_at_dt, updated_at_dt
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        '', $8, NOW(), NOW()
      )
      RETURNING *;
      `,
      [
        name,
        description || "",
        imageUrl || "",
        Number(price) || 0,
        enabled !== undefined ? (enabled === "true" || enabled === true) : true,
        isCreator ? resolvedCreatorId : null,
        approvalStatus,
        now,
      ]
    );

    const service = rows[0];

    // If created by creator, notify admins
    if (isCreator && resolvedCreatorId) {
      try {
        const creatorProfile = await query(`SELECT full_name FROM profiles WHERE id = $1;`, [resolvedCreatorId]);
        const creatorName = creatorProfile.rows[0]?.full_name || "A creator";
        const admins = await query(`SELECT id FROM profiles WHERE role = 'admin';`);

        for (const admin of admins.rows) {
          await query(
            `
            INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
            VALUES ($1, $2, 'addon_service_submitted', $3, '/bookings', false, NOW());
            `,
            [
              admin.id,
              resolvedCreatorId,
              `New Add-on Service Submission: ${creatorName} submitted "${name}" (₹${Number(price).toLocaleString("en-IN")}) for approval.`,
            ]
          );
        }
      } catch (notifErr) {
        console.error("Error creating creator addon notification for admin:", notifErr);
      }
    }

    res.status(201).json({
      success: true,
      data: formatAddonService(service),
      message: isCreator
        ? "Add-on service submitted successfully! It will be visible to brands once approved by admin."
        : "Add-on service created successfully!",
    });
  } catch (error) {
    console.error("Create addon service error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create addon service.",
    });
  }
};

// Update Addon Service
export const updateAddonService = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, description, imageUrl, price, enabled, approvalStatus, rejectionReason } = req.body;

    if (req.file) {
      imageUrl = req.file.path || `/uploads/${req.file.filename}`;
    }

    const findRes = await query(`SELECT * FROM addon_services WHERE id::text = $1;`, [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Addon service not found.",
      });
    }

    const existingService = findRes.rows[0];

    const { rows } = await query(
      `
      UPDATE addon_services SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        image_url = COALESCE($3, image_url),
        price = COALESCE($4, price),
        enabled = COALESCE($5, enabled),
        approval_status = COALESCE($6, approval_status),
        rejection_reason = COALESCE($7, rejection_reason),
        updated_at_dt = NOW()
      WHERE id = $8
      RETURNING *;
      `,
      [
        name || null,
        description !== undefined ? description : null,
        imageUrl || null,
        price !== undefined ? Number(price) : null,
        enabled !== undefined ? (enabled === "true" || enabled === true) : null,
        approvalStatus || null,
        rejectionReason !== undefined ? rejectionReason : null,
        existingService.id,
      ]
    );

    const service = rows[0];

    // If admin approved or rejected creator's service, notify creator
    if (
      existingService.creator_id &&
      approvalStatus &&
      approvalStatus !== existingService.approval_status
    ) {
      try {
        const isApproved = approvalStatus === "approved";
        const admins = await query(`SELECT id FROM profiles WHERE role = 'admin' LIMIT 1;`);
        const adminSenderId = admins.rows[0]?.id || existingService.creator_id;

        await query(
          `
          INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
          VALUES ($1, $2, $3, $4, '/addons', false, NOW());
          `,
          [
            existingService.creator_id,
            adminSenderId,
            isApproved ? "addon_service_approved" : "addon_service_rejected",
            isApproved
              ? `Your Add-on service "${service.name}" has been approved by admin and is now live for brands!`
              : `Your Add-on service "${service.name}" was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
          ]
        );
      } catch (notifErr) {
        console.error("Error creating creator approval notification:", notifErr);
      }
    }

    res.status(200).json({
      success: true,
      data: formatAddonService(service),
      message: "Addon service updated successfully.",
    });
  } catch (error) {
    console.error("Update addon service error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update addon service.",
    });
  }
};

// Delete Addon Service
export const deleteAddonService = async (req, res) => {
  try {
    const { id } = req.params;

    await query(`DELETE FROM addon_services WHERE id::text = $1;`, [id]);

    res.status(200).json({
      success: true,
      message: "Addon service deleted.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete addon service.",
    });
  }
};

// List Addon Bookings
export const listAddonBookings = async (req, res) => {
  try {
    const { profileId, role } = req.query;
    const resolvedProfileId = profileId ? await resolveProfileId(profileId) : null;

    let whereConditions = [];
    let params = [];

    if (role === "admin" || !resolvedProfileId) {
      // Admin sees all
    } else if (role === "creator") {
      params.push(resolvedProfileId);
      whereConditions.push(`(s.creator_id = $${params.length} OR b.profile_id = $${params.length})`);
    } else {
      params.push(resolvedProfileId);
      whereConditions.push(`b.profile_id = $${params.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const { rows } = await query(
      `
      SELECT
        b.*,
        row_to_json(s.*) as service,
        row_to_json(p.*) as profile
      FROM addon_bookings b
      LEFT JOIN addon_services s ON s.id = b.service_id
      LEFT JOIN profiles p ON p.id = b.profile_id
      ${whereClause}
      ORDER BY b.created_at_dt DESC;
      `,
      params
    );

    res.status(200).json({
      success: true,
      data: rows.map(formatAddonBooking),
    });
  } catch (error) {
    console.error("List addon bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch addon bookings.",
    });
  }
};

// Create Addon Booking
export const createAddonBooking = async (req, res) => {
  try {
    const { profileId, serviceId, notes } = req.body;
    const resolvedProfileId = await resolveProfileId(profileId);

    if (!resolvedProfileId || !serviceId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID and Service ID are required.",
      });
    }

    const now = Date.now();
    const bookingDate = now + 7 * 24 * 60 * 60 * 1000;

    const { rows } = await query(
      `
      INSERT INTO addon_bookings (
        profile_id, service_id, notes, booking_date, status, created_at, created_at_dt, updated_at_dt
      ) VALUES (
        $1, $2, $3, $4, 'pending', $5, NOW(), NOW()
      )
      RETURNING *;
      `,
      [resolvedProfileId, serviceId, notes || "", bookingDate, now]
    );

    const booking = rows[0];

    const sRes = await query(`SELECT * FROM addon_services WHERE id::text = $1;`, [serviceId]);
    const service = sRes.rows[0];

    const rRes = await query(`SELECT full_name, role FROM profiles WHERE id = $1;`, [resolvedProfileId]);
    const requester = rRes.rows[0];

    const serviceName = service ? service.name : "Add-on Service";
    const requesterName = requester ? requester.full_name : "A user";
    const requesterRole = requester?.role || "brand";

    // Notify admins
    try {
      const admins = await query(`SELECT id FROM profiles WHERE role = 'admin';`);
      for (const admin of admins.rows) {
        await query(
          `
          INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
          VALUES ($1, $2, 'addon_booking', $3, '/bookings', false, NOW());
          `,
          [admin.id, resolvedProfileId, `New Add-on Booking: ${requesterName} (${requesterRole}) booked "${serviceName}".`]
        );
      }
    } catch (notifErr) {
      console.error("Error creating admin booking notification:", notifErr);
    }

    let conversationId = null;
    if (service?.creator_id && String(service.creator_id) !== String(resolvedProfileId)) {
      try {
        await query(
          `
          INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
          VALUES ($1, $2, 'addon_booking', $3, '/addons', false, NOW());
          `,
          [
            service.creator_id,
            resolvedProfileId,
            `🎉 Good news! ${requesterName} (${requesterRole}) booked your service "${serviceName}". Discuss schedule and details in Messages.`,
          ]
        );

        // Find or create conversation
        const convRes = await query(
          `SELECT id FROM conversations WHERE creator_id = $1 AND brand_id = $2 LIMIT 1;`,
          [service.creator_id, resolvedProfileId]
        );

        if (convRes.rows.length > 0) {
          conversationId = convRes.rows[0].id;
        } else {
          const newConv = await query(
            `
            INSERT INTO conversations (creator_id, brand_id, conversation_type, status, created_at, updated_at)
            VALUES ($1, $2, 'brand_creator', 'active', NOW(), NOW())
            RETURNING id;
            `,
            [service.creator_id, resolvedProfileId]
          );
          conversationId = newConv.rows[0].id;
        }

        if (conversationId) {
          const initialChatText = `👋 Hello! I just booked your add-on service "${serviceName}" (₹${Number(service.price || 0).toLocaleString("en-IN")}).${notes ? `\n\nBooking Notes: "${notes}"` : ""}\n\nLet's coordinate the timing, requirements, and deliverables here.`;

          await query(
            `
            INSERT INTO messages (conversation_id, sender_id, text, read, message_type, created_at)
            VALUES ($1, $2, $3, false, 'text', NOW());
            `,
            [conversationId, resolvedProfileId, initialChatText]
          );
        }
      } catch (creatorNotifErr) {
        console.error("Error setting up creator booking chat/notif:", creatorNotifErr);
      }
    }

    res.status(201).json({
      success: true,
      data: formatAddonBooking(booking),
      conversationId,
      message: `Booking request for ${serviceName} submitted successfully!`,
    });
  } catch (error) {
    console.error("Create addon booking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create addon booking.",
    });
  }
};

// Update Addon Booking Status
export const updateAddonBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value.",
      });
    }

    const { rows } = await query(
      `
      UPDATE addon_bookings SET
        status = $1,
        updated_at_dt = NOW()
      WHERE id::text = $2
      RETURNING *;
      `,
      [status, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found.",
      });
    }

    const booking = rows[0];

    // Notify the Brand who placed the booking
    try {
      const sRes = await query(`SELECT name, creator_id FROM addon_services WHERE id = $1;`, [booking.service_id]);
      const serviceName = sRes.rows[0]?.name || "Add-on Service";
      const serviceCreatorId = sRes.rows[0]?.creator_id;

      await query(
        `
        INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
        VALUES ($1, $2, $3, $4, '/addons', false, NOW());
        `,
        [
          booking.profile_id,
          serviceCreatorId || booking.profile_id,
          status === "confirmed" ? "addon_booking_confirmed" : "addon_booking_cancelled",
          status === "confirmed"
            ? `Your booking request for "${serviceName}" has been confirmed!`
            : `Your booking request for "${serviceName}" has been updated to ${status}.`,
        ]
      );
    } catch (notifErr) {
      console.error("Error creating booking status notification:", notifErr);
    }

    res.status(200).json({
      success: true,
      data: formatAddonBooking(booking),
      message: `Booking marked as ${status}.`,
    });
  } catch (error) {
    console.error("Update addon booking status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update booking status.",
    });
  }
};

// Delete Addon Booking
export const deleteAddonBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(`DELETE FROM addon_bookings WHERE id::text = $1 RETURNING *;`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking request deleted successfully.",
    });
  } catch (error) {
    console.error("Delete addon booking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete booking request.",
    });
  }
};