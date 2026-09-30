import mongoose from "mongoose";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Withdrawal from "../models/Withdrawal.js";
import CreatorBankDetails from "../models/CreatorBankDetails.js";
import Notification from "../models/Notification.js";
import Profile from "../models/Profile.js";
import { sendPushToUser, sendPushToUsers } from "../utils/webPush.js";

/**
 * Helper to credit a creator's wallet atomically and idempotently upon admin payout release.
 */
export const creditCreatorWallet = async ({
  creatorId,
  amount,
  collaborationId = null,
  campaignId = null,
  payoutId = null,
  referenceId,
  description = "Collaboration payout released by Admin",
  transaction_type = "collaboration",
  related_transaction_id = null,
  related_referral_id = null,
  status = "COMPLETED",
}) => {
  if (!creatorId || !amount || amount <= 0) {
    throw new Error("Invalid creatorId or credit amount.");
  }

  // Idempotency Check: if a transaction with this payoutId or referenceId already exists, do not double credit.
  if (payoutId) {
    const existingTx = await WalletTransaction.findOne({ payoutId });
    if (existingTx) {
      console.log(`[Wallet] Payout ${payoutId} already credited. Skipping duplicate credit.`);
      const currentWallet = await Wallet.findOne({ creatorId });
      return { wallet: currentWallet, transaction: existingTx, duplicate: true };
    }
  }

  if (referenceId) {
    const existingTxByRef = await WalletTransaction.findOne({ referenceId });
    if (existingTxByRef) {
      console.log(`[Wallet] Reference ${referenceId} already credited. Skipping duplicate credit.`);
      const currentWallet = await Wallet.findOne({ creatorId });
      return { wallet: currentWallet, transaction: existingTxByRef, duplicate: true };
    }
  }

  // Atomic find & update or create wallet (only increment balance if COMPLETED)
  const isCompleted = status === "COMPLETED";
  const updateQuery = isCompleted
    ? {
        $inc: {
          availableBalance: amount,
          totalEarned: amount,
        },
        $setOnInsert: {
          pendingWithdrawalBalance: 0,
          totalWithdrawn: 0,
          currency: "INR",
        },
      }
    : {
        $setOnInsert: {
          availableBalance: 0,
          totalEarned: 0,
          pendingWithdrawalBalance: 0,
          totalWithdrawn: 0,
          currency: "INR",
        },
      };

  const updatedWallet = await Wallet.findOneAndUpdate(
    { creatorId },
    updateQuery,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  // Record ledger transaction
  const transaction = await WalletTransaction.create({
    creatorId,
    collaborationId,
    campaignId,
    payoutId,
    type: "CREDIT",
    transaction_type,
    related_transaction_id,
    related_referral_id,
    amount,
    currency: "INR",
    status,
    description,
    referenceId: referenceId || `WTX-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    balanceAfter: updatedWallet.availableBalance,
  });

  return { wallet: updatedWallet, transaction, duplicate: false };
};

/**
 * GET /api/wallet/my-wallet
 * Retrieve authenticated user's (creator or brand) wallet balance and summary.
 */
export const getMyWallet = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    let wallet = await Wallet.findOne({ creatorId: userId });
    if (!wallet) {
      wallet = await Wallet.create({
        creatorId: userId,
        availableBalance: 0,
        pendingWithdrawalBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        currency: "INR",
      });
    }

    // Get recent transactions
    const recentTransactions = await WalletTransaction.find({ creatorId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("campaignId", "title")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        wallet,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error("Get my-wallet error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load wallet.",
      error: error.message,
    });
  }
};

/**
 * POST /api/wallet/deposit/order
 * Initiate an order to add funds into the Brand/User wallet using Razorpay.
 */
export const createDepositOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { amount } = req.body;
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid deposit amount greater than zero.",
      });
    }

    const { createOrder } = await import("../services/razorpayService.js");
    const receiptId = `DEP-${Date.now()}-${userId.toString().slice(-4).toUpperCase()}`;

    const order = await createOrder({
      amount: numericAmount,
      currency: "INR",
      receiptId,
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
      },
    });
  } catch (error) {
    console.error("Create deposit order error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create deposit order.",
    });
  }
};

/**
 * POST /api/wallet/deposit/verify
 * Verify Razorpay payment and credit the funds into User/Brand wallet.
 */
export const verifyDepositPayment = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { gatewayOrderId, gatewayPaymentId, gatewaySignature, amount } = req.body;

    if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification credentials missing.",
      });
    }

    const { verifySignature, capturePayment } = await import("../services/razorpayService.js");

    const isValid = verifySignature({
      orderId: gatewayOrderId,
      paymentId: gatewayPaymentId,
      signature: gatewaySignature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid deposit payment signature.",
      });
    }

    const depositAmount = Number(amount);
    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid deposit amount.",
      });
    }

    try {
      await capturePayment({
        paymentId: gatewayPaymentId,
        amount: depositAmount,
        currency: "INR",
      });
    } catch (e) {
      console.log("Deposit capture note:", e.message);
    }

    const refId = `DEP-${gatewayPaymentId}`;

    // Atomically credit wallet
    const { wallet, transaction } = await creditCreatorWallet({
      creatorId: userId,
      amount: depositAmount,
      referenceId: refId,
      description: `Added funds to wallet (Ref: ${gatewayPaymentId})`,
      transaction_type: "deposit",
      status: "COMPLETED",
    });

    // Notify User
    await Notification.create({
      recipientId: userId,
      senderId: userId,
      type: "wallet_deposit",
      text: `Successfully added ₹${depositAmount.toLocaleString("en-IN")} to your Pravixo Wallet. (Ref: ${gatewayPaymentId})`,
      targetUrl: req.user?.role === "brand" ? "/dashboard/brand?tab=wallet" : "/dashboard/creator?tab=wallet",
      createdAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      message: `₹${depositAmount.toLocaleString("en-IN")} added to wallet successfully.`,
      data: {
        wallet,
        transaction,
      },
    });
  } catch (error) {
    console.error("Verify deposit payment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify deposit payment.",
    });
  }
};

/**
 * GET /api/wallet/my-transactions
 * Retrieve paginated transaction history for the authenticated creator.
 */
export const getMyTransactions = async (req, res) => {
  try {
    const creatorId = req.user?._id;
    if (!creatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ creatorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("campaignId", "title")
        .populate("collaborationId", "creatorAmount pravixoFee")
        .lean(),
      WalletTransaction.countDocuments({ creatorId }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    console.error("Get my-transactions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load wallet transactions.",
      error: error.message,
    });
  }
};

/**
 * POST /api/wallet/withdraw
 * Request a withdrawal from the available wallet balance.
 */
export const requestWithdrawal = async (req, res) => {
  try {
    const creatorId = req.user?._id;
    if (!creatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    if (req.user?.role !== "creator") {
      return res.status(403).json({ success: false, message: "Only creators can request withdrawals." });
    }

    const { amount, withdrawalMethod = "BANK_TRANSFER" } = req.body;
    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid withdrawal amount greater than zero.",
      });
    }

    // Minimum withdrawal threshold (e.g. ₹100 or ₹500)
    const MIN_WITHDRAWAL = 100;
    if (withdrawAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.`,
      });
    }

    // Check bank details
    const bankDetails = await CreatorBankDetails.findOne({ creatorId });
    if (!bankDetails || !bankDetails.accountNumber || !bankDetails.ifsc) {
      return res.status(400).json({
        success: false,
        message: "Please save your bank account details in Payment Settings before requesting a withdrawal.",
      });
    }

    // Mask account number for safe snapshot
    const accNum = bankDetails.accountNumber || "";
    const maskedAcc = accNum.length > 4 ? `••••••••${accNum.slice(-4)}` : accNum;

    const bankSnapshot = {
      accountHolderName: bankDetails.accountHolderName || bankDetails.fullName,
      bankName: bankDetails.bankName,
      accountNumberMasked: maskedAcc,
      ifsc: bankDetails.ifsc,
      upiId: bankDetails.upiId || "",
    };

    // Atomically reserve funds from available balance
    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        creatorId,
        availableBalance: { $gte: withdrawAmount },
      },
      {
        $inc: {
          availableBalance: -withdrawAmount,
          pendingWithdrawalBalance: withdrawAmount,
        },
      },
      { new: true }
    );

    if (!updatedWallet) {
      const currentWallet = await Wallet.findOne({ creatorId });
      const currentAvailable = currentWallet?.availableBalance || 0;
      return res.status(400).json({
        success: false,
        message: `Insufficient available balance. You requested ₹${withdrawAmount.toLocaleString("en-IN")}, but only ₹${currentAvailable.toLocaleString("en-IN")} is available.`,
      });
    }

    const referenceId = `WDR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create Withdrawal Record
    const withdrawal = await Withdrawal.create({
      creatorId,
      amount: withdrawAmount,
      currency: "INR",
      status: "PENDING",
      withdrawalMethod,
      bankDetailsSnapshot: bankSnapshot,
      referenceId,
      requestedAt: Date.now(),
    });

    // Log Wallet Transaction
    const transaction = await WalletTransaction.create({
      creatorId,
      withdrawalId: withdrawal._id,
      type: "DEBIT",
      amount: withdrawAmount,
      currency: "INR",
      status: "PENDING",
      description: `Withdrawal request to ${bankDetails.bankName} (${maskedAcc})`,
      referenceId,
      balanceAfter: updatedWallet.availableBalance,
    });

    // Fetch creator details
    const creatorProfile = await Profile.findById(creatorId).select("fullName email handle").lean();
    const creatorName = creatorProfile?.fullName || "Creator";

    // 1. Notify Creator (confirmation)
    await Notification.create({
      recipientId: creatorId,
      senderId: creatorId,
      type: "withdrawal_requested",
      text: `Your withdrawal request of ₹${withdrawAmount.toLocaleString("en-IN")} (Ref: ${referenceId}) has been submitted and is pending admin review.`,
      targetUrl: "/dashboard/creator/wallet",
      metadata: { withdrawalId: withdrawal._id, amount: withdrawAmount, referenceId },
      createdAt: Date.now(),
    });

    // 2. Notify Admins
    const admins = await Profile.find({ role: "admin" }).select("_id").lean();
    if (admins && admins.length > 0) {
      const adminIds = admins.map((a) => a._id);
      for (const adminId of adminIds) {
        await Notification.create({
          recipientId: adminId,
          senderId: creatorId,
          type: "withdrawal_requested",
          text: `Creator ${creatorName} requested a withdrawal of ₹${withdrawAmount.toLocaleString("en-IN")} (Ref: ${referenceId}).`,
          targetUrl: "/admin/payments",
          metadata: { withdrawalId: withdrawal._id, amount: withdrawAmount, referenceId },
          createdAt: Date.now(),
        });
      }

      sendPushToUsers(adminIds, {
        title: "New Withdrawal Request 💸",
        body: `Creator ${creatorName} requested ₹${withdrawAmount.toLocaleString("en-IN")}.`,
        url: "/admin/payments",
      }).catch((err) => console.error("Admin withdrawal push error:", err.message));
    }

    return res.status(201).json({
      success: true,
      message: `Withdrawal request for ₹${withdrawAmount.toLocaleString("en-IN")} submitted successfully.`,
      data: {
        withdrawal,
        wallet: updatedWallet,
        transaction,
      },
    });
  } catch (error) {
    console.error("requestWithdrawal error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit withdrawal request.",
      error: error.message,
    });
  }
};

/**
 * GET /api/wallet/my-withdrawals
 * Retrieve the authenticated creator's withdrawal requests.
 */
export const getMyWithdrawals = async (req, res) => {
  try {
    const creatorId = req.user?._id;
    if (!creatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const withdrawals = await Withdrawal.find({ creatorId })
      .sort({ requestedAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: withdrawals,
    });
  } catch (error) {
    console.error("getMyWithdrawals error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load withdrawal requests.",
      error: error.message,
    });
  }
};
