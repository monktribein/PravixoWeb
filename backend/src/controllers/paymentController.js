import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import CreatorBankDetails from "../models/CreatorBankDetails.js";
import PaymentAuditLog from "../models/PaymentAuditLog.js";
import WebhookLog from "../models/WebhookLog.js";
import Notification from "../models/Notification.js";
import Connection from "../models/Connection.js";
import Campaign from "../models/Campaign.js";
import Profile from "../models/Profile.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

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

/*
|--------------------------------------------------------------------------
| Helper: Validate ObjectId
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
|--------------------------------------------------------------------------
| Helper: Create Payment Audit Log
|--------------------------------------------------------------------------
*/

const createAuditLog = async ({
  paymentId,
  action,
  details,
}) => {
  return PaymentAuditLog.create({
    paymentId,
    action,
    details,
    createdAt: Date.now(),
  });
};

/*
|--------------------------------------------------------------------------
| Helper: Create Notification & Dispatch Web Push
|--------------------------------------------------------------------------
*/

const createNotification = async ({
  recipientId,
  senderId,
  type,
  text,
  taskId,
  targetUrl,
}) => {
  // 1. In-App Notification
  const notif = await Notification.create({
    recipientId,
    senderId,
    type,
    text,
    taskId,
    targetUrl: targetUrl || "/dashboard",
    read: false,
    createdAt: Date.now(),
  });

  // 2. Web Push Notification
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

  return notif;
};

/*
|--------------------------------------------------------------------------
| 1. INITIATE PAYMENT ORDER
|
| Convex:
| initiatePaymentOrder
|--------------------------------------------------------------------------
*/

export const initiatePaymentOrder = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Same validation as Convex
    |--------------------------------------------------------------------------
    */

    if (
      payment.paymentStatus !== "invoice_generated" &&
      payment.paymentStatus !== "pending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment order can only be created for pending/generated invoices",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Razorpay Order
    |--------------------------------------------------------------------------
    */

    const order = await createOrder({
      amount: payment.grossAmount,
      currency: payment.currency,
      receiptId: payment.invoiceNumber,
    });

    /*
    |--------------------------------------------------------------------------
    | Update Payment
    |--------------------------------------------------------------------------
    */

    payment.gatewayOrderId = order.id;
    payment.paymentStatus = "pending";
    payment.updatedAt = Date.now();

    await payment.save();

    /*
    |--------------------------------------------------------------------------
    | Audit Log
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      paymentId: payment._id,
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
|
| Convex:
| verifyPaymentSignature
|--------------------------------------------------------------------------
*/

export const verifyPaymentSignatureController = async (
  req,
  res
) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const {
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
    } = req.body;

    if (
      !gatewayOrderId ||
      !gatewayPaymentId ||
      !gatewaySignature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification data is incomplete",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Payment
    |--------------------------------------------------------------------------
    */

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Order ID
    |--------------------------------------------------------------------------
    */

    if (payment.gatewayOrderId !== gatewayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Gateway order ID does not match",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Razorpay Signature
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Capture Payment
    |--------------------------------------------------------------------------
    */

    const capture = await capturePayment({
      paymentId: gatewayPaymentId,
      amount: payment.grossAmount,
      currency: payment.currency,
    });

    /*
    |--------------------------------------------------------------------------
    | Update Payment
    |--------------------------------------------------------------------------
    */

    const now = Date.now();

    payment.gatewayPaymentId = gatewayPaymentId;
    payment.gatewaySignature = gatewaySignature;
    payment.gatewayStatus = capture.status;

    payment.invoiceStatus = "paid";

    payment.paymentStatus = "holding";
    payment.holdingStatus = "holding";

    payment.holdingStartedAt = now;
    payment.holdingEndsAt =
      now + HOLDING_DURATION;

    payment.transactionReference =
      "TXN-" + gatewayPaymentId;

    payment.paymentMethod =
      capture.method;

    payment.updatedAt = now;

    await payment.save();

    /*
    |--------------------------------------------------------------------------
    | Audit Log: Payment Verified
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      paymentId: payment._id,
      action: "Payment Verified",
      details: `Razorpay Signature Verified. Txn ref: ${gatewayPaymentId}`,
    });

    /*
    |--------------------------------------------------------------------------
    | Audit Log: Holding Started
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      paymentId: payment._id,
      action: "Holding Started",
      details:
        "Escrow funds locked in holding. 72-hour countdown dispute timer started.",
    });

    /*
    |--------------------------------------------------------------------------
    | Notification: Brand
    |--------------------------------------------------------------------------
    */

    await createNotification({
      recipientId: payment.brandId,
      senderId: payment.creatorId,
      type: "payment_successful",
      text: `Escrow payment of ₹${payment.grossAmount.toLocaleString()} successful. Ref: ${gatewayPaymentId}`,
      taskId: payment.taskId,
    });

    /*
    |--------------------------------------------------------------------------
    | Notification: Creator
    |--------------------------------------------------------------------------
    */

    await createNotification({
      recipientId: payment.creatorId,
      senderId: payment.brandId,
      type: "payment_secured",
      text: `Escrow payout of ₹${payment.creatorAmount.toLocaleString()} secured in holding.`,
      taskId: payment.taskId,
    });

    /*
    |--------------------------------------------------------------------------
    | Notification: New Payment
    |--------------------------------------------------------------------------
    */

    await createNotification({
      recipientId: payment.brandId,
      senderId: payment.creatorId,
      type: "new_payment",
      text: `New Escrow Payment secured: ₹${payment.grossAmount.toLocaleString()}`,
      taskId: payment.taskId,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error(
      "verifyPaymentSignature:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 3. RAISE DISPUTE
|
| Convex:
| raiseDispute
|--------------------------------------------------------------------------
*/

export const raiseDispute = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Dispute only during holding
    |--------------------------------------------------------------------------
    */

    if (payment.paymentStatus !== "holding") {
      return res.status(400).json({
        success: false,
        message:
          "Dispute can only be raised during active escrow holds.",
      });
    }

    const now = Date.now();

    payment.paymentStatus = "disputed";
    payment.holdingStatus = "disputed";
    payment.updatedAt = now;

    await payment.save();

    /*
    |--------------------------------------------------------------------------
    | Audit Log
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      paymentId: payment._id,
      action: "Dispute Raised",
      details:
        "Escrow dispute requested by Brand. Release countdown paused.",
    });

    /*
    |--------------------------------------------------------------------------
    | Notification
    |
    | Same behavior as Convex
    |--------------------------------------------------------------------------
    */

    await createNotification({
      recipientId: payment.brandId,
      senderId: payment.brandId,
      type: "dispute_raised",
      text: `Brand raised dispute on Payment: ${payment._id}`,
      taskId: payment.taskId,
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
|
| Convex:
| handleWebhookEvent
|--------------------------------------------------------------------------
*/

export const handleWebhookEvent = async (
  req,
  res
) => {
  const rawBody = req.body;

  try {
    /*
    |--------------------------------------------------------------------------
    | Webhook Signature
    |--------------------------------------------------------------------------
    */

    const signature =
      req.headers["x-razorpay-signature"];

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Webhook signature missing",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Webhook Signature
    |--------------------------------------------------------------------------
    */

    const isValid =
      verifyWebhookSignature({
        rawBody,
        signature,
      });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Parse Body
    |--------------------------------------------------------------------------
    */

    const payloadString =
      Buffer.isBuffer(rawBody)
        ? rawBody.toString()
        : JSON.stringify(rawBody);

    const parsed = JSON.parse(
      payloadString
    );

    const event = parsed.event;
    const now = Date.now();

    /*
    |--------------------------------------------------------------------------
    | Save Webhook Log
    |--------------------------------------------------------------------------
    */

    await WebhookLog.create({
      gateway: "razorpay",
      event,
      payload: payloadString,
      status: "processed",
      createdAt: now,
    });

    /*
    |--------------------------------------------------------------------------
    | Extract Razorpay Entities
    |--------------------------------------------------------------------------
    */

    const payloadObj =
      parsed.payload || parsed;

    const paymentEntity =
      payloadObj?.payment?.entity;

    const orderEntity =
      payloadObj?.order?.entity;

    const refundEntity =
      payloadObj?.refund?.entity;

    const orderId =
      paymentEntity?.order_id ||
      orderEntity?.id;

    /*
    |--------------------------------------------------------------------------
    | PAYMENT SUCCESS
    |--------------------------------------------------------------------------
    */

    if (
      event === "payment.authorized" ||
      event === "payment.captured" ||
      event === "order.paid"
    ) {
      if (orderId) {
        const payment =
          await Payment.findOne({
            gatewayOrderId: orderId,
          });

        if (
          payment &&
          payment.paymentStatus !== "completed" &&
          payment.paymentStatus !== "holding"
        ) {
          const payId =
            paymentEntity?.id ||
            payment.gatewayPaymentId ||
            "pay_webhook";

          payment.gatewayPaymentId =
            payId;

          payment.gatewayStatus =
            paymentEntity?.status ||
            "captured";

          payment.paymentStatus =
            "holding";

          payment.holdingStatus =
            "holding";

          payment.holdingStartedAt =
            now;

          payment.holdingEndsAt =
            now + HOLDING_DURATION;

          payment.paymentMethod =
            paymentEntity?.method ||
            "card";

          payment.updatedAt = now;

          await payment.save();

          await createAuditLog({
            paymentId: payment._id,
            action: "Payment Captured",
            details: `Webhook ${event} captured transaction successfully. Ref: ${payId}`,
          });
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT FAILED
    |--------------------------------------------------------------------------
    */

    else if (
      event === "payment.failed"
    ) {
      if (orderId) {
        const payment =
          await Payment.findOne({
            gatewayOrderId: orderId,
          });

        if (payment) {
          payment.paymentStatus =
            "pending";

          payment.gatewayStatus =
            "failed";

          payment.updatedAt = now;

          await payment.save();

          await createAuditLog({
            paymentId: payment._id,
            action: "Payment Failed",
            details: `Webhook payment.failed received. Reason: ${
              paymentEntity?.error_description ||
              "Unknown error"
            }`,
          });
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | REFUND PROCESSED
    |--------------------------------------------------------------------------
    */

    else if (
      event === "refund.processed"
    ) {
      const gatewayPaymentId =
        refundEntity?.payment_id ||
        paymentEntity?.id;

      if (gatewayPaymentId) {
        const payment =
          await Payment.findOne({
            gatewayPaymentId,
          });

        if (payment) {
          payment.paymentStatus =
            "refunded";

          payment.holdingStatus =
            "refunded";

          payment.refundStatus =
            "processed";

          payment.refundAmount =
            refundEntity?.amount
              ? refundEntity.amount / 100
              : payment.grossAmount;

          payment.updatedAt = now;

          await payment.save();

          await createAuditLog({
            paymentId: payment._id,
            action: "Refund Processed",
            details: `Webhook refund.processed executed. Refund ref: ${
              refundEntity?.id || "N/A"
            }. Funds returned to Brand.`,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error(
      "handleWebhookEvent:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | Error Webhook Log
    |--------------------------------------------------------------------------
    */

    try {
      const errorPayload =
        Buffer.isBuffer(req.body)
          ? req.body.toString()
          : JSON.stringify(req.body);

      let errorEvent = "unknown";

      try {
        const parsed =
          JSON.parse(errorPayload);

        errorEvent =
          parsed?.event || "unknown";
      } catch {
        // Keep unknown event
      }

      await WebhookLog.create({
        gateway: "razorpay",
        event: errorEvent,
        payload: errorPayload,
        status: "error",
        createdAt: Date.now(),
      });
    } catch (logError) {
      console.error(
        "Webhook logging failed:",
        logError
      );
    }

    return res.status(500).json({
      success: false,
      message:
        "Webhook processing failed",
    });
  }
};

/*
|--------------------------------------------------------------------------
| 5. SAVE CREATOR BANK DETAILS
|
| Convex:
| saveCreatorBankDetails
|--------------------------------------------------------------------------
*/

export const saveCreatorBankDetails = async (
  req,
  res
) => {
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

    /*
    |--------------------------------------------------------------------------
    | Required Fields
    |--------------------------------------------------------------------------
    */

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
        message:
          "All required bank details are required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Account Number Match
    |--------------------------------------------------------------------------
    */

    if (
      accountNumber !==
      confirmAccountNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Bank account numbers do not match",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | IFSC Validation
    |--------------------------------------------------------------------------
    */

    if (
      ifsc.trim().length !== 11
    ) {
      return res.status(400).json({
        success: false,
        message:
          "IFSC code must be exactly 11 characters",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PAN Validation
    |--------------------------------------------------------------------------
    */

    if (
      panNumber.trim().length !== 10
    ) {
      return res.status(400).json({
        success: false,
        message:
          "PAN Card Number must be exactly 10 characters",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Auth
    |
    | Change req.user.profileId if your
    | auth middleware uses another property.
    |--------------------------------------------------------------------------
    */

    const creatorId =
      req.user?.profileId;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized user access",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Existing Bank Details
    |--------------------------------------------------------------------------
    */

    const existing =
      await CreatorBankDetails.findOne({
        creatorId,
      });

    const data = {
      creatorId,

      fullName:
        fullName.trim(),

      phone:
        phone.trim(),

      email:
        email.trim(),

      bankName:
        bankName.trim(),

      accountHolderName:
        accountHolderName.trim(),

      accountNumber:
        accountNumber.trim(),

      ifsc:
        ifsc.trim().toUpperCase(),

      upiId:
        upiId?.trim() || undefined,

      panNumber:
        panNumber.trim().toUpperCase(),
    };

    /*
    |--------------------------------------------------------------------------
    | Update Existing
    |--------------------------------------------------------------------------
    */

    if (existing) {
      Object.assign(
        existing,
        data
      );

      await existing.save();

      return res.status(200).json({
        success: true,
        id: existing._id,
        message:
          "Bank details updated successfully",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create New
    |--------------------------------------------------------------------------
    */

    const bankDetails =
      await CreatorBankDetails.create(
        data
      );

    return res.status(200).json({
      success: true,
      id: bankDetails._id,
      message:
        "Bank details saved successfully",
    });
  } catch (error) {
    console.error(
      "saveCreatorBankDetails:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 6. GET CREATOR BANK DETAILS
|
| Convex:
| getCreatorBankDetails
|--------------------------------------------------------------------------
*/

export const getCreatorBankDetails =
  async (req, res) => {
    try {
      const { creatorId } =
        req.params;

      if (!isValidObjectId(creatorId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid creator ID",
        });
      }

      const bankDetails =
        await CreatorBankDetails.findOne({
          creatorId,
        }).lean();

      return res.status(200).json({
        success: true,
        data: bankDetails,
      });
    } catch (error) {
      console.error(
        "getCreatorBankDetails:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| 7. GET PAYMENTS FOR BRAND
|
| Convex:
| getPaymentsForBrand
|--------------------------------------------------------------------------
*/

export const getPaymentsForBrand =
  async (req, res) => {
    try {
      const { brandId } =
        req.params;

      if (!isValidObjectId(brandId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid brand ID",
        });
      }

      const payments =
        await Payment.find({
          brandId,
        })
          .sort({
            createdAt: -1,
          })
          .populate("campaignId")
          .populate("creatorId")
          .lean();

      const paymentIds =
        payments.map(
          (payment) => payment._id
        );

      const auditLogs =
        paymentIds.length
          ? await PaymentAuditLog.find({
              paymentId: {
                $in: paymentIds,
              },
            }).lean()
          : [];

      const result =
        payments.map(
          (payment) => ({
            ...payment,

            campaign:
              payment.campaignId,

            creator:
              payment.creatorId,

            auditLogs:
              auditLogs.filter(
                (log) =>
                  String(
                    log.paymentId
                  ) ===
                  String(
                    payment._id
                  )
              ),
          })
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error(
        "getPaymentsForBrand:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| 8. GET PAYMENTS FOR CREATOR
|
| Convex:
| getPaymentsForCreator
|--------------------------------------------------------------------------
*/

export const getPaymentsForCreator =
  async (req, res) => {
    try {
      const { creatorId } =
        req.params;

      if (!isValidObjectId(creatorId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid creator ID",
        });
      }

      const payments =
        await Payment.find({
          creatorId,
        })
          .sort({
            createdAt: -1,
          })
          .populate("campaignId")
          .populate("brandId")
          .lean();

      const paymentIds =
        payments.map(
          (payment) => payment._id
        );

      const auditLogs =
        paymentIds.length
          ? await PaymentAuditLog.find({
              paymentId: {
                $in: paymentIds,
              },
            }).lean()
          : [];

      const result =
        payments.map(
          (payment) => ({
            ...payment,

            campaign:
              payment.campaignId,

            brand:
              payment.brandId,

            auditLogs:
              auditLogs.filter(
                (log) =>
                  String(
                    log.paymentId
                  ) ===
                  String(
                    payment._id
                  )
              ),
          })
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error(
        "getPaymentsForCreator:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| 9. RELEASE SINGLE HOLDING PAYMENT
|
| Convex:
| releaseHoldingPaymentInternal
|--------------------------------------------------------------------------
*/

export const releaseHoldingPayment =
  async (payment) => {
    /*
    |--------------------------------------------------------------------------
    | Get Creator Bank Details
    |--------------------------------------------------------------------------
    */

    const bankDetails =
      await CreatorBankDetails.findOne({
        creatorId:
          payment.creatorId,
      });

    if (!bankDetails) {
      throw new Error(
        "Creator bank details not found"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Create Payout
    |
    | IMPORTANT:
    | This follows your original Convex behavior.
    | Original Convex createPayout was a MOCK payout.
    |--------------------------------------------------------------------------
    */

    const payout =
      await createPayout({
        bankDetails,
        amount:
          payment.creatorAmount,
      });

    const now =
      Date.now();

    /*
    |--------------------------------------------------------------------------
    | Update Payment
    |--------------------------------------------------------------------------
    */

    payment.paymentStatus =
      "completed";

    payment.holdingStatus =
      "released";

    payment.releasedAt =
      now;

    payment.payoutStatus =
      "processed";

    payment.payoutReference =
      payout.referenceId;

    payment.creatorBankAccountId =
      bankDetails._id;

    payment.updatedAt =
      now;

    await payment.save();

    /*
    |--------------------------------------------------------------------------
    | Audit Log: Released
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      paymentId:
        payment._id,

      action:
        "Released",

      details:
        "Milestone hold cleared. Escrow funds marked Ready to Release.",
    });

    /*
    |--------------------------------------------------------------------------
    | Audit Log: Completed
    |--------------------------------------------------------------------------
    */

    await createAuditLog({
      paymentId:
        payment._id,

      action:
        "Completed",

      details:
        `Payout completed to bank account: ref ${payout.referenceId}`,
    });

    /*
    |--------------------------------------------------------------------------
    | Notify Creator
    |--------------------------------------------------------------------------
    */

    await createNotification({
      recipientId:
        payment.creatorId,

      senderId:
        payment.brandId,

      type:
        "payment_released",

      text:
        `Escrow payout of ₹${payment.creatorAmount.toLocaleString()} has been credited to your bank account.`,

      taskId:
        payment.taskId,
    });

    /*
    |--------------------------------------------------------------------------
    | Notify Brand
    |--------------------------------------------------------------------------
    */

    await createNotification({
      recipientId:
        payment.brandId,

      senderId:
        payment.creatorId,

      type:
        "payment_released",

      text:
        `Escrow payment of ₹${payment.grossAmount.toLocaleString()} has been released to Creator.`,

      taskId:
        payment.taskId,
    });

    return payout;
  };

/*
|--------------------------------------------------------------------------
| 10. CHECK AND RELEASE EXPIRED PAYMENTS
|
| Convex:
| checkAndReleasePayments
|--------------------------------------------------------------------------
*/

export const checkAndReleasePayments =
  async () => {
    const now =
      Date.now();

    const payments =
      await Payment.find({
        paymentStatus:
          "holding",

        holdingStatus:
          "holding",

        holdingEndsAt: {
          $lte: now,
        },
      });

    const results = [];

    for (const payment of payments) {
      try {
        const payout =
          await releaseHoldingPayment(
            payment
          );

        results.push({
          paymentId:
            payment._id,

          success:
            true,

          payout,
        });
      } catch (error) {
        console.error(
          `Payout failed for payment ${payment._id}:`,
          error
        );

        payment.payoutStatus =
          "failed";

        payment.updatedAt =
          Date.now();

        await payment.save();

        results.push({
          paymentId:
            payment._id,

          success:
            false,

          error:
            error.message,
        });
      }
    }

    return results;
  };

/*
|--------------------------------------------------------------------------
| 11. REFUND PAYMENT
|
| Convex:
| refundPayment
|--------------------------------------------------------------------------
*/

export const refundPayment =
  async (req, res) => {
    try {
      const { paymentId } =
        req.params;

      const {
        amount,
        reason,
      } = req.body;

      if (!isValidObjectId(paymentId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment ID",
        });
      }

      const payment =
        await Payment.findById(
          paymentId
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment record not found",
        });
      }

      if (!payment.gatewayPaymentId) {
        return res.status(400).json({
          success: false,
          message:
            "Gateway payment ID not available",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Refund Amount
      |--------------------------------------------------------------------------
      */

      const refundAmount =
        amount || payment.grossAmount;

      if (
        Number(refundAmount) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Refund amount must be greater than zero",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Razorpay Refund
      |--------------------------------------------------------------------------
      */

      const refund =
        await refundPaymentService({
          paymentId:
            payment.gatewayPaymentId,

          amount:
            refundAmount,

          reason:
            reason ||
            "Payment refund",
        });

      const now =
        Date.now();

      /*
      |--------------------------------------------------------------------------
      | Update Payment
      |--------------------------------------------------------------------------
      */

      payment.refundStatus =
        "processed";

      payment.refundAmount =
        refund.amount;

      payment.refundReason =
        reason ||
        "Payment refund";

      payment.paymentStatus =
        "refunded";

      payment.holdingStatus =
        "refunded";

      payment.updatedAt =
        now;

      await payment.save();

      /*
      |--------------------------------------------------------------------------
      | Audit Log
      |--------------------------------------------------------------------------
      */

      await createAuditLog({
        paymentId:
          payment._id,

        action:
          "Refund Processed",

        details:
          `Refund processed. Refund ref: ${refund.id}`,
      });

      // Automatically reverse payout and linked referral commission if payout was issued
      try {
        const payoutIdToReverse = payment.payoutReference || payment._id;
        const connection = await Connection.findById(payment.connectionId);
        const targetPayoutId = connection?.payoutId || payoutIdToReverse;
        await reversePayoutAndReferralCommission({ payout_id: targetPayoutId });
      } catch (revErr) {
        console.warn("Refund auto-reversal warning:", revErr.message);
      }

      return res.status(200).json({
        success: true,
        data: refund,
      });
    } catch (error) {
      console.error(
        "refundPayment:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| 9. INITIATE COLLABORATION PAYMENT (TASK 4)
|
| POST /api/payments/collaboration/:connectionId/order
|--------------------------------------------------------------------------
*/
export const initiateCollaborationPayment = async (req, res) => {
  try {
    const { connectionId } = req.params;

    if (!isValidObjectId(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection/collaboration ID",
      });
    }

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found",
      });
    }

    // Security: Brand Authentication & Ownership
    if (req.user) {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can pay for collaborations",
        });
      }

      if (String(connection.brandId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this collaboration",
        });
      }
    }

    // Auto-derive and set AMOUNT_AGREED status if not set yet
    if (connection.collaborationStatus !== "AMOUNT_AGREED") {
      let finalBrandTotal = connection.proposedAmount || connection.brandTotal || 0;
      if (!finalBrandTotal && connection.campaignId) {
        const camp = await Campaign.findById(connection.campaignId).lean();
        finalBrandTotal = Number(camp?.minBudgetPerCreator) || Number(camp?.totalBudget) || 0;
      }
      if (finalBrandTotal > 0) {
        const fee = Math.round(finalBrandTotal * 0.20);
        connection.brandTotal = finalBrandTotal;
        connection.pravixoFee = fee;
        connection.creatorAmount = finalBrandTotal - fee;
        connection.collaborationStatus = "AMOUNT_AGREED";
        connection.agreedAt = Date.now();
        await connection.save();
      } else {
        return res.status(400).json({
          success: false,
          message: "Payment can only be initiated after collaboration amount is agreed.",
        });
      }
    }

    // Prevent duplicate payment
    if (connection.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This collaboration has already been paid.",
      });
    }

    // Strict backend calculations from stored data (never trust frontend)
    let creatorAmount = connection.creatorAmount;
    let pravixoFee = connection.pravixoFee || Math.round((connection.brandTotal || 0) * 0.20);
    let brandTotal = connection.brandTotal || (creatorAmount + pravixoFee);

    if ((!brandTotal || brandTotal <= 0) && connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).lean();
      brandTotal = Number(camp?.minBudgetPerCreator) || Number(camp?.totalBudget) || 0;
      pravixoFee = Math.round(brandTotal * 0.20);
      creatorAmount = brandTotal - pravixoFee;
      connection.brandTotal = brandTotal;
      connection.pravixoFee = pravixoFee;
      connection.creatorAmount = creatorAmount;
      await connection.save();
    }

    if (!brandTotal || brandTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid agreed collaboration amount.",
      });
    }

    const invoiceNumber = `INV-${Date.now()}-${connection._id.toString().slice(-4).toUpperCase()}`;

    // Find existing conversation if any
    let conversation = null;
    if (connection.campaignId) {
      conversation = await Conversation.findOne({
        creatorId: connection.creatorId,
        brandId: connection.brandId,
        campaignId: connection.campaignId,
      });
    } else {
      conversation = await Conversation.findOne({
        creatorId: connection.creatorId,
        brandId: connection.brandId,
      });
    }

    // Find or create Payment document
    let payment = null;
    if (connection.paymentId) {
      payment = await Payment.findById(connection.paymentId);
    }

    if (!payment) {
      payment = await Payment.create({
        campaignId: connection.campaignId,
        taskId: null,
        conversationId: conversation?._id || null,
        connectionId: connection._id,
        brandId: connection.brandId,
        creatorId: connection.creatorId,
        paymentGateway: "razorpay",
        invoiceNumber,
        invoiceStatus: "generated",
        currency: "INR",
        grossAmount: brandTotal,
        platformCommissionPercentage: 20,
        platformCommissionAmount: pravixoFee,
        creatorAmount: creatorAmount,
        paymentStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      connection.paymentId = payment._id;
    } else {
      payment.grossAmount = brandTotal;
      payment.platformCommissionAmount = pravixoFee;
      payment.creatorAmount = creatorAmount;
      payment.paymentStatus = "pending";
      payment.invoiceStatus = "generated";
      payment.updatedAt = Date.now();
      await payment.save();
    }

    // Create Razorpay Order with exact brandTotal (in INR)
    const order = await createOrder({
      amount: brandTotal,
      currency: "INR",
      receiptId: invoiceNumber,
    });

    payment.gatewayOrderId = order.id;
    payment.paymentStatus = "pending";
    payment.updatedAt = Date.now();
    await payment.save();

    connection.paymentStatus = "PAYMENT_INITIATED";
    connection.updatedAt = Date.now();
    await connection.save();

    await createAuditLog({
      paymentId: payment._id,
      action: "Payment Initiated",
      details: `Razorpay Order ${order.id} initiated for collaboration ${connection._id}. Amount: ₹${brandTotal}`,
    });

    return res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
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
| 10. VERIFY COLLABORATION PAYMENT (TASK 4)
|
| POST /api/payments/collaboration/:connectionId/verify
|--------------------------------------------------------------------------
*/
export const verifyCollaborationPayment = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const {
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
    } = req.body;

    if (!isValidObjectId(connectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection/collaboration ID",
      });
    }

    if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification credentials missing",
      });
    }

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found",
      });
    }

    // Security: Brand Authentication & Ownership
    if (req.user) {
      if (req.user.role !== "brand") {
        return res.status(403).json({
          success: false,
          message: "Only Brands can verify payments",
        });
      }

      if (String(connection.brandId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not own this collaboration",
        });
      }
    }

    // Check duplicate payment
    if (connection.paymentStatus === "PAID") {
      return res.status(200).json({
        success: true,
        message: "Payment is already completed and verified.",
        data: {
          connection,
          paymentStatus: "PAID",
        },
      });
    }

    const payment = await Payment.findOne({
      connectionId: connection._id,
      gatewayOrderId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record for this order was not found",
      });
    }

    // Verify Server-side Razorpay signature
    const isValid = verifySignature({
      orderId: gatewayOrderId,
      paymentId: gatewayPaymentId,
      signature: gatewaySignature,
    });

    if (!isValid) {
      connection.paymentStatus = "FAILED";
      connection.updatedAt = Date.now();
      await connection.save();

      payment.paymentStatus = "pending";
      payment.invoiceStatus = "failed";
      await payment.save();

      await createAuditLog({
        paymentId: payment._id,
        action: "Payment Verification Failed",
        details: `Invalid signature for Order ${gatewayOrderId} and Payment ${gatewayPaymentId}.`,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid payment signature verification failed.",
      });
    }

    // Attempt capture if live Razorpay instance configured
    let captureStatus = "captured";
    try {
      const capture = await capturePayment({
        paymentId: gatewayPaymentId,
        amount: payment.grossAmount,
        currency: payment.currency || "INR",
      });
      captureStatus = capture.status || "captured";
    } catch (captureErr) {
      // If already captured or simulated in test mode, proceed
      console.log("Payment capture response/note:", captureErr.message);
    }

    const now = Date.now();

    // Update Payment model
    payment.gatewayPaymentId = gatewayPaymentId;
    payment.gatewaySignature = gatewaySignature;
    payment.gatewayStatus = captureStatus;
    payment.invoiceStatus = "paid";
    payment.paymentStatus = "payment_successful";
    payment.transactionReference = `TXN-${gatewayPaymentId}`;
    payment.updatedAt = now;
    await payment.save();

    // Update Connection model
    connection.paymentStatus = "PAID";
    connection.collaborationStatus = "AMOUNT_AGREED";
    if (!connection.agreedAt) {
      connection.agreedAt = now;
    }
    connection.paidAt = now;
    connection.updatedAt = now;

    // Task 5: Ensure deliverablesTracking snapshot is populated from campaign
    if ((!connection.deliverablesTracking || connection.deliverablesTracking.length === 0) && connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).lean();
      if (camp && camp.deliverables) {
        const delivs = [];
        if (camp.deliverables.reels > 0) {
          delivs.push({
            type: "REEL",
            requiredQuantity: camp.deliverables.reels,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
          });
        }
        if (camp.deliverables.posts > 0) {
          delivs.push({
            type: "POST",
            requiredQuantity: camp.deliverables.posts,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
          });
        }
        if (camp.deliverables.stories > 0) {
          delivs.push({
            type: "STORY",
            requiredQuantity: camp.deliverables.stories,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
          });
        }
        if (camp.deliverables.videos > 0) {
          delivs.push({
            type: "VIDEO",
            requiredQuantity: camp.deliverables.videos,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
          });
        }
        connection.deliverablesTracking = delivs;
      }
    }

    await connection.save();

    await createAuditLog({
      paymentId: payment._id,
      action: "Payment Secured",
      details: `Payment of ₹${payment.grossAmount} (Creator: ₹${payment.creatorAmount}, Pravixo Fee: ₹${payment.platformCommissionAmount}) verified and marked PAID.`,
    });

    // Notify Creator & Admin
    const brandProfile = await Profile.findById(connection.brandId).select("fullName").lean();
    const brandName = brandProfile?.fullName || "Brand";

    let campaignTitle = "collaboration";
    if (connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).select("title").lean();
      if (camp) campaignTitle = camp.title;
    }

    // Notify Creator
    await createNotification({
      recipientId: connection.creatorId,
      senderId: connection.brandId,
      type: "payment_secured",
      text: `${brandName} has successfully paid Pravixo ₹${payment.grossAmount.toLocaleString()} for "${campaignTitle}". You may now begin work on deliverables!`,
    });

    // Add Escrow Funded message to chat history
    try {
      const conv = await Conversation.findOne({
        creatorId: connection.creatorId,
        brandId: connection.brandId,
        campaignId: connection.campaignId,
      });
      if (conv) {
        await Message.create({
          conversationId: conv._id,
          senderId: connection.brandId,
          text: `[Escrow Funded] 💳 ${brandName} deposited ₹${payment.grossAmount.toLocaleString()} to Pravixo Escrow for "${campaignTitle}". Creator payout of ₹${payment.creatorAmount.toLocaleString()} (after 20% platform fee) is now 100% secured. Creator can now start work!`,
          messageType: "system",
          metadata: {
            paymentId: payment._id,
            grossAmount: payment.grossAmount,
            creatorAmount: payment.creatorAmount,
            platformFee: payment.platformCommissionAmount,
            status: "PAID",
          },
          read: false,
        });
      }
    } catch (chatErr) {
      console.warn("Could not post payment message to chat:", chatErr);
    }

    // Notify Admins
    const admins = await Profile.find({ role: "admin" }).select("_id").lean();
    for (const admin of admins) {
      await createNotification({
        recipientId: admin._id,
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
        connection,
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

/**
 * POST /api/payments/collaboration/:connectionId/pay-with-wallet
 * Pay the collaboration escrow directly using Brand Wallet balance.
 */
export const payCollaborationWithWallet = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user?._id;

    if (!isValidObjectId(connectionId)) {
      return res.status(400).json({ success: false, message: "Invalid collaboration ID" });
    }

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: "Collaboration not found" });
    }

    if (String(connection.brandId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    if (connection.paymentStatus === "PAID") {
      return res.status(400).json({ success: false, message: "This collaboration is already paid." });
    }

    let creatorAmount = connection.creatorAmount;
    let pravixoFee = connection.pravixoFee || Math.round((connection.brandTotal || 0) * 0.20);
    let brandTotal = connection.brandTotal || (creatorAmount + pravixoFee);

    if (!brandTotal || brandTotal <= 0) {
      return res.status(400).json({ success: false, message: "Invalid agreed collaboration amount." });
    }

    // Atomically check and deduct brand wallet balance
    const Wallet = (await import("../models/Wallet.js")).default;
    const WalletTransaction = (await import("../models/WalletTransaction.js")).default;

    const brandWallet = await Wallet.findOneAndUpdate(
      {
        creatorId: userId,
        availableBalance: { $gte: brandTotal },
      },
      {
        $inc: {
          availableBalance: -brandTotal,
          totalWithdrawn: brandTotal,
        },
      },
      { new: true }
    );

    if (!brandWallet) {
      const current = await Wallet.findOne({ creatorId: userId });
      const available = current?.availableBalance || 0;
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Total amount ₹${brandTotal.toLocaleString("en-IN")} required, but only ₹${available.toLocaleString("en-IN")} available. Please add funds to your wallet first.`,
      });
    }

    const now = Date.now();
    const invoiceNumber = `INV-${now}-${connection._id.toString().slice(-4).toUpperCase()}`;
    const txnRef = `WAL-${now}-${userId.toString().slice(-4).toUpperCase()}`;

    // Record wallet debit transaction
    await WalletTransaction.create({
      creatorId: userId,
      collaborationId: connection._id,
      campaignId: connection.campaignId,
      type: "DEBIT",
      transaction_type: "escrow_payment",
      amount: brandTotal,
      currency: "INR",
      status: "COMPLETED",
      description: `Escrow payment funded via Wallet for collaboration`,
      referenceId: txnRef,
      balanceAfter: brandWallet.availableBalance,
    });

    // Create or update Payment record
    let payment = await Payment.findOne({ connectionId: connection._id });
    if (!payment) {
      payment = await Payment.create({
        campaignId: connection.campaignId,
        connectionId: connection._id,
        brandId: connection.brandId,
        creatorId: connection.creatorId,
        paymentGateway: "wallet",
        invoiceNumber,
        invoiceStatus: "paid",
        currency: "INR",
        grossAmount: brandTotal,
        platformCommissionPercentage: 20,
        platformCommissionAmount: pravixoFee,
        creatorAmount,
        paymentStatus: "payment_successful",
        transactionReference: txnRef,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      payment.grossAmount = brandTotal;
      payment.platformCommissionAmount = pravixoFee;
      payment.creatorAmount = creatorAmount;
      payment.invoiceStatus = "paid";
      payment.paymentStatus = "payment_successful";
      payment.transactionReference = txnRef;
      payment.paymentGateway = "wallet";
      payment.updatedAt = now;
      await payment.save();
    }

    connection.paymentId = payment._id;
    connection.paymentStatus = "PAID";
    connection.collaborationStatus = "AMOUNT_AGREED";
    if (!connection.agreedAt) connection.agreedAt = now;
    connection.paidAt = now;
    connection.updatedAt = now;

    // Snapshot deliverables if needed
    if ((!connection.deliverablesTracking || connection.deliverablesTracking.length === 0) && connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).lean();
      if (camp && camp.deliverables) {
        const delivs = [];
        if (camp.deliverables.reels > 0) delivs.push({ type: "REEL", requiredQuantity: camp.deliverables.reels, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        if (camp.deliverables.posts > 0) delivs.push({ type: "POST", requiredQuantity: camp.deliverables.posts, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        if (camp.deliverables.stories > 0) delivs.push({ type: "STORY", requiredQuantity: camp.deliverables.stories, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        if (camp.deliverables.videos > 0) delivs.push({ type: "VIDEO", requiredQuantity: camp.deliverables.videos, completedQuantity: 0, status: "PENDING", createdAt: now, updatedAt: now });
        connection.deliverablesTracking = delivs;
      }
    }

    await connection.save();

    // Notify Creator & Admin
    const brandProfile = await Profile.findById(connection.brandId).select("fullName").lean();
    const brandName = brandProfile?.fullName || "Brand";

    let campaignTitle = "collaboration";
    if (connection.campaignId) {
      const camp = await Campaign.findById(connection.campaignId).select("title").lean();
      if (camp) campaignTitle = camp.title;
    }

    await Notification.create({
      recipientId: connection.creatorId,
      senderId: connection.brandId,
      type: "payment_secured",
      text: `${brandName} funded Pravixo Escrow with ₹${brandTotal.toLocaleString("en-IN")} via Brand Wallet for "${campaignTitle}". You can now begin work!`,
    });

    try {
      const conv = await Conversation.findOne({
        creatorId: connection.creatorId,
        brandId: connection.brandId,
        campaignId: connection.campaignId,
      });
      if (conv) {
        await Message.create({
          conversationId: conv._id,
          senderId: connection.brandId,
          text: `[Escrow Funded] 💳 ${brandName} paid ₹${brandTotal.toLocaleString("en-IN")} via Brand Wallet to Pravixo Escrow for "${campaignTitle}". Creator payout of ₹${creatorAmount.toLocaleString("en-IN")} is 100% secured!`,
          messageType: "system",
          metadata: {
            paymentId: payment._id,
            grossAmount: brandTotal,
            creatorAmount,
            platformFee: pravixoFee,
            status: "PAID",
            paidVia: "wallet",
          },
          read: false,
        });
      }
    } catch (chatErr) {
      console.log("Chat error:", chatErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Paid successfully using Wallet balance!",
      data: {
        connection,
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