import { query } from "../config/postgres.js";
import {
  formatSubmission,
  formatConnection,
  formatCampaign,
  formatProfile,
} from "../utils/formatters.js";
import { sendPushToUser } from "../utils/webPush.js";

const getFileUrl = (file) => {
  if (!file) return null;
  if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

// Helper: Find Connection
const findConnection = async (id) => {
  if (!id) return null;
  const res = await query(`SELECT * FROM connections WHERE id::text = $1 LIMIT 1`, [String(id)]);
  return res.rows[0] ? formatConnection(res.rows[0]) : null;
};

// Helper: Find Submission
const findSubmission = async (id) => {
  if (!id) return null;
  const res = await query(`SELECT * FROM submissions WHERE id::text = $1 LIMIT 1`, [String(id)]);
  return res.rows[0] ? formatSubmission(res.rows[0]) : null;
};

// Helper: Find Profile
const findProfile = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [String(idOrUserId)]
  );
  return res.rows[0] ? formatProfile(res.rows[0]) : null;
};

// 1. Submit Deliverable Content (Creator only)
export const submitDeliverableContent = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { deliverableType, caption } = req.body;

    if (!deliverableType || !["REEL", "POST", "STORY", "VIDEO"].includes(deliverableType)) {
      return res.status(400).json({
        success: false,
        message: "Valid deliverable type (REEL, POST, STORY, VIDEO) is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Deliverable content file (image or video) is required.",
      });
    }

    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration record not found.",
      });
    }

    // Security Check: Caller must be creator of collaboration or admin
    if (req.user) {
      if (req.user.role !== "creator" && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only Creators can submit campaign deliverables.",
        });
      }

      const userProfileId = String(req.user.id || req.user._id);
      if (String(connection.creatorId) !== userProfileId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this collaboration.",
        });
      }
    }

    // Payment requirement check: Must be PAID
    if (connection.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot submit deliverables: Collaboration payment is not yet completed (must be PAID).",
      });
    }

    let deliverablesTracking = connection.deliverablesTracking || [];
    if (deliverablesTracking.length === 0 && connection.campaignId) {
      const campRes = await query(`SELECT deliverables FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      if (campRes.rows.length > 0) {
        const cData = campRes.rows[0];
        const delivObj =
          typeof cData.deliverables === "string"
            ? JSON.parse(cData.deliverables)
            : cData.deliverables || {};
        const delivs = [];
        const nowTime = Date.now();
        if (delivObj.reels > 0)
          delivs.push({
            type: "REEL",
            requiredQuantity: delivObj.reels,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: nowTime,
            updatedAt: nowTime,
          });
        if (delivObj.posts > 0)
          delivs.push({
            type: "POST",
            requiredQuantity: delivObj.posts,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: nowTime,
            updatedAt: nowTime,
          });
        if (delivObj.stories > 0)
          delivs.push({
            type: "STORY",
            requiredQuantity: delivObj.stories,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: nowTime,
            updatedAt: nowTime,
          });
        if (delivObj.videos > 0)
          delivs.push({
            type: "VIDEO",
            requiredQuantity: delivObj.videos,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: nowTime,
            updatedAt: nowTime,
          });
        deliverablesTracking = delivs;
      }
    }

    const deliverableItem = deliverablesTracking.find((d) => d.type === deliverableType);
    if (!deliverableItem) {
      return res.status(400).json({
        success: false,
        message: `Deliverable type ${deliverableType} is not part of this campaign's required deliverables.`,
      });
    }

    // Count existing non-rejected submissions
    const countRes = await query(
      `SELECT COUNT(*)::int as count FROM submissions 
       WHERE connection_id = $1 AND deliverable_type = $2 AND status != 'REJECTED'`,
      [connection.id, deliverableType]
    );
    const existingSubmissionsCount = countRes.rows[0]?.count || 0;

    if (existingSubmissionsCount >= deliverableItem.requiredQuantity) {
      return res.status(400).json({
        success: false,
        message: `Required quantity (${deliverableItem.requiredQuantity}) for ${deliverableType} deliverables has already been submitted.`,
      });
    }

    const contentUrl = getFileUrl(req.file);
    const now = Date.now();

    const insertSub = await query(
      `INSERT INTO submissions (
        connection_id, campaign_id, brand_id, creator_id, deliverable_type,
        content_url, cloudinary_public_id, caption, status, submitted_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED', $9, NOW(), NOW())
      RETURNING *`,
      [
        connection.id,
        connection.campaignId || null,
        connection.brandId,
        connection.creatorId,
        deliverableType,
        contentUrl,
        req.file.filename || null,
        caption || "",
        now,
      ]
    );
    const submission = formatSubmission(insertSub.rows[0]);

    // Calculate approved count
    const appRes = await query(
      `SELECT COUNT(*)::int as count FROM submissions 
       WHERE connection_id = $1 AND deliverable_type = $2 AND status = 'APPROVED'`,
      [connection.id, deliverableType]
    );
    const approvedCountForType = appRes.rows[0]?.count || 0;

    deliverableItem.status = "SUBMITTED";
    deliverableItem.completedQuantity = approvedCountForType;
    deliverableItem.updatedAt = now;

    await query(
      `UPDATE connections 
       SET deliverables_tracking = $1::jsonb, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(deliverablesTracking), connection.id]
    );

    // Notify Brand
    const creatorProfile = await findProfile(connection.creatorId);
    const creatorName = creatorProfile?.fullName || "Creator";
    let campaignTitle = "campaign";
    if (connection.campaignId) {
      const camp = await query(`SELECT title FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      if (camp.rows[0]?.title) campaignTitle = camp.rows[0].title;
    }

    const notifText = `${creatorName} submitted a ${deliverableType} for "${campaignTitle}".`;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
       VALUES ($1, $2, 'deliverable_submitted', $3, '/collaborations', $4, NOW())`,
      [connection.brandId, connection.creatorId, notifText, now]
    );

    sendPushToUser(connection.brandId, {
      title: "Deliverable Submitted! 🎬",
      body: notifText,
      url: "/collaborations",
    }).catch((err) => console.error("Deliverable push error:", err.message));

    // Notify Admin
    const admins = await query(`SELECT id FROM profiles WHERE role = 'admin'`);
    for (const admin of admins.rows) {
      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
         VALUES ($1, $2, 'deliverable_submitted', $3, '/admin/tasks', $4, NOW())`,
        [
          admin.id,
          connection.creatorId,
          `Creator ${creatorName} submitted campaign work (${deliverableType}) for "${campaignTitle}".`,
          now,
        ]
      );
    }

    // Post to chat
    try {
      const convRes = await query(
        `SELECT id FROM conversations 
         WHERE creator_id = $1 AND brand_id = $2 
           AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
         LIMIT 1`,
        [connection.creatorId, connection.brandId, connection.campaignId || null]
      );
      if (convRes.rows.length > 0) {
        await query(
          `INSERT INTO messages (conversation_id, sender_id, text, message_type, metadata, read)
           VALUES ($1, $2, $3, 'deliverable_submission', $4::jsonb, false)`,
          [
            convRes.rows[0].id,
            connection.creatorId,
            `[Deliverable Submission] ${creatorName} submitted ${deliverableType} #${
              existingSubmissionsCount + 1
            }`,
            JSON.stringify({
              submissionId: submission.id,
              deliverableType,
              contentUrl,
              caption: caption || "",
              status: "SUBMITTED",
              submittedAt: now,
              sequenceNumber: existingSubmissionsCount + 1,
              requiredQuantity: deliverableItem.requiredQuantity,
            }),
          ]
        );
      }
    } catch (chatErr) {
      console.warn("Could not post submission message to chat:", chatErr);
    }

    res.status(201).json({
      success: true,
      message: "Deliverable submitted successfully.",
      data: {
        submission,
        deliverablesTracking,
      },
    });
  } catch (error) {
    console.error("Submit deliverable error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit deliverable content.",
      error: error.message,
    });
  }
};

// 2. Get Submissions for a Collaboration
export const getCollaborationSubmissions = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await findConnection(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user.id || req.user._id);
      const isBrand = String(connection.brandId) === userProfileId;
      const isCreator = String(connection.creatorId) === userProfileId;
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have access to these submissions.",
        });
      }
    }

    const subRes = await query(
      `SELECT * FROM submissions WHERE connection_id::text = $1 ORDER BY created_at DESC`,
      [connection.id]
    );
    const submissions = subRes.rows.map(formatSubmission);

    const creatorProfile = await findProfile(connection.creatorId);
    let campaign = null;
    if (connection.campaignId) {
      const campRes = await query(`SELECT * FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      campaign = campRes.rows[0] ? formatCampaign(campRes.rows[0]) : null;
    }

    res.status(200).json({
      success: true,
      data: {
        connectionId: connection.id,
        paymentStatus: connection.paymentStatus,
        collaboration: {
          ...connection,
          creatorProfile,
          campaign,
        },
        deliverablesTracking: connection.deliverablesTracking || [],
        campaignDeliverables: campaign?.deliverables || null,
        submissions: submissions.map((sub) => ({
          ...sub,
          creator: creatorProfile,
          campaignTitle: campaign?.title || "Campaign",
        })),
      },
    });
  } catch (error) {
    console.error("Get collaboration submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collaboration submissions.",
      error: error.message,
    });
  }
};

// 3. Approve Deliverable Submission (Brand only)
export const approveDeliverableSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await findSubmission(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    const connection = await findConnection(submission.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Associated collaboration not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can review and approve deliverables.",
        });
      }

      const userProfileId = String(req.user.id || req.user._id);
      if (String(connection.brandId) !== userProfileId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this campaign/collaboration.",
        });
      }
    }

    if (submission.status !== "SUBMITTED" && submission.status !== "RESUBMITTED") {
      return res.status(400).json({
        success: false,
        message: `Submission is already ${submission.status} and cannot be approved.`,
      });
    }

    const now = Date.now();
    await query(
      `UPDATE submissions SET status = 'APPROVED', approved_at = $1, updated_at = NOW() WHERE id = $2`,
      [now, submission.id]
    );

    // Recalculate deliverables tracking
    const appRes = await query(
      `SELECT COUNT(*)::int as count FROM submissions 
       WHERE connection_id = $1 AND deliverable_type = $2 AND status = 'APPROVED'`,
      [connection.id, submission.deliverableType]
    );
    const approvedCountForType = appRes.rows[0]?.count || 0;

    let deliverablesTracking = connection.deliverablesTracking || [];
    const deliverableItem = deliverablesTracking.find((d) => d.type === submission.deliverableType);

    if (deliverableItem) {
      deliverableItem.completedQuantity = approvedCountForType;
      deliverableItem.status =
        approvedCountForType >= deliverableItem.requiredQuantity ? "COMPLETED" : "IN_PROGRESS";
      deliverableItem.updatedAt = now;
    }

    const allApproved =
      deliverablesTracking.length > 0 &&
      deliverablesTracking.every(
        (deliv) => (deliv.completedQuantity || 0) >= (deliv.requiredQuantity || 1)
      );

    const wasAlreadyCompleted = connection.allDeliverablesCompleted;
    let workCompletedAt = connection.workCompletedAt || null;
    let approvalCompletedAt = connection.approvalCompletedAt || null;
    let paymentReleaseEligibleAt = connection.paymentReleaseEligibleAt || null;
    let paymentReleaseStatus = connection.paymentReleaseStatus || "NOT_APPLICABLE";

    if (allApproved) {
      if (!workCompletedAt) workCompletedAt = now;
      if (!approvalCompletedAt) {
        approvalCompletedAt = now;
        paymentReleaseEligibleAt = now + 72 * 60 * 60 * 1000;
        paymentReleaseStatus = "WAITING_72_HOURS";
      }
    } else {
      workCompletedAt = null;
      approvalCompletedAt = null;
      paymentReleaseEligibleAt = null;
      paymentReleaseStatus = "NOT_APPLICABLE";
    }

    await query(
      `UPDATE connections 
       SET deliverables_tracking = $1::jsonb,
           all_deliverables_completed = $2,
           work_completed_at = $3,
           approval_completed_at = $4,
           payment_release_eligible_at = $5,
           payment_release_status = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [
        JSON.stringify(deliverablesTracking),
        allApproved,
        workCompletedAt,
        approvalCompletedAt,
        paymentReleaseEligibleAt,
        paymentReleaseStatus,
        connection.id,
      ]
    );

    const brandProfile = await findProfile(connection.brandId);
    const creatorProfile = await findProfile(connection.creatorId);
    const brandName = brandProfile?.fullName || "Brand";
    const creatorName = creatorProfile?.fullName || "Creator";
    let campaignTitle = "campaign";
    if (connection.campaignId) {
      const camp = await query(`SELECT title FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      if (camp.rows[0]?.title) campaignTitle = camp.rows[0].title;
    }

    const approvalText = `${brandName} approved your submitted ${submission.deliverableType} (v${
      submission.version || 1
    }) for "${campaignTitle}".`;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
       VALUES ($1, $2, 'deliverable_approved', $3, '/collaborations', $4, NOW())`,
      [connection.creatorId, connection.brandId, approvalText, now]
    );

    sendPushToUser(connection.creatorId, {
      title: "Deliverable Approved! ✅",
      body: approvalText,
      url: "/collaborations",
    }).catch((err) => console.error("Deliverable approval push error:", err.message));

    // Notify Admins
    const admins = await query(`SELECT id FROM profiles WHERE role = 'admin'`);
    for (const admin of admins.rows) {
      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
         VALUES ($1, $2, 'deliverable_approved', $3, '/admin/tasks', $4, NOW())`,
        [
          admin.id,
          connection.brandId,
          `${brandName} approved ${submission.deliverableType} (v${
            submission.version || 1
          }) by ${creatorName} for "${campaignTitle}".`,
          now,
        ]
      );
    }

    if (allApproved && !wasAlreadyCompleted) {
      const creatorAllDoneText = `🎉 Congratulations! All required campaign deliverables for "${campaignTitle}" have been approved by ${brandName}. 72-hour review period has started.`;
      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
         VALUES ($1, $2, 'all_deliverables_approved', $3, '/collaborations', $4, NOW())`,
        [connection.creatorId, connection.brandId, creatorAllDoneText, now]
      );
      sendPushToUser(connection.creatorId, {
        title: "All Deliverables Approved! 🎉",
        body: creatorAllDoneText,
        url: "/collaborations",
      }).catch((err) => console.error("All deliverables push error:", err.message));

      const brandAllDoneText = `All deliverables for "${campaignTitle}" with ${creatorName} are now fully approved. 72-hour review period is now active.`;
      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
         VALUES ($1, $2, 'all_deliverables_approved', $3, '/collaborations', $4, NOW())`,
        [connection.brandId, connection.creatorId, brandAllDoneText, now]
      );
      sendPushToUser(connection.brandId, {
        title: "Campaign Work Complete! 🌟",
        body: brandAllDoneText,
        url: "/collaborations",
      }).catch((err) => console.error("Brand all deliverables push error:", err.message));
    }

    // Post to chat
    try {
      const convRes = await query(
        `SELECT id FROM conversations 
         WHERE creator_id = $1 AND brand_id = $2 
           AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
         LIMIT 1`,
        [connection.creatorId, connection.brandId, connection.campaignId || null]
      );
      if (convRes.rows.length > 0) {
        await query(
          `INSERT INTO messages (conversation_id, sender_id, text, message_type, metadata, read)
           VALUES ($1, $2, $3, 'deliverable_submission', $4::jsonb, false)`,
          [
            convRes.rows[0].id,
            connection.brandId,
            `[Deliverable Approved] ${brandName} approved ${submission.deliverableType} submission (v${
              submission.version || 1
            }) (${approvedCountForType}/${deliverableItem?.requiredQuantity || 1} approved).`,
            JSON.stringify({
              submissionId: submission.id,
              deliverableType: submission.deliverableType,
              contentUrl: submission.contentUrl,
              status: "APPROVED",
              version: submission.version || 1,
              reviewedAt: now,
              approvedCount: approvedCountForType,
              requiredQuantity: deliverableItem?.requiredQuantity || 1,
            }),
          ]
        );

        if (allApproved && !wasAlreadyCompleted) {
          await query(
            `INSERT INTO messages (conversation_id, sender_id, text, message_type, metadata, read)
             VALUES ($1, $2, $3, 'system', $4::jsonb, false)`,
            [
              convRes.rows[0].id,
              connection.brandId,
              `[Campaign Work Completed] 🎉 All campaign deliverables for "${campaignTitle}" have been approved by ${brandName}! The 72-hour review period has commenced.`,
              JSON.stringify({
                connectionId: connection.id,
                allDeliverablesCompleted: true,
                completedAt: now,
                paymentReleaseEligibleAt,
              }),
            ]
          );
        }
      }
    } catch (chatErr) {
      console.warn("Could not post approval message to chat:", chatErr);
    }

    res.status(200).json({
      success: true,
      message: allApproved
        ? "Deliverable approved and all required deliverables for this collaboration are now completed! 72-hour review period started."
        : "Deliverable submission approved successfully.",
      data: {
        submission: { ...submission, status: "APPROVED", approvedAt: now },
        deliverablesTracking,
        allDeliverablesCompleted: allApproved,
        workCompletedAt,
        approvalCompletedAt,
        paymentReleaseEligibleAt,
        paymentReleaseStatus,
        paymentStatus: connection.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Approve deliverable submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve deliverable submission.",
      error: error.message,
    });
  }
};

// 4. Reject Deliverable Submission (Brand only)
export const rejectDeliverableSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const reasonText = (req.body.reason || req.body.rejectionReason || "").trim();

    if (!reasonText) {
      return res.status(400).json({
        success: false,
        message: "Rejection feedback reason is required.",
      });
    }

    const submission = await findSubmission(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    const connection = await findConnection(submission.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Associated collaboration not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can review and reject deliverables.",
        });
      }

      const userProfileId = String(req.user.id || req.user._id);
      if (String(connection.brandId) !== userProfileId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this campaign/collaboration.",
        });
      }
    }

    if (submission.status !== "SUBMITTED" && submission.status !== "RESUBMITTED") {
      return res.status(400).json({
        success: false,
        message: `Submission is already ${submission.status} and cannot be rejected.`,
      });
    }

    const now = Date.now();
    await query(
      `UPDATE submissions 
       SET status = 'REJECTED', rejection_reason = $1, rejected_at = $2, updated_at = NOW() 
       WHERE id = $3`,
      [reasonText, now, submission.id]
    );

    const appRes = await query(
      `SELECT COUNT(*)::int as count FROM submissions 
       WHERE connection_id = $1 AND deliverable_type = $2 AND status = 'APPROVED'`,
      [connection.id, submission.deliverableType]
    );
    const approvedCountForType = appRes.rows[0]?.count || 0;

    let deliverablesTracking = connection.deliverablesTracking || [];
    const deliverableItem = deliverablesTracking.find((d) => d.type === submission.deliverableType);

    if (deliverableItem) {
      deliverableItem.completedQuantity = approvedCountForType;
      deliverableItem.status = "REJECTED";
      deliverableItem.updatedAt = now;
    }

    await query(
      `UPDATE connections SET deliverables_tracking = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(deliverablesTracking), connection.id]
    );

    const brandProfile = await findProfile(connection.brandId);
    const brandName = brandProfile?.fullName || "Brand";
    let campaignTitle = "campaign";
    if (connection.campaignId) {
      const camp = await query(`SELECT title FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      if (camp.rows[0]?.title) campaignTitle = camp.rows[0].title;
    }

    const rejectText = `${brandName} requested changes on your ${submission.deliverableType} (v${
      submission.version || 1
    }) for "${campaignTitle}". Reason: ${reasonText}`;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
       VALUES ($1, $2, 'deliverable_rejected', $3, '/collaborations', $4, NOW())`,
      [connection.creatorId, connection.brandId, rejectText, now]
    );

    sendPushToUser(connection.creatorId, {
      title: "Deliverable Feedback / Changes Requested ⚠️",
      body: rejectText,
      url: "/collaborations",
    }).catch((err) => console.error("Deliverable rejection push error:", err.message));

    // Post to chat
    try {
      const convRes = await query(
        `SELECT id FROM conversations 
         WHERE creator_id = $1 AND brand_id = $2 
           AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
         LIMIT 1`,
        [connection.creatorId, connection.brandId, connection.campaignId || null]
      );
      if (convRes.rows.length > 0) {
        await query(
          `INSERT INTO messages (conversation_id, sender_id, text, message_type, metadata, read)
           VALUES ($1, $2, $3, 'deliverable_submission', $4::jsonb, false)`,
          [
            convRes.rows[0].id,
            connection.brandId,
            `[Deliverable Rejected] ${brandName} requested rework on ${submission.deliverableType} (v${
              submission.version || 1
            }). Feedback: "${reasonText}".`,
            JSON.stringify({
              submissionId: submission.id,
              deliverableType: submission.deliverableType,
              contentUrl: submission.contentUrl,
              status: "REJECTED",
              version: submission.version || 1,
              rejectionReason: reasonText,
              reviewedAt: now,
            }),
          ]
        );
      }
    } catch (chatErr) {
      console.warn("Could not post rejection message to chat:", chatErr);
    }

    res.status(200).json({
      success: true,
      message: "Deliverable submission rejected.",
      data: {
        submission: {
          ...submission,
          status: "REJECTED",
          rejectionReason: reasonText,
          rejectedAt: now,
        },
        deliverablesTracking,
      },
    });
  } catch (error) {
    console.error("Reject deliverable submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject deliverable submission.",
      error: error.message,
    });
  }
};

// 5. Creator Rework & Resubmission (Creator only)
export const resubmitDeliverableContent = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Corrected deliverable file is required for resubmission.",
      });
    }

    const previousSubmission = await findSubmission(submissionId);
    if (!previousSubmission) {
      return res.status(404).json({
        success: false,
        message: "Previous submission not found.",
      });
    }

    const connection = await findConnection(previousSubmission.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Associated collaboration record not found.",
      });
    }

    if (req.user) {
      if (req.user.role !== "creator" && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only Creators can resubmit campaign deliverables.",
        });
      }

      const userProfileId = String(req.user.id || req.user._id);
      if (String(connection.creatorId) !== userProfileId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this collaboration/submission.",
        });
      }
    }

    if (previousSubmission.status !== "REJECTED") {
      return res.status(400).json({
        success: false,
        message: `Cannot rework submission with status "${previousSubmission.status}". Only REJECTED submissions can be reworked and resubmitted.`,
      });
    }

    const pendingRes = await query(
      `SELECT id FROM submissions 
       WHERE parent_submission_id = $1 AND status IN ('SUBMITTED', 'RESUBMITTED') 
       LIMIT 1`,
      [previousSubmission.id]
    );

    if (pendingRes.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "A resubmission for this deliverable is already awaiting Brand review.",
      });
    }

    if (connection.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Cannot resubmit deliverable: Collaboration is not in PAID status.",
      });
    }

    const newVersionNumber = (previousSubmission.version || 1) + 1;
    const reworkCount = (previousSubmission.reworkCount || 0) + 1;
    const contentUrl = getFileUrl(req.file);
    const now = Date.now();

    const insertSub = await query(
      `INSERT INTO submissions (
        connection_id, campaign_id, brand_id, creator_id, deliverable_id, deliverable_type,
        content_url, cloudinary_public_id, caption, status, version, parent_submission_id,
        rework_count, rejection_reason, resubmitted_at, submitted_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'RESUBMITTED', $10, $11, $12, '', $13, $13, NOW(), NOW())
      RETURNING *`,
      [
        connection.id,
        connection.campaignId || null,
        connection.brandId,
        connection.creatorId,
        previousSubmission.deliverableId || null,
        previousSubmission.deliverableType,
        contentUrl,
        req.file.filename || null,
        caption !== undefined ? caption : previousSubmission.caption,
        newVersionNumber,
        previousSubmission.id,
        reworkCount,
        now,
      ]
    );
    const newSubmission = formatSubmission(insertSub.rows[0]);

    const appRes = await query(
      `SELECT COUNT(*)::int as count FROM submissions 
       WHERE connection_id = $1 AND deliverable_type = $2 AND status = 'APPROVED'`,
      [connection.id, previousSubmission.deliverableType]
    );
    const approvedCountForType = appRes.rows[0]?.count || 0;

    let deliverablesTracking = connection.deliverablesTracking || [];
    const deliverableItem = deliverablesTracking.find(
      (d) => d.type === previousSubmission.deliverableType
    );

    if (deliverableItem) {
      deliverableItem.status = "RESUBMITTED";
      deliverableItem.completedQuantity = approvedCountForType;
      deliverableItem.updatedAt = now;
    }

    await query(
      `UPDATE connections SET deliverables_tracking = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(deliverablesTracking), connection.id]
    );

    const creatorProfile = await findProfile(connection.creatorId);
    const creatorName = creatorProfile?.fullName || "Creator";
    let campaignTitle = "campaign";
    if (connection.campaignId) {
      const camp = await query(`SELECT title FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      if (camp.rows[0]?.title) campaignTitle = camp.rows[0].title;
    }

    const notifText = `${creatorName} resubmitted ${previousSubmission.deliverableType} (v${newVersionNumber}) after rework for "${campaignTitle}".`;
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
       VALUES ($1, $2, 'deliverable_resubmitted', $3, '/collaborations', $4, NOW())`,
      [connection.brandId, connection.creatorId, notifText, now]
    );

    // Notify Admin
    const admins = await query(`SELECT id FROM profiles WHERE role = 'admin'`);
    for (const admin of admins.rows) {
      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at, created_at_dt)
         VALUES ($1, $2, 'deliverable_resubmitted', $3, '/admin/tasks', $4, NOW())`,
        [admin.id, connection.creatorId, notifText, now]
      );
    }

    // Post to chat
    try {
      const convRes = await query(
        `SELECT id FROM conversations 
         WHERE creator_id = $1 AND brand_id = $2 
           AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
         LIMIT 1`,
        [connection.creatorId, connection.brandId, connection.campaignId || null]
      );
      if (convRes.rows.length > 0) {
        await query(
          `INSERT INTO messages (conversation_id, sender_id, text, message_type, metadata, read)
           VALUES ($1, $2, $3, 'deliverable_submission', $4::jsonb, false)`,
          [
            convRes.rows[0].id,
            connection.creatorId,
            `[Deliverable Resubmitted] ${creatorName} resubmitted ${previousSubmission.deliverableType} (v${newVersionNumber}) after rework. Status: RESUBMITTED.`,
            JSON.stringify({
              submissionId: newSubmission.id,
              parentSubmissionId: previousSubmission.id,
              deliverableType: previousSubmission.deliverableType,
              contentUrl,
              caption: caption || "",
              status: "RESUBMITTED",
              version: newVersionNumber,
              reworkCount,
              resubmittedAt: now,
            }),
          ]
        );
      }
    } catch (chatErr) {
      console.warn("Could not post resubmission message to chat:", chatErr);
    }

    res.status(201).json({
      success: true,
      message: `Deliverable ${previousSubmission.deliverableType} v${newVersionNumber} resubmitted successfully.`,
      data: {
        submission: newSubmission,
        deliverablesTracking,
      },
    });
  } catch (error) {
    console.error("Resubmit deliverable error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resubmit deliverable content.",
      error: error.message,
    });
  }
};

// 6. Delete Deliverable Submission
export const deleteDeliverableSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await findSubmission(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    const connection = await findConnection(submission.connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Associated collaboration record not found.",
      });
    }

    if (req.user) {
      const userProfileId = String(req.user.id || req.user._id);
      const isCreator = String(submission.creatorId) === userProfileId;
      const isBrand = String(submission.brandId) === userProfileId;
      const isAdmin = req.user.role === "admin";

      if (!isCreator && !isBrand && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have permission to delete this submission.",
        });
      }

      if (submission.status === "APPROVED" && isCreator && !isAdmin) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete an approved deliverable. Please contact the brand or support.",
        });
      }
    }

    await query(`DELETE FROM submissions WHERE id = $1`, [submission.id]);

    const now = Date.now();
    const appRes = await query(
      `SELECT COUNT(*)::int as count FROM submissions 
       WHERE connection_id = $1 AND deliverable_type = $2 AND status = 'APPROVED'`,
      [connection.id, submission.deliverableType]
    );
    const approvedCountForType = appRes.rows[0]?.count || 0;

    const subCountRes = await query(
      `SELECT COUNT(*)::int as count FROM submissions 
       WHERE connection_id = $1 AND deliverable_type = $2 AND status IN ('SUBMITTED', 'RESUBMITTED')`,
      [connection.id, submission.deliverableType]
    );
    const submittedCountForType = subCountRes.rows[0]?.count || 0;

    let deliverablesTracking = connection.deliverablesTracking || [];
    const deliverableItem = deliverablesTracking.find((d) => d.type === submission.deliverableType);

    if (deliverableItem) {
      deliverableItem.completedQuantity = approvedCountForType;
      if (approvedCountForType >= deliverableItem.requiredQuantity) {
        deliverableItem.status = "COMPLETED";
      } else if (submittedCountForType > 0) {
        deliverableItem.status = "SUBMITTED";
      } else if (approvedCountForType > 0) {
        deliverableItem.status = "IN_PROGRESS";
      } else {
        deliverableItem.status = "PENDING";
      }
      deliverableItem.updatedAt = now;
    }

    const allApproved =
      deliverablesTracking.length > 0 &&
      deliverablesTracking.every(
        (deliv) => (deliv.completedQuantity || 0) >= (deliv.requiredQuantity || 1)
      );

    let approvalCompletedAt = connection.approvalCompletedAt;
    let paymentReleaseEligibleAt = connection.paymentReleaseEligibleAt;
    let paymentReleaseStatus = connection.paymentReleaseStatus;

    if (!allApproved) {
      approvalCompletedAt = null;
      paymentReleaseEligibleAt = null;
      paymentReleaseStatus = "NOT_STARTED";
    }

    await query(
      `UPDATE connections
       SET deliverables_tracking = $1::jsonb,
           all_deliverables_completed = $2,
           approval_completed_at = $3,
           payment_release_eligible_at = $4,
           payment_release_status = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        JSON.stringify(deliverablesTracking),
        allApproved,
        approvalCompletedAt,
        paymentReleaseEligibleAt,
        paymentReleaseStatus,
        connection.id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Submission deleted successfully.",
      data: {
        deletedSubmissionId: submissionId,
        deliverablesTracking,
        allDeliverablesCompleted: allApproved,
      },
    });
  } catch (error) {
    console.error("Delete submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete submission.",
      error: error.message,
    });
  }
};
