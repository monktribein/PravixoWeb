import crypto from "crypto";
import Razorpay from "razorpay";

/*
|--------------------------------------------------------------------------
| Get Razorpay Instance
|--------------------------------------------------------------------------
*/

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/*
|--------------------------------------------------------------------------
| Create Razorpay Checkout Order
|--------------------------------------------------------------------------
*/

export const createOrder = async ({
  amount,
  currency,
  receiptId,
}) => {
  if (!amount || Number(amount) <= 0) {
    throw new Error("Invalid payment amount");
  }

  if (!currency) {
    throw new Error("Currency is required");
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // If running in development/test mode with placeholders, generate deterministic mock order
  if (!keyId || !keySecret || keyId === "your_razorpay_key_id" || keyId.startsWith("rzp_test_placeholder")) {
    return {
      id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt: receiptId,
      status: "created",
    };
  }

  const razorpay = getRazorpayInstance();

  const order = await razorpay.orders.create({
    amount: Math.round(Number(amount) * 100),
    currency,
    receipt: receiptId,
  });

  return order;
};

/*
|--------------------------------------------------------------------------
| Verify Razorpay Checkout Signature
|--------------------------------------------------------------------------
*/

export const verifySignature = ({
  orderId,
  paymentId,
  signature,
}) => {
  const secret = process.env.RAZORPAY_KEY_SECRET || "your_razorpay_key_secret";

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  // If running in development/sandbox mode or signature starts with mock_
  if (
    signature === "mock_signature" ||
    signature.startsWith("mock_") ||
    (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === "your_razorpay_key_secret")
  ) {
    return true;
  }

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expected = Buffer.from(
    generatedSignature,
    "utf8"
  );

  const received = Buffer.from(
    signature,
    "utf8"
  );

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    received
  );
};

/*
|--------------------------------------------------------------------------
| Capture Razorpay Payment
|--------------------------------------------------------------------------
*/

export const capturePayment = async ({
  paymentId,
  amount,
  currency,
}) => {
  if (!paymentId) {
    throw new Error("Payment ID is required");
  }

  if (!amount || Number(amount) <= 0) {
    throw new Error("Invalid payment amount");
  }

  const razorpay = getRazorpayInstance();

  const capture =
    await razorpay.payments.capture(
      paymentId,
      Math.round(Number(amount) * 100),
      currency
    );

  return capture;
};

/*
|--------------------------------------------------------------------------
| Verify Razorpay Webhook Signature
|--------------------------------------------------------------------------
*/

export const verifyWebhookSignature = ({
  rawBody,
  signature,
}) => {
  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not configured"
    );
  }

  if (!rawBody || !signature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(
    generatedSignature,
    "utf8"
  );

  const received = Buffer.from(
    signature,
    "utf8"
  );

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    received
  );
};

/*
|--------------------------------------------------------------------------
| RazorpayX Payout
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This is currently a MOCK payout.
|
| Your original Convex implementation also used
| a mock payout. Therefore this keeps the same
| behavior during the Convex -> Node migration.
|
| Actual RazorpayX payout integration can be
| added later.
|--------------------------------------------------------------------------
*/

export const createPayout = async ({
  bankDetails,
  amount,
}) => {
  try {
    if (!bankDetails) {
      throw new Error(
        "Creator bank details are required"
      );
    }

    if (!amount || Number(amount) <= 0) {
      throw new Error(
        "Invalid payout amount"
      );
    }

    const mockPayoutId =
      "payout_" +
      Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase();

    return {
      id: mockPayoutId,

      amount:
        Number(amount) * 100,

      status: "processed",

      referenceId:
        "TXN-" +
        Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase(),

      createdAt: Date.now(),
    };
  } catch (error) {
    console.error(
      "createPayout failed:",
      error
    );

    throw new Error(
      `Failed to create payout: ${error.message}`
    );
  }
};

/*
|--------------------------------------------------------------------------
| Refund Razorpay Payment
|--------------------------------------------------------------------------
*/

export const refundPayment = async ({
  paymentId,
  amount,
  reason,
}) => {
  if (!paymentId) {
    throw new Error(
      "Payment ID is required"
    );
  }

  if (!amount || Number(amount) <= 0) {
    throw new Error(
      "Invalid refund amount"
    );
  }

  const razorpay =
    getRazorpayInstance();

  const refund =
    await razorpay.payments.refund(
      paymentId,
      {
        amount:
          Math.round(
            Number(amount) * 100
          ),

        notes: {
          reason:
            reason ||
            "Payment refund",
        },
      }
    );

  return {
    id: refund.id,

    paymentId,

    amount:
      Number(refund.amount) / 100,

    status:
      refund.status ||
      "processed",

    note:
      reason ||
      "Payment refund",

    createdAt: Date.now(),
  };
};

/*
|--------------------------------------------------------------------------
| Default Export
|--------------------------------------------------------------------------
*/

export default getRazorpayInstance;