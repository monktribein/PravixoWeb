import { query } from "../config/postgres.js";
import { formatCampaignTask, formatNotification, formatCampaign, formatProfile } from "../utils/formatters.js";
import { sendPushToUser } from "../utils/webPush.js";

const resolveProfileId = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT id FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [idOrUserId]
  );
  return res.rows[0]?.id || null;
};

const notifyAndPush = async ({ recipientId, senderId, type, text, taskId, targetUrl, pushTitle }) => {
  try {
    const res = await query(
      `
      INSERT INTO notifications (recipient_id, sender_id, type, text, task_id, target_url, read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      RETURNING *;
      `,
      [recipientId, senderId || null, type, text, taskId || null, targetUrl || "/dashboard"]
    );

    if (recipientId) {
      sendPushToUser(recipientId, {
        title: pushTitle || "Campaign Task Update 📋",
        body: text,
        url: targetUrl || "/dashboard",
      }).catch((err) => console.error("Task push error:", err.message));
    }
  } catch (err) {
    console.error("Task notif create error:", err.message);
  }
};

const parseAmount = (budgetStr) => {
  const clean = String(budgetStr || "").replace(/[^\d]/g, "");
  const parsed = parseInt(clean, 10);
  return Number.isNaN(parsed) ? 1000 : parsed;
};

// ==========================================
// CREATE TASK
// ==========================================
export const createTask = async (req, res) => {
  try {
    const {
      campaignId,
      creatorId,
      brandId,
      connectionId,
      conversationId,
      title,
      description,
      deliverables,
      priority,
      dueDate,
      notes,
    } = req.body;

    if (
      !creatorId ||
      !brandId ||
      !connectionId ||
      !title ||
      !description ||
      !deliverables ||
      !priority ||
      dueDate === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Required task fields are missing.",
      });
    }

    const resolvedCreatorId = await resolveProfileId(creatorId);
    const resolvedBrandId = await resolveProfileId(brandId);

    if (!resolvedCreatorId || !resolvedBrandId) {
      return res.status(400).json({
        success: false,
        message: "Invalid creator or brand ID.",
      });
    }

    if (!["low", "medium", "high"].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority.",
      });
    }

    // Verify connection exists and is accepted
    const connRes = await query(
      `SELECT * FROM connections WHERE id::text = $1 AND status = 'accepted'`,
      [connectionId]
    );

    if (connRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot assign task to a non-connected creator.",
      });
    }

    const { rows } = await query(
      `
      INSERT INTO campaign_tasks (
        campaign_id, creator_id, brand_id, connection_id, conversation_id,
        title, description, deliverables, priority, status, due_date,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, 'assigned', $10,
        $11, NOW(), NOW()
      )
      RETURNING *;
      `,
      [
        campaignId || null,
        resolvedCreatorId,
        resolvedBrandId,
        connectionId,
        conversationId || null,
        title,
        description,
        deliverables,
        priority,
        Number(dueDate),
        notes || "",
      ]
    );

    const task = rows[0];

    // Notify Creator
    await notifyAndPush({
      recipientId: resolvedCreatorId,
      senderId: resolvedBrandId,
      type: "task_assigned",
      text: `Brand has assigned a new task: "${title}"`,
      taskId: task.id,
      targetUrl: "/dashboard/influencer",
      pushTitle: "New Task Assigned! 📋",
    });

    return res.status(201).json({
      success: true,
      data: formatCampaignTask(task),
    });
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create task.",
    });
  }
};

// ==========================================
// START TASK
// ==========================================
export const startTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const findRes = await query(`SELECT * FROM campaign_tasks WHERE id::text = $1`, [taskId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const task = findRes.rows[0];
    if (task.status !== "assigned") {
      return res.status(400).json({
        success: false,
        message: "Task already started or finished.",
      });
    }

    const now = Date.now();
    const updRes = await query(
      `
      UPDATE campaign_tasks SET
        status = 'in_progress',
        started_at = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
      `,
      [now, task.id]
    );

    return res.status(200).json({
      success: true,
      data: formatCampaignTask(updRes.rows[0]),
    });
  } catch (error) {
    console.error("Start task error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start task.",
    });
  }
};

// ==========================================
// SUBMIT TASK
// ==========================================
export const submitTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { submissionLink, notes, attachmentLink } = req.body;

    if (!submissionLink) {
      return res.status(400).json({
        success: false,
        message: "Submission link is required.",
      });
    }

    const findRes = await query(`SELECT * FROM campaign_tasks WHERE id::text = $1`, [taskId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const task = findRes.rows[0];
    if (task.status !== "in_progress" && task.status !== "revision_requested") {
      return res.status(400).json({
        success: false,
        message: "Task is not in progress or in revision.",
      });
    }

    const now = Date.now();
    const updRes = await query(
      `
      UPDATE campaign_tasks SET
        status = 'completed',
        completed_at = $1,
        submission_link = $2,
        notes = $3,
        attachment_link = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *;
      `,
      [now, submissionLink, notes || "", attachmentLink || "", task.id]
    );

    // Notify Brand
    await notifyAndPush({
      recipientId: task.brand_id,
      senderId: task.creator_id,
      type: "task_completed",
      text: `Creator has completed the assigned task: "${task.title}"`,
      taskId: task.id,
      targetUrl: "/dashboard/customer",
      pushTitle: "Task Completed! 🚀",
    });

    return res.status(200).json({
      success: true,
      data: formatCampaignTask(updRes.rows[0]),
    });
  } catch (error) {
    console.error("Submit task error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit task.",
    });
  }
};

// ==========================================
// REVIEW TASK
// ==========================================
export const reviewTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { action } = req.body;

    if (!["approve", "revision"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either approve or revision.",
      });
    }

    const findRes = await query(`SELECT * FROM campaign_tasks WHERE id::text = $1`, [taskId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const task = findRes.rows[0];
    if (task.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Task is not completed/submitted for review.",
      });
    }

    if (action === "approve") {
      const updRes = await query(
        `UPDATE campaign_tasks SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *;`,
        [task.id]
      );

      // Fetch campaign to get budget
      if (task.campaign_id) {
        const campRes = await query(`SELECT * FROM campaigns WHERE id = $1`, [task.campaign_id]);
        const campaign = campRes.rows[0];

        if (campaign) {
          const totalAmount = parseAmount(campaign.budget);
          const platformCommissionPercentage = 20;
          const platformCommission = (totalAmount * platformCommissionPercentage) / 100;
          const creatorAmount = totalAmount - platformCommission;

          // Prevent duplicate payment invoice
          const existingPay = await query(
            `SELECT id FROM payments WHERE task_id = $1 LIMIT 1;`,
            [task.id]
          );

          if (existingPay.rows.length === 0) {
            const payRes = await query(
              `
              INSERT INTO payments (
                campaign_id, task_id, conversation_id, connection_id,
                brand_id, creator_id, payment_gateway, invoice_number,
                invoice_status, currency, gross_amount, platform_commission_percentage,
                platform_commission_amount, creator_amount, holding_status, payment_status,
                created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4,
                $5, $6, 'razorpay', $7,
                'issued', 'INR', $8, $9,
                $10, $11, 'inactive', 'invoice_generated',
                NOW(), NOW()
              )
              RETURNING *;
              `,
              [
                task.campaign_id,
                task.id,
                task.conversation_id,
                task.connection_id,
                task.brand_id,
                task.creator_id,
                "INV-" + Date.now(),
                totalAmount,
                platformCommissionPercentage,
                platformCommission,
                creatorAmount,
              ]
            );

            await query(
              `
              INSERT INTO payment_audit_logs (payment_id, action, details, created_at)
              VALUES ($1, 'Invoice Created', $2, NOW());
              `,
              [
                payRes.rows[0].id,
                JSON.stringify({ note: `Escrow invoice generated for gross amount of ₹${totalAmount.toLocaleString()}` }),
              ]
            );
          }
        }
      }

      // Notify Creator
      await notifyAndPush({
        recipientId: task.creator_id,
        senderId: task.brand_id,
        type: "task_approved",
        text: `Brand has approved your task: "${task.title}"`,
        taskId: task.id,
        targetUrl: "/dashboard/influencer",
        pushTitle: "Task Approved! 🎉",
      });

      return res.status(200).json({
        success: true,
        message: "Task approved successfully.",
        data: formatCampaignTask(updRes.rows[0]),
      });
    }

    // REVISION
    const revRes = await query(
      `UPDATE campaign_tasks SET status = 'revision_requested', updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [task.id]
    );

    await notifyAndPush({
      recipientId: task.creator_id,
      senderId: task.brand_id,
      type: "revision_requested",
      text: `Brand has requested a revision on your task: "${task.title}"`,
      taskId: task.id,
      targetUrl: "/dashboard/influencer",
      pushTitle: "Revision Requested 🔄",
    });

    return res.status(200).json({
      success: true,
      message: "Revision requested successfully.",
      data: formatCampaignTask(revRes.rows[0]),
    });
  } catch (error) {
    console.error("Review task error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to review task.",
    });
  }
};

// ==========================================
// GET TASKS FOR CREATOR
// ==========================================
export const getTasksForCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const resolvedId = await resolveProfileId(creatorId);

    if (!resolvedId) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const { rows } = await query(
      `
      SELECT
        ct.*,
        row_to_json(c.*) as campaign,
        row_to_json(b.*) as brand
      FROM campaign_tasks ct
      LEFT JOIN campaigns c ON c.id = ct.campaign_id
      LEFT JOIN profiles b ON b.id = ct.brand_id
      WHERE ct.creator_id = $1
      ORDER BY ct.created_at DESC;
      `,
      [resolvedId]
    );

    const formatted = rows.map((r) => ({
      ...formatCampaignTask(r),
      campaign: formatCampaign(r.campaign),
      brand: formatProfile(r.brand),
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Get creator tasks error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch creator tasks.",
    });
  }
};

// ==========================================
// GET TASKS FOR BRAND
// ==========================================
export const getTasksForBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const resolvedId = await resolveProfileId(brandId);

    if (!resolvedId) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const { rows } = await query(
      `
      SELECT
        ct.*,
        row_to_json(c.*) as campaign,
        row_to_json(cr.*) as creator
      FROM campaign_tasks ct
      LEFT JOIN campaigns c ON c.id = ct.campaign_id
      LEFT JOIN profiles cr ON cr.id = ct.creator_id
      WHERE ct.brand_id = $1
      ORDER BY ct.created_at DESC;
      `,
      [resolvedId]
    );

    const formatted = rows.map((r) => ({
      ...formatCampaignTask(r),
      campaign: formatCampaign(r.campaign),
      creator: formatProfile(r.creator),
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Get brand tasks error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch brand tasks.",
    });
  }
};

// ==========================================
// GET NOTIFICATIONS
// ==========================================
export const getNotifications = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const resolvedId = await resolveProfileId(recipientId);

    if (!resolvedId) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const { rows } = await query(
      `SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC;`,
      [resolvedId]
    );

    return res.status(200).json({
      success: true,
      data: rows.map(formatNotification),
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

// ==========================================
// MARK NOTIFICATION READ
// ==========================================
export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const { rows } = await query(
      `UPDATE notifications SET read = true WHERE id::text = $1 RETURNING *;`,
      [notificationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatNotification(rows[0]),
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
    });
  }
};

// ==========================================
// MARK ALL NOTIFICATIONS READ
// ==========================================
export const markAllNotificationsRead = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const resolvedId = await resolveProfileId(recipientId);

    if (resolvedId) {
      await query(`UPDATE notifications SET read = true WHERE recipient_id = $1;`, [resolvedId]);
    }

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
    });
  }
};

// ==========================================
// CLEAR ALL NOTIFICATIONS
// ==========================================
export const clearNotifications = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const resolvedId = await resolveProfileId(recipientId);

    if (resolvedId) {
      await query(`DELETE FROM notifications WHERE recipient_id = $1;`, [resolvedId]);
    }

    return res.status(200).json({
      success: true,
      message: "All notifications cleared.",
    });
  } catch (error) {
    console.error("Clear notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear notifications.",
    });
  }
};

// ==========================================
// DELETE SINGLE NOTIFICATION
// ==========================================
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await query(`DELETE FROM notifications WHERE id::text = $1;`, [notificationId]);

    return res.status(200).json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
};