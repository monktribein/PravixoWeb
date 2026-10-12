import { query } from "../config/postgres.js";
import {
  formatWallet,
  formatWalletTransaction,
  formatWithdrawal,
} from "../utils/formatters.js";
import { sendPushToUsers } from "../utils/webPush.js";

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
    const existingTxRes = await query(
      "SELECT * FROM wallet_transactions WHERE payout_id::text = $1 LIMIT 1",
      [String(payoutId)]
    );
    if (existingTxRes.rows.length > 0) {
      console.log(`[Wallet] Payout ${payoutId} already credited. Skipping duplicate credit.`);
      const currentWalletRes = await query(
        "SELECT * FROM wallets WHERE creator_id::text = $1 LIMIT 1",
        [String(creatorId)]
      );
      return {
        wallet: formatWallet(currentWalletRes.rows[0]),
        transaction: formatWalletTransaction(existingTxRes.rows[0]),
        duplicate: true,
      };
    }
  }

  if (referenceId) {
    const existingRefRes = await query(
      "SELECT * FROM wallet_transactions WHERE reference_id = $1 LIMIT 1",
      [referenceId]
    );
    if (existingRefRes.rows.length > 0) {
      console.log(`[Wallet] Reference ${referenceId} already credited. Skipping duplicate credit.`);
      const currentWalletRes = await query(
        "SELECT * FROM wallets WHERE creator_id::text = $1 LIMIT 1",
        [String(creatorId)]
      );
      return {
        wallet: formatWallet(currentWalletRes.rows[0]),
        transaction: formatWalletTransaction(existingRefRes.rows[0]),
        duplicate: true,
      };
    }
  }

  const isCompleted = status === "COMPLETED";
  const numAmount = Number(amount);

  let updatedWalletRow;
  if (isCompleted) {
    const walletRes = await query(
      `INSERT INTO wallets (
        creator_id, available_balance, total_earned, pending_withdrawal_balance, total_withdrawn, currency
      ) VALUES ($1, $2, $2, 0, 0, 'INR')
      ON CONFLICT (creator_id)
      DO UPDATE SET
        available_balance = wallets.available_balance + EXCLUDED.available_balance,
        total_earned = wallets.total_earned + EXCLUDED.total_earned,
        updated_at = NOW()
      RETURNING *`,
      [creatorId, numAmount]
    );
    updatedWalletRow = walletRes.rows[0];
  } else {
    const walletRes = await query(
      `INSERT INTO wallets (
        creator_id, available_balance, total_earned, pending_withdrawal_balance, total_withdrawn, currency
      ) VALUES ($1, 0, 0, 0, 0, 'INR')
      ON CONFLICT (creator_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING *`,
      [creatorId]
    );
    updatedWalletRow = walletRes.rows[0];
  }

  const finalRef =
    referenceId ||
    `WTX-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const txRes = await query(
    `INSERT INTO wallet_transactions (
      creator_id, collaboration_id, campaign_id, payout_id, type, transaction_type,
      related_transaction_id, related_referral_id, amount, currency, status,
      description, reference_id, balance_after
    ) VALUES ($1, $2, $3, $4, 'CREDIT', $5, $6, $7, $8, 'INR', $9, $10, $11, $12)
    RETURNING *`,
    [
      creatorId,
      collaborationId || null,
      campaignId || null,
      payoutId || null,
      transaction_type,
      related_transaction_id || null,
      related_referral_id || null,
      numAmount,
      status,
      description,
      finalRef,
      Number(updatedWalletRow.available_balance || 0),
    ]
  );

  return {
    wallet: formatWallet(updatedWalletRow),
    transaction: formatWalletTransaction(txRes.rows[0]),
    duplicate: false,
  };
};

/**
 * GET /api/wallet/my-wallet
 * Retrieve authenticated user's wallet balance and summary.
 */
export const getMyWallet = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.profileId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    let walletRes = await query(
      "SELECT * FROM wallets WHERE creator_id::text = $1 LIMIT 1",
      [String(userId).trim()]
    );

    let wallet;
    if (walletRes.rows.length === 0) {
      const insertRes = await query(
        `INSERT INTO wallets (
          creator_id, available_balance, pending_withdrawal_balance, total_earned, total_withdrawn, currency
        ) VALUES ($1, 0, 0, 0, 0, 'INR')
        RETURNING *`,
        [userId]
      );
      wallet = formatWallet(insertRes.rows[0]);
    } else {
      wallet = formatWallet(walletRes.rows[0]);
    }

    const txRes = await query(
      `SELECT wt.*, c.title as campaign_title
       FROM wallet_transactions wt
       LEFT JOIN campaigns c ON c.id = wt.campaign_id
       WHERE wt.creator_id::text = $1
       ORDER BY wt.created_at DESC
       LIMIT 10`,
      [String(userId).trim()]
    );

    const recentTransactions = txRes.rows.map((row) => ({
      ...formatWalletTransaction(row),
      campaignId: row.campaign_id
        ? { _id: row.campaign_id, title: row.campaign_title || "" }
        : null,
    }));

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
    const userId = req.user?._id || req.user?.profileId;
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
    const receiptId = `DEP-${Date.now()}-${String(userId).slice(-4).toUpperCase()}`;

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
    const userId = req.user?._id || req.user?.profileId;
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
    await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, created_at)
       VALUES ($1, $2, 'wallet_deposit', $3, $4, $5)`,
      [
        userId,
        userId,
        `Successfully added ₹${depositAmount.toLocaleString("en-IN")} to your Pravixo Wallet. (Ref: ${gatewayPaymentId})`,
        req.user?.role === "brand" ? "/dashboard/brand?tab=wallet" : "/dashboard/creator?tab=wallet",
        Date.now(),
      ]
    ).catch((notifErr) => console.warn("Could not dispatch deposit notification:", notifErr));

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
    const creatorId = req.user?._id || req.user?.profileId;
    if (!creatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const [txRes, countRes] = await Promise.all([
      query(
        `SELECT wt.*, c.title as campaign_title, co.creator_amount, co.pravixo_fee
         FROM wallet_transactions wt
         LEFT JOIN campaigns c ON c.id = wt.campaign_id
         LEFT JOIN connections co ON co.id = wt.collaboration_id
         WHERE wt.creator_id::text = $1
         ORDER BY wt.created_at DESC
         OFFSET $2 LIMIT $3`,
        [String(creatorId).trim(), offset, limitNum]
      ),
      query(
        "SELECT count(*) FROM wallet_transactions WHERE creator_id::text = $1",
        [String(creatorId).trim()]
      ),
    ]);

    const total = Number(countRes.rows[0]?.count || 0);

    const transactions = txRes.rows.map((row) => ({
      ...formatWalletTransaction(row),
      campaignId: row.campaign_id
        ? { _id: row.campaign_id, title: row.campaign_title || "" }
        : null,
      collaborationId: row.collaboration_id
        ? {
            _id: row.collaboration_id,
            creatorAmount: Number(row.creator_amount || 0),
            pravixoFee: Number(row.pravixo_fee || 0),
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum) || 1,
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
    const creatorId = req.user?._id || req.user?.profileId;
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

    const MIN_WITHDRAWAL = 100;
    if (withdrawAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.`,
      });
    }

    // Check bank details in creator_bank_details table
    const bankRes = await query(
      "SELECT * FROM creator_bank_details WHERE creator_id::text = $1 LIMIT 1",
      [String(creatorId).trim()]
    );

    if (bankRes.rows.length === 0 || !bankRes.rows[0].account_number || !bankRes.rows[0].ifsc) {
      return res.status(400).json({
        success: false,
        message: "Please save your bank account details in Payment Settings before requesting a withdrawal.",
      });
    }

    const bankDetails = bankRes.rows[0];
    const accNum = bankDetails.account_number || "";
    const maskedAcc = accNum.length > 4 ? `••••••••${accNum.slice(-4)}` : accNum;

    const bankSnapshot = {
      accountHolderName: bankDetails.account_holder_name || bankDetails.full_name,
      bankName: bankDetails.bank_name,
      accountNumberMasked: maskedAcc,
      ifsc: bankDetails.ifsc,
      upiId: bankDetails.upi_id || "",
    };

    // Atomically reserve funds from available balance
    const walletUpdateRes = await query(
      `UPDATE wallets
       SET available_balance = available_balance - $1,
           pending_withdrawal_balance = pending_withdrawal_balance + $1,
           updated_at = NOW()
       WHERE creator_id::text = $2 AND available_balance >= $1
       RETURNING *`,
      [withdrawAmount, String(creatorId).trim()]
    );

    if (walletUpdateRes.rows.length === 0) {
      const currWalletRes = await query(
        "SELECT available_balance FROM wallets WHERE creator_id::text = $1",
        [String(creatorId).trim()]
      );
      const currentAvailable = Number(currWalletRes.rows[0]?.available_balance || 0);
      return res.status(400).json({
        success: false,
        message: `Insufficient available balance. You requested ₹${withdrawAmount.toLocaleString("en-IN")}, but only ₹${currentAvailable.toLocaleString("en-IN")} is available.`,
      });
    }

    const updatedWallet = formatWallet(walletUpdateRes.rows[0]);
    const referenceId = `WDR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create Withdrawal Record in Supabase
    const wdrRes = await query(
      `INSERT INTO withdrawals (
        creator_id, amount, currency, status, withdrawal_method, bank_details_snapshot, reference_id, requested_at
      ) VALUES ($1, $2, 'INR', 'PENDING', $3, $4, $5, $6)
      RETURNING *`,
      [
        creatorId,
        withdrawAmount,
        withdrawalMethod,
        JSON.stringify(bankSnapshot),
        referenceId,
        Date.now(),
      ]
    );

    const withdrawal = formatWithdrawal(wdrRes.rows[0]);

    // Log Wallet Transaction in Supabase
    const txRes = await query(
      `INSERT INTO wallet_transactions (
        creator_id, withdrawal_id, type, amount, currency, status, description, reference_id, balance_after
      ) VALUES ($1, $2, 'DEBIT', $3, 'INR', 'PENDING', $4, $5, $6)
      RETURNING *`,
      [
        creatorId,
        withdrawal.id,
        withdrawAmount,
        `Withdrawal request to ${bankDetails.bank_name} (${maskedAcc})`,
        referenceId,
        updatedWallet.availableBalance,
      ]
    );

    const transaction = formatWalletTransaction(txRes.rows[0]);

    // Fetch creator profile
    const creatorProfRes = await query(
      "SELECT full_name, email, handle FROM profiles WHERE id::text = $1 OR user_id = $1",
      [String(creatorId).trim()]
    );
    const creatorName = creatorProfRes.rows[0]?.full_name || "Creator";

    // 1. Notify Creator
    query(
      `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at)
       VALUES ($1, $2, 'withdrawal_requested', $3, '/dashboard/creator/wallet', $4, $5)`,
      [
        creatorId,
        creatorId,
        `Your withdrawal request of ₹${withdrawAmount.toLocaleString("en-IN")} (Ref: ${referenceId}) has been submitted and is pending admin review.`,
        JSON.stringify({ withdrawalId: withdrawal.id, amount: withdrawAmount, referenceId }),
        Date.now(),
      ]
    ).catch((e) => console.warn("Creator withdrawal notif error:", e.message));

    // 2. Notify Admins
    const adminsRes = await query("SELECT id FROM profiles WHERE role = 'admin' AND is_deleted = false");
    if (adminsRes.rows.length > 0) {
      const adminIds = adminsRes.rows.map((a) => a.id);
      for (const adminId of adminIds) {
        query(
          `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, created_at)
           VALUES ($1, $2, 'withdrawal_requested', $3, '/admin/payments', $4, $5)`,
          [
            adminId,
            creatorId,
            `Creator ${creatorName} requested a withdrawal of ₹${withdrawAmount.toLocaleString("en-IN")} (Ref: ${referenceId}).`,
            JSON.stringify({ withdrawalId: withdrawal.id, amount: withdrawAmount, referenceId }),
            Date.now(),
          ]
        ).catch((e) => console.warn("Admin withdrawal notif error:", e.message));
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
    const creatorId = req.user?._id || req.user?.profileId;
    if (!creatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const wdrRes = await query(
      "SELECT * FROM withdrawals WHERE creator_id::text = $1 ORDER BY requested_at DESC, created_at DESC",
      [String(creatorId).trim()]
    );

    return res.status(200).json({
      success: true,
      data: wdrRes.rows.map(formatWithdrawal),
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
