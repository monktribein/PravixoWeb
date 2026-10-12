import { query } from "../config/postgres.js";
import {
  formatPayment,
  formatConnection,
  formatCampaign,
  formatProfile,
  formatConversation,
  formatBankDetails,
} from "../utils/formatters.js";
import {
  createOrder,
  verifySignature,
  capturePayment,
  refundPayment as refundPaymentService,
  verifyWebhookSignature,
  createPayout,
} from "../services/paymentServices.js";
import { sendPushToUser } from "../utils/webPush.js";
import { reversePayoutAndReferralCommission } from "../services/referralService.js";

const HOLDING_DURATION = 72 * 60 * 60 * 1000;

// Helper: Find Profile
const findProfile = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [String(idOrUserId)]
  );
  return res.rows[0] ? formatProfile(res.rows[0]) : null;
};

// Helper: Find Payment
const findPayment = async (id) => {
  if (!id) return null;
  const res = await query(`SELECT * FROM payments WHERE id::text = $1 LIMIT 1`, [String(id)]);
  return res.rows[0] ? formatPayment(res.rows[0]) : null;
};

// Helper: Find Connection
const findConnection = async (id) => {
  if (!id) return null;
  const res = await query(`SELECT * FROM connections WHERE id::text = $1 LIMIT 1`, [String(id)]);
  return res.rows[0] ? formatConnection(res.rows[0]) : null;
};

// Helper: Create Payment Audit Log
const createAuditLog = async ({ paymentId, action, details }) => {
  try {
    const detailsJson =
      typeof details === "object" ? JSON.stringify(details) : JSON.stringify({ message: details });
    await query(
      `INSERT INTO payment_audit_logs (payment_id, action, details, created_at)
       VALUES ($1, $2, $3::jsonb, NOW())`,
      [paymentId || null, action, detailsJson]
    );
  } catch (err) {
    console.warn("createAuditLog error:", err.message);
  }
};

// Helper: Create Notification & Dispatch Web Push
const createNotification = async ({
  recipientId,
  senderId,
  type,
  text,
  taskId,
  targetUrl,
}) => {
  try {
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, task_id, target_url, read, created_at, created_at_dt)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7, NOW())`,
      [
        recipientId,
        senderId || null,
        type,
        text,
        taskId || null,
        targetUrl || "/dashboard",
        Date.now(),
      ]
    );

    if (recipientId) {
      let pushTitle = "Pravixo Payment Update 💳";
      if (type === "payment_successful" || type === "new_payment") pushTitle = "Payment Received! 💰";
      else if (type === "payment_released") pushTitle = "Funds Released! 🎉";
      else if (type === "dispute_raised") pushTitle = "Dispute Flagged ⚠️";

      sendPushToUser(recipientId, {
        title: pushTitle,
        body: text,
        url: targetUrl || "/dashboard",
      }).catch((err) => console.error("Payment push error:", err.message));
    }
  } catch (err) {
    console.warn("createNotification error:", err.message);
  }
};

/*
|--------------------------------------------------------------------------
| 1. INITIATE PAYMENT ORDER
|--------------------------------------------------------------------------
*/
export const initiatePaymentOrder = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await findPayment(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (payment.paymentStatus !== "invoice_generated" && payment.paymentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Payment order can only be created for pending/generated invoices",
      });
    }

    const order = await createOrder({
      amount: payment.grossAmount,
      currency: payment.currency,
      receiptId: payment.invoiceNumber,
    });

    await query(
      `UPDATE payments 
       SET gateway_order_id = $1, payment_status = 'pending', updated_at = NOW() 
       WHERE id = $2`,
      [order.id, payment.id]
    );

    await createAuditLog({
      paymentId: payment.id,
      action: "Payment Initiated",
      details: `Razorpay Order ${order.id} initiated for checkout.`,
    });

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("initiatePaymentOrder:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 2. VERIFY PAYMENT SIGNATURE
|--------------------------------------------------------------------------
*/
export const verifyPaymentSignatureController = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;

    if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification data is incomplete",
      });
    }

    const payment = await findPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (payment.gatewayOrderId !== gatewayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Gateway order ID does not match",
      });
    }

    const valid = verifySignature({
      orderId: gatewayOrderId,
      paymentId: gatewayPaymentId,
      signature: gatewaySignature,
    });

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature",
      });
    }

    let captureStatus = "captured";
    let captureMethod = "card";
    try {
      const capture = await capturePayment({
        paymentId: gatewayPaymentId,
        amount: payment.grossAmount,
        currency: payment.currency,
      });
      captureStatus = capture.status || "captured";
      captureMethod = capture.method || "card";
    } catch (capErr) {
      console.warn("Capture note:", capErr.message);
    }

    const now = Date.now();
    const holdingEndsAt = now + HOLDING_DURATION;

    await query(
      `UPDATE payments
       SET gateway_payment_id = $1,
           gateway_signature = $2,
           gateway_status = $3,
           invoice_status = 'paid',
           payment_status = 'holding',
           holding_status = 'holding',
           holding_started_at = $4,
           holding_ends_at = $5,
           transaction_reference = $6,
           payment_method = $7,
           updated_at = NOW()
       WHERE id = $8`,
      [
        gatewayPaymentId,
        gatewaySignature,
        captureStatus,
        now,
        holdingEndsAt,
        `TXN-${gatewayPaymentId}`,
        captureMethod,
        payment.id,
      ]
    );

    await createAuditLog({
      paymentId: payment.id,
      action: "Payment Verified",
      details: `Razorpay Signature Verified. Txn ref: ${gatewayPaymentId}`,
    });

    await createAuditLog({
      paymentId: payment.id,
      action: "Holding Started",
      details: "Escrow funds locked in holding. 72-hour countdown dispute timer started.",
    });

    await createNotification({
      recipientId: payment.brandId,
      senderId: payment.creatorId,
      type: "payment_successful",
      text: `Escrow payment of ₹${payment.grossAmount.toLocaleString()} successful. Ref: ${gatewayPaymentId}`,
    });

    await createNotification({
      recipientId: payment.creatorId,
      senderId: payment.brandId,
      type: "payment_secured",
      text: `Escrow payout of ₹${payment.creatorAmount.toLocaleString()} secured in holding.`,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("verifyPaymentSignature:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 3. RAISE DISPUTE
|--------------------------------------------------------------------------
*/
export const raiseDispute = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await findPayment(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (payment.paymentStatus !== "holding") {
      return res.status(400).json({
        success: false,
        message: "Dispute can only be raised during active escrow holds.",
      });
    }

    await query(
      `UPDATE payments 
       SET payment_status = 'disputed', holding_status = 'disputed', updated_at = NOW() 
       WHERE id = $1`,
      [payment.id]
    );

    await createAuditLog({
      paymentId: payment.id,
      action: "Dispute Raised",
      details: "Escrow dispute requested by Brand. Release countdown paused.",
    });

    await createNotification({
      recipientId: payment.brandId,
      senderId: payment.brandId,
      type: "dispute_raised",
      text: `Brand raised dispute on Payment: ${payment.id}`,
    });

    return res.status(200).json({
      success: true,
      message: "Dispute raised successfully",
    });
  } catch (error) {
    console.error("raiseDispute:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 4. RAZORPAY WEBHOOK
|--------------------------------------------------------------------------
*/
export const handleWebhookEvent = async (req, res) => {
  const rawBody = req.body;

  try {
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Webhook signature missing",
      });
    }

    const isValid = verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const payloadString = Buffer.isBuffer(rawBody) ? rawBody.toString() : JSON.stringify(rawBody);
    const parsed = JSON.parse(payloadString);
    const event = parsed.event;
    const now = Date.now();

    await query(
      `INSERT INTO webhook_logs (event_type, payload, status, created_at)
       VALUES ($1, $2::jsonb, 'processed', NOW())`,
      [event, payloadString]
    );

    const payloadObj = parsed.payload || parsed;
    const paymentEntity = payloadObj?.payment?.entity;
    const orderEntity = payloadObj?.order?.entity;
    const refundEntity = payloadObj?.refund?.entity;
    const orderId = paymentEntity?.order_id || orderEntity?.id;

    if (
      event === "payment.authorized" ||
      event === "payment.captured" ||
      event === "order.paid"
    ) {
      if (orderId) {
        const payRes = await query(
          `SELECT * FROM payments WHERE gateway_order_id = $1 LIMIT 1`,
          [orderId]
        );
        if (payRes.rows.length > 0) {
          const payment = formatPayment(payRes.rows[0]);
          if (payment.paymentStatus !== "completed" && payment.paymentStatus !== "holding") {
            const payId = paymentEntity?.id || payment.gatewayPaymentId || "pay_webhook";
            const holdingEndsAt = now + HOLDING_DURATION;

            await query(
              `UPDATE payments
               SET gateway_payment_id = $1,
                   gateway_status = $2,
                   payment_status = 'holding',
                   holding_status = 'holding',
                   holding_started_at = $3,
                   holding_ends_at = $4,
                   payment_method = $5,
                   updated_at = NOW()
               WHERE id = $6`,
              [
                payId,
                paymentEntity?.status || "captured",
                now,
                holdingEndsAt,
                paymentEntity?.method || "card",
                payment.id,
              ]
            );

            await createAuditLog({
              paymentId: payment.id,
              action: "Payment Captured",
              details: `Webhook ${event} captured transaction successfully. Ref: ${payId}`,
            });
          }
        }
      }
    } else if (event === "payment.failed") {
      if (orderId) {
        await query(
          `UPDATE payments 
           SET payment_status = 'pending', gateway_status = 'failed', updated_at = NOW() 
           WHERE gateway_order_id = $1`,
          [orderId]
        );
      }
    } else if (event === "refund.processed") {
      const gatewayPaymentId = refundEntity?.payment_id || paymentEntity?.id;
      if (gatewayPaymentId) {
        const payRes = await query(
          `SELECT * FROM payments WHERE gateway_payment_id = $1 LIMIT 1`,
          [gatewayPaymentId]
        );
        if (payRes.rows.length > 0) {
          const payment = formatPayment(payRes.rows[0]);
          const refAmt = refundEntity?.amount ? refundEntity.amount / 100 : payment.grossAmount;
          await query(
            `UPDATE payments 
             SET payment_status = 'refunded', holding_status = 'refunded', refund_status = 'processed',
                 refund_amount = $1, updated_at = NOW() 
             WHERE id = $2`,
            [refAmt, payment.id]
          );
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("handleWebhookEvent:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};

/*
|--------------------------------------------------------------------------
| 5. SAVE CREATOR BANK DETAILS
|--------------------------------------------------------------------------
*/
export const saveCreatorBankDetails = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      email,
      bankName,
      accountHolderName,
      accountNumber,
      confirmAccountNumber,
      ifsc,
      upiId,
      panNumber,
    } = req.body;

    if (
      !fullName ||
      !phone ||
      !email ||
      !bankName ||
      !accountHolderName ||
      !accountNumber ||
      !confirmAccountNumber ||
      !ifsc ||
      !panNumber
    ) {
      return res.status(400).json({
        success: false,
        message: "All required bank details are required",
      });
    }

    if (accountNumber !== confirmAccountNumber) {
      return res.status(400).json({
        success: false,
        message: "Bank account numbers do not match",
      });
    }

    if (ifsc.trim().length !== 11) {
      return res.status(400).json({
        success: false,
        message: "IFSC code must be exactly 11 characters",
      });
    }

    if (panNumber.trim().length !== 10) {
      return res.status(400).json({
        success: false,
        message: "PAN Card Number must be exactly 10 characters",
      });
    }

    const creatorId = req.user?.profileId || req.user?.id || req.user?._id;
    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user access",
      });
    }

    const profile = await findProfile(creatorId);
    const creatorUuid = profile?.id || creatorId;

    const existingRes = await query(
      `SELECT id FROM creator_bank_details WHERE creator_id::text = $1 LIMIT 1`,
      [creatorUuid]
    );

    if (existingRes.rows.length > 0) {
      await query(
        `UPDATE creator_bank_details
         SET full_name = $1, phone = $2, email = $3, bank_name = $4,
             account_holder_name = $5, account_number = $6, ifsc = $7,
             upi_id = $8, pan_number = $9, updated_at = NOW()
         WHERE id = $10`,
        [
          fullName.trim(),
          phone.trim(),
          email.trim(),
          bankName.trim(),
          accountHolderName.trim(),
          accountNumber.trim(),
          ifsc.trim().toUpperCase(),
          upiId?.trim() || null,
          panNumber.trim().toUpperCase(),
          existingRes.rows[0].id,
        ]
      );

      return res.status(200).json({
        success: true,
        id: existingRes.rows[0].id,
        message: "Bank details updated successfully",
      });
    }

    const insertRes = await query(
      `INSERT INTO creator_bank_details (
        creator_id, full_name, phone, email, bank_name, account_holder_name,
        account_number, ifsc, upi_id, pan_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        creatorUuid,
        fullName.trim(),
        phone.trim(),
        email.trim(),
        bankName.trim(),
        accountHolderName.trim(),
        accountNumber.trim(),
        ifsc.trim().toUpperCase(),
        upiId?.trim() || null,
        panNumber.trim().toUpperCase(),
      ]
    );

    return res.status(200).json({
      success: true,
      id: insertRes.rows[0].id,
      message: "Bank details saved successfully",
    });
  } catch (error) {
    console.error("saveCreatorBankDetails:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 6. GET CREATOR BANK DETAILS
|--------------------------------------------------------------------------
*/
export const getCreatorBankDetails = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const profile = await findProfile(creatorId);
    const creatorUuid = profile?.id || creatorId;

    const resDb = await query(
      `SELECT * FROM creator_bank_details WHERE creator_id::text = $1 LIMIT 1`,
      [creatorUuid]
    );

    return res.status(200).json({
      success: true,
      data: resDb.rows[0] ? formatBankDetails(resDb.rows[0]) : null,
    });
  } catch (error) {
    console.error("getCreatorBankDetails:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 7. GET PAYMENTS FOR BRAND
|--------------------------------------------------------------------------
*/
export const getPaymentsForBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const profile = await findProfile(brandId);
    const brandUuid = profile?.id || brandId;

    const paymentsRes = await query(
      `SELECT p.*, 
              row_to_json(c.*) as campaign,
              row_to_json(cr.*) as creator
       FROM payments p
       LEFT JOIN campaigns c ON p.campaign_id = c.id
       LEFT JOIN profiles cr ON p.creator_id = cr.id
       WHERE p.brand_id::text = $1
       ORDER BY p.created_at DESC`,
      [brandUuid]
    );

    const paymentIds = paymentsRes.rows.map((p) => p.id);
    let auditLogs = [];
    if (paymentIds.length > 0) {
      const auditRes = await query(
        `SELECT * FROM payment_audit_logs WHERE payment_id = ANY($1::uuid[])`,
        [paymentIds]
      );
      auditLogs = auditRes.rows;
    }

    const result = paymentsRes.rows.map((row) => {
      const p = formatPayment(row);
      return {
        ...p,
        campaign: row.campaign ? formatCampaign(row.campaign) : null,
        creator: row.creator ? formatProfile(row.creator) : null,
        auditLogs: auditLogs.filter((log) => String(log.payment_id) === String(p.id)),
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("getPaymentsForBrand:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 8. GET PAYMENTS FOR CREATOR
|--------------------------------------------------------------------------
*/
export const getPaymentsForCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const profile = await findProfile(creatorId);
    const creatorUuid = profile?.id || creatorId;

    const paymentsRes = await query(
      `SELECT p.*, 
              row_to_json(c.*) as campaign,
              row_to_json(b.*) as brand
       FROM payments p
       LEFT JOIN campaigns c ON p.campaign_id = c.id
       LEFT JOIN profiles b ON p.brand_id = b.id
       WHERE p.creator_id::text = $1
       ORDER BY p.created_at DESC`,
      [creatorUuid]
    );

    const paymentIds = paymentsRes.rows.map((p) => p.id);
    let auditLogs = [];
    if (paymentIds.length > 0) {
      const auditRes = await query(
        `SELECT * FROM payment_audit_logs WHERE payment_id = ANY($1::uuid[])`,
        [paymentIds]
      );
      auditLogs = auditRes.rows;
    }

    const result = paymentsRes.rows.map((row) => {
      const p = formatPayment(row);
      return {
        ...p,
        campaign: row.campaign ? formatCampaign(row.campaign) : null,
        brand: row.brand ? formatProfile(row.brand) : null,
        auditLogs: auditLogs.filter((log) => String(log.payment_id) === String(p.id)),
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("getPaymentsForCreator:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 9. RELEASE SINGLE HOLDING PAYMENT
|--------------------------------------------------------------------------
*/
export const releaseHoldingPayment = async (payment) => {
  const bankRes = await query(
    `SELECT * FROM creator_bank_details WHERE creator_id::text = $1 LIMIT 1`,
    [payment.creatorId]
  );
  const bankDetails = bankRes.rows[0];

  if (!bankDetails) {
    throw new Error("Creator bank details not found");
  }

  const payout = await createPayout({
    bankDetails: formatBankDetails(bankDetails),
    amount: payment.creatorAmount,
  });

  const now = Date.now();

  await query(
    `UPDATE payments
     SET payment_status = 'completed',
         holding_status = 'released',
         released_at = $1,
         payout_status = 'processed',
         payout_reference = $2,
         creator_bank_account_id = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [now, payout.referenceId, bankDetails.id, payment.id]
  );

  await createAuditLog({
    paymentId: payment.id,
    action: "Released",
    details: "Milestone hold cleared. Escrow funds marked Ready to Release.",
  });

  await createAuditLog({
    paymentId: payment.id,
    action: "Completed",
    details: `Payout completed to bank account: ref ${payout.referenceId}`,
  });

  await createNotification({
    recipientId: payment.creatorId,
    senderId: payment.brandId,
    type: "payment_released",
    text: `Escrow payout of ₹${payment.creatorAmount.toLocaleString()} has been credited to your bank account.`,
  });

  await createNotification({
    recipientId: payment.brandId,
    senderId: payment.creatorId,
    type: "payment_released",
    text: `Escrow payment of ₹${payment.grossAmount.toLocaleString()} has been released to Creator.`,
  });

  return payout;
};

/*
|--------------------------------------------------------------------------
| 10. CHECK AND RELEASE EXPIRED PAYMENTS
|--------------------------------------------------------------------------
*/
export const checkAndReleasePayments = async () => {
  const now = Date.now();
  const resDb = await query(
    `SELECT * FROM payments 
     WHERE payment_status = 'holding' 
       AND holding_status = 'holding' 
       AND holding_ends_at <= $1`,
    [now]
  );

  const results = [];
  for (const row of resDb.rows) {
    const payment = formatPayment(row);
    try {
      const payout = await releaseHoldingPayment(payment);
      results.push({ paymentId: payment.id, success: true, payout });
    } catch (error) {
      console.error(`Payout failed for payment ${payment.id}:`, error);
      await query(
        `UPDATE payments SET payout_status = 'failed', updated_at = NOW() WHERE id = $1`,
        [payment.id]
      );
      results.push({ paymentId: payment.id, success: false, error: error.message });
    }
  }

  return results;
};

/*
|--------------------------------------------------------------------------
| 11. REFUND PAYMENT
|--------------------------------------------------------------------------
*/
export const refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await findPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (!payment.gatewayPaymentId) {
      return res.status(400).json({
        success: false,
        message: "Gateway payment ID not available",
      });
    }

    const refundAmount = amount || payment.grossAmount;
    if (Number(refundAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Refund amount must be greater than zero",
      });
    }

    const refund = await refundPaymentService({
      paymentId: payment.gatewayPaymentId,
      amount: refundAmount,
      reason: reason || "Payment refund",
    });

    const now = Date.now();

    await query(
      `UPDATE payments
       SET refund_status = 'processed',
           refund_amount = $1,
           refund_reason = $2,
           payment_status = 'refunded',
           holding_status = 'refunded',
           updated_at = NOW()
       WHERE id = $3`,
      [refund.amount, reason || "Payment refund", payment.id]
    );

    await createAuditLog({
      paymentId: payment.id,
      action: "Refund Processed",
      details: `Refund processed. Refund ref: ${refund.id}`,
    });

    // Automatically reverse payout and linked referral commission if needed
    try {
      const targetPayoutId = payment.payoutReference || payment.id;
      await reversePayoutAndReferralCommission({ payout_id: targetPayoutId });
    } catch (revErr) {
      console.warn("Refund auto-reversal warning:", revErr.message);
    }

    return res.status(200).json({ success: true, data: refund });
  } catch (error) {
    console.error("refundPayment:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 12. INITIATE COLLABORATION PAYMENT (TASK 4)
|--------------------------------------------------------------------------
*/
export const initiateCollaborationPayment = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await findConnection(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found",
      });
    }

    // Security: Brand Ownership
    if (req.user) {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can pay for collaborations",
        });
      }

      if (
        String(connection.brandId) !== String(req.user._id) &&
        String(connection.brandId) !== String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this collaboration",
        });
      }
    }

    // Auto-derive AMOUNT_AGREED status if not set
    if (connection.collaborationStatus !== "AMOUNT_AGREED") {
      let finalBrandTotal = connection.proposedAmount || connection.brandTotal || 0;
      if (!finalBrandTotal && connection.campaignId) {
        const camp = await query(`SELECT * FROM campaigns WHERE id = $1 LIMIT 1`, [
          connection.campaignId,
        ]);
        const campData = camp.rows[0];
        finalBrandTotal =
          Number(campData?.min_budget_per_creator) || Number(campData?.total_budget) || 0;
      }
      if (finalBrandTotal > 0) {
        const fee = Math.round(finalBrandTotal * 0.2);
        await query(
          `UPDATE connections
           SET brand_total = $1, pravixo_fee = $2, creator_amount = $3,
               collaboration_status = 'AMOUNT_AGREED', agreed_at = $4, updated_at = NOW()
           WHERE id = $5`,
          [finalBrandTotal, fee, finalBrandTotal - fee, Date.now(), connection.id]
        );
        connection.brandTotal = finalBrandTotal;
        connection.pravixoFee = fee;
        connection.creatorAmount = finalBrandTotal - fee;
      } else {
        return res.status(400).json({
          success: false,
          message: "Payment can only be initiated after collaboration amount is agreed.",
        });
      }
    }

    if (connection.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This collaboration has already been paid.",
      });
    }

    let creatorAmount = connection.creatorAmount;
    let pravixoFee = connection.pravixoFee || Math.round((connection.brandTotal || 0) * 0.2);
    let brandTotal = connection.brandTotal || creatorAmount + pravixoFee;

    if (!brandTotal || brandTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid agreed collaboration amount.",
      });
    }

    const invoiceNumber = `INV-${Date.now()}-${connection.id.toString().slice(-4).toUpperCase()}`;

    // Find conversation if any
    const convRes = await query(
      `SELECT id FROM conversations
       WHERE creator_id = $1 AND brand_id = $2
         AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
       LIMIT 1`,
      [connection.creatorId, connection.brandId, connection.campaignId || null]
    );
    const conversationId = convRes.rows[0]?.id || null;

    // Find or create Payment
    let payment = null;
    if (connection.paymentId) {
      payment = await findPayment(connection.paymentId);
    }

    if (!payment) {
      const insPay = await query(
        `INSERT INTO payments (
          campaign_id, conversation_id, connection_id, brand_id, creator_id,
          payment_gateway, invoice_number, invoice_status, currency, gross_amount,
          platform_commission_percentage, platform_commission_amount, creator_amount,
          payment_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'razorpay', $6, 'generated', 'INR', $7, 20, $8, $9, 'pending', NOW(), NOW())
        RETURNING *`,
        [
          connection.campaignId || null,
          conversationId,
          connection.id,
          connection.brandId,
          connection.creatorId,
          invoiceNumber,
          brandTotal,
          pravixoFee,
          creatorAmount,
        ]
      );
      payment = formatPayment(insPay.rows[0]);

      await query(`UPDATE connections SET payment_id = $1 WHERE id = $2`, [
        payment.id,
        connection.id,
      ]);
    } else {
      await query(
        `UPDATE payments
         SET gross_amount = $1, platform_commission_amount = $2, creator_amount = $3,
             payment_status = 'pending', invoice_status = 'generated', updated_at = NOW()
         WHERE id = $4`,
        [brandTotal, pravixoFee, creatorAmount, payment.id]
      );
    }

    const order = await createOrder({
      amount: brandTotal,
      currency: "INR",
      receiptId: invoiceNumber,
    });

    await query(
      `UPDATE payments SET gateway_order_id = $1, payment_status = 'pending', updated_at = NOW() WHERE id = $2`,
      [order.id, payment.id]
    );

    await query(
      `UPDATE connections SET payment_status = 'PAYMENT_INITIATED', updated_at = NOW() WHERE id = $1`,
      [connection.id]
    );

    await createAuditLog({
      paymentId: payment.id,
      action: "Payment Initiated",
      details: `Razorpay Order ${order.id} initiated for collaboration ${connection.id}. Amount: ₹${brandTotal}`,
    });

    return res.status(200).json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        creatorAmount,
        pravixoFee,
        brandTotal,
        key: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
      },
    });
  } catch (error) {
    console.error("initiateCollaborationPayment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initiate collaboration payment.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| 13. VERIFY COLLABORATION PAYMENT (TASK 4)
|--------------------------------------------------------------------------
*/
export const verifyCollaborationPayment = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;

    if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification credentials missing",
      });
    }

    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found",
      });
    }

    if (req.user) {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can verify payments",
        });
      }

      if (
        String(connection.brandId) !== String(req.user._id) &&
        String(connection.brandId) !== String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this collaboration",
        });
      }
    }

    if (connection.paymentStatus === "PAID") {
      return res.status(200).json({
        success: true,
        message: "Payment is already completed and verified.",
        data: { connection, paymentStatus: "PAID" },
      });
    }

    const payRes = await query(
      `SELECT * FROM payments WHERE connection_id::text = $1 AND gateway_order_id = $2 LIMIT 1`,
      [connection.id, gatewayOrderId]
    );

    if (payRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment record for this order was not found",
      });
    }
    const payment = formatPayment(payRes.rows[0]);

    const isValid = verifySignature({
      orderId: gatewayOrderId,
      paymentId: gatewayPaymentId,
      signature: gatewaySignature,
    });

    if (!isValid) {
      await query(`UPDATE connections SET payment_status = 'FAILED', updated_at = NOW() WHERE id = $1`, [
        connection.id,
      ]);
      await query(
        `UPDATE payments SET payment_status = 'pending', invoice_status = 'failed', updated_at = NOW() WHERE id = $1`,
        [payment.id]
      );
      await createAuditLog({
        paymentId: payment.id,
        action: "Payment Verification Failed",
        details: `Invalid signature for Order ${gatewayOrderId} and Payment ${gatewayPaymentId}.`,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid payment signature verification failed.",
      });
    }

    let captureStatus = "captured";
    try {
      const capture = await capturePayment({
        paymentId: gatewayPaymentId,
        amount: payment.grossAmount,
        currency: payment.currency || "INR",
      });
      captureStatus = capture.status || "captured";
    } catch (captureErr) {
      console.log("Payment capture response/note:", captureErr.message);
    }

    const now = Date.now();

    await query(
      `UPDATE payments
       SET gateway_payment_id = $1,
           gateway_signature = $2,
           gateway_status = $3,
           invoice_status = 'paid',
           payment_status = 'payment_successful',
           transaction_reference = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [gatewayPaymentId, gatewaySignature, captureStatus, `TXN-${gatewayPaymentId}`, payment.id]
    );

    // Snapshot deliverables tracking from campaign if needed
    let deliverablesTracking = connection.deliverablesTracking || [];
    if (deliverablesTracking.length === 0 && connection.campaignId) {
      const camp = await query(`SELECT * FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      if (camp.rows.length > 0) {
        const cData = camp.rows[0];
        const delivObj = typeof cData.deliverables === "string" ? JSON.parse(cData.deliverables) : cData.deliverables || {};
        const delivs = [];
        if (delivObj.reels > 0) delivs.push({ type: "REEL", requiredQuantity: delivObj.reels, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        if (delivObj.posts > 0) delivs.push({ type: "POST", requiredQuantity: delivObj.posts, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        if (delivObj.stories > 0) delivs.push({ type: "STORY", requiredQuantity: delivObj.stories, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        if (delivObj.videos > 0) delivs.push({ type: "VIDEO", requiredQuantity: delivObj.videos, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        deliverablesTracking = delivs;
      }
    }

    const updatedConnRes = await query(
      `UPDATE connections
       SET payment_status = 'PAID',
           collaboration_status = 'AMOUNT_AGREED',
           agreed_at = COALESCE(agreed_at, $1),
           paid_at = $1,
           deliverables_tracking = $2::jsonb,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [now, JSON.stringify(deliverablesTracking), connection.id]
    );
    const updatedConnection = formatConnection(updatedConnRes.rows[0]);

    await createAuditLog({
      paymentId: payment.id,
      action: "Payment Secured",
      details: `Payment of ₹${payment.grossAmount} (Creator: ₹${payment.creatorAmount}, Pravixo Fee: ₹${payment.platformCommissionAmount}) verified and marked PAID.`,
    });

    const brandProfile = await findProfile(connection.brandId);
    const brandName = brandProfile?.fullName || "Brand";

    let campaignTitle = "collaboration";
    if (connection.campaignId) {
      const campRes = await query(`SELECT title FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      if (campRes.rows[0]?.title) campaignTitle = campRes.rows[0].title;
    }

    await createNotification({
      recipientId: connection.creatorId,
      senderId: connection.brandId,
      type: "payment_secured",
      text: `${brandName} has successfully paid Pravixo ₹${payment.grossAmount.toLocaleString()} for "${campaignTitle}". You may now begin work on deliverables!`,
    });

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
           VALUES ($1, $2, $3, 'system', $4::jsonb, false)`,
          [
            convRes.rows[0].id,
            connection.brandId,
            `[Escrow Funded] 💳 ${brandName} deposited ₹${payment.grossAmount.toLocaleString()} to Pravixo Escrow for "${campaignTitle}". Creator payout of ₹${payment.creatorAmount.toLocaleString()} (after 20% platform fee) is now 100% secured. Creator can now start work!`,
            JSON.stringify({
              paymentId: payment.id,
              grossAmount: payment.grossAmount,
              creatorAmount: payment.creatorAmount,
              platformFee: payment.platformCommissionAmount,
              status: "PAID",
            }),
          ]
        );
      }
    } catch (chatErr) {
      console.warn("Could not post payment message to chat:", chatErr);
    }

    // Notify Admins
    const admins = await query(`SELECT id FROM profiles WHERE role = 'admin'`);
    for (const admin of admins.rows) {
      await createNotification({
        recipientId: admin.id,
        senderId: connection.brandId,
        type: "new_payment",
        text: `${brandName} successfully paid ₹${payment.grossAmount.toLocaleString()} for "${campaignTitle}".`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment successfully verified and completed.",
      data: {
        payment,
        connection: updatedConnection,
        paymentStatus: "PAID",
      },
    });
  } catch (error) {
    console.error("verifyCollaborationPayment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify collaboration payment.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| 14. PAY COLLABORATION WITH WALLET
|--------------------------------------------------------------------------
*/
export const payCollaborationWithWallet = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user?.profileId || req.user?.id || req.user?._id;

    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: "Collaboration not found" });
    }

    if (
      String(connection.brandId) !== String(userId) &&
      String(connection.brandId) !== String(req.user?.id)
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    if (connection.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This collaboration is already paid.",
      });
    }

    let creatorAmount = connection.creatorAmount;
    let pravixoFee = connection.pravixoFee || Math.round((connection.brandTotal || 0) * 0.2);
    let brandTotal = connection.brandTotal || creatorAmount + pravixoFee;

    if (!brandTotal || brandTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid agreed collaboration amount.",
      });
    }

    // Atomically deduct brand wallet balance
    const walletRes = await query(
      `UPDATE wallets
       SET available_balance = available_balance - $1,
           total_withdrawn = total_withdrawn + $1,
           updated_at = NOW()
       WHERE creator_id::text = $2 AND available_balance >= $1
       RETURNING *`,
      [brandTotal, String(userId)]
    );

    if (walletRes.rows.length === 0) {
      const curWallet = await query(
        `SELECT available_balance FROM wallets WHERE creator_id::text = $1 LIMIT 1`,
        [String(userId)]
      );
      const available = curWallet.rows[0]?.available_balance || 0;
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Total amount ₹${brandTotal.toLocaleString(
          "en-IN"
        )} required, but only ₹${Number(available).toLocaleString(
          "en-IN"
        )} available. Please add funds to your wallet first.`,
      });
    }
    const brandWallet = walletRes.rows[0];

    const now = Date.now();
    const invoiceNumber = `INV-${now}-${connection.id.toString().slice(-4).toUpperCase()}`;
    const txnRef = `WAL-${now}-${userId.toString().slice(-4).toUpperCase()}`;

    // Record wallet debit transaction
    await query(
      `INSERT INTO wallet_transactions (
        creator_id, collaboration_id, campaign_id, type, transaction_type,
        amount, currency, status, description, reference_id, balance_after
      ) VALUES ($1, $2, $3, 'DEBIT', 'escrow_payment', $4, 'INR', 'COMPLETED', $5, $6, $7)`,
      [
        connection.brandId,
        connection.id,
        connection.campaignId || null,
        brandTotal,
        "Escrow payment funded via Wallet for collaboration",
        txnRef,
        brandWallet.available_balance,
      ]
    );

    // Create or update Payment
    const existingPay = await query(
      `SELECT id FROM payments WHERE connection_id::text = $1 LIMIT 1`,
      [connection.id]
    );
    let payment;
    if (existingPay.rows.length === 0) {
      const insPay = await query(
        `INSERT INTO payments (
          campaign_id, connection_id, brand_id, creator_id, payment_gateway,
          invoice_number, invoice_status, currency, gross_amount, platform_commission_percentage,
          platform_commission_amount, creator_amount, payment_status, transaction_reference,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'wallet', $5, 'paid', 'INR', $6, 20, $7, $8, 'payment_successful', $9, NOW(), NOW())
        RETURNING *`,
        [
          connection.campaignId || null,
          connection.id,
          connection.brandId,
          connection.creatorId,
          invoiceNumber,
          brandTotal,
          pravixoFee,
          creatorAmount,
          txnRef,
        ]
      );
      payment = formatPayment(insPay.rows[0]);
    } else {
      const updPay = await query(
        `UPDATE payments
         SET gross_amount = $1, platform_commission_amount = $2, creator_amount = $3,
             invoice_status = 'paid', payment_status = 'payment_successful',
             transaction_reference = $4, payment_gateway = 'wallet', updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [brandTotal, pravixoFee, creatorAmount, txnRef, existingPay.rows[0].id]
      );
      payment = formatPayment(updPay.rows[0]);
    }

    // Update connection
    let deliverablesTracking = connection.deliverablesTracking || [];
    if (deliverablesTracking.length === 0 && connection.campaignId) {
      const camp = await query(`SELECT deliverables FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      if (camp.rows.length > 0) {
        const delivObj = typeof camp.rows[0].deliverables === "string" ? JSON.parse(camp.rows[0].deliverables) : camp.rows[0].deliverables || {};
        const delivs = [];
        if (delivObj.reels > 0) delivs.push({ type: "REEL", requiredQuantity: delivObj.reels, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        if (delivObj.posts > 0) delivs.push({ type: "POST", requiredQuantity: delivObj.posts, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        if (delivObj.stories > 0) delivs.push({ type: "STORY", requiredQuantity: delivObj.stories, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        if (delivObj.videos > 0) delivs.push({ type: "VIDEO", requiredQuantity: delivObj.videos, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        deliverablesTracking = delivs;
      }
    }

    const updConnRes = await query(
      `UPDATE connections
       SET payment_id = $1, payment_status = 'PAID', collaboration_status = 'AMOUNT_AGREED',
           agreed_at = COALESCE(agreed_at, $2), paid_at = $2,
           deliverables_tracking = $3::jsonb, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [payment.id, now, JSON.stringify(deliverablesTracking), connection.id]
    );
    const updatedConnection = formatConnection(updConnRes.rows[0]);

    const brandProfile = await findProfile(connection.brandId);
    const brandName = brandProfile?.fullName || "Brand";

    let campaignTitle = "collaboration";
    if (connection.campaignId) {
      const camp = await query(`SELECT title FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      if (camp.rows[0]?.title) campaignTitle = camp.rows[0].title;
    }

    await createNotification({
      recipientId: connection.creatorId,
      senderId: connection.brandId,
      type: "payment_secured",
      text: `${brandName} funded Pravixo Escrow with ₹${brandTotal.toLocaleString(
        "en-IN"
      )} via Brand Wallet for "${campaignTitle}". You can now begin work!`,
    });

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
           VALUES ($1, $2, $3, 'system', $4::jsonb, false)`,
          [
            convRes.rows[0].id,
            connection.brandId,
            `[Escrow Funded] 💳 ${brandName} paid ₹${brandTotal.toLocaleString(
              "en-IN"
            )} via Brand Wallet to Pravixo Escrow for "${campaignTitle}". Creator payout of ₹${creatorAmount.toLocaleString(
              "en-IN"
            )} is 100% secured!`,
            JSON.stringify({
              paymentId: payment.id,
              grossAmount: brandTotal,
              creatorAmount,
              platformFee: pravixoFee,
              status: "PAID",
              paidVia: "wallet",
            }),
          ]
        );
      }
    } catch (chatErr) {
      console.log("Chat error:", chatErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Paid successfully using Wallet balance!",
      data: {
        connection: updatedConnection,
        payment,
        wallet: brandWallet,
      },
    });
  } catch (err) {
    console.error("payCollaborationWithWallet error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to pay using wallet.",
    });
  }
};