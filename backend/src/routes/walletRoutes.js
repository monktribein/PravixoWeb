import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getMyWallet,
  getMyTransactions,
  createDepositOrder,
  verifyDepositPayment,
  requestWithdrawal,
  getMyWithdrawals,
} from "../controllers/walletController.js";

const router = express.Router();

// GET /api/wallet/my-wallet
router.get("/my-wallet", protect, getMyWallet);

// GET /api/wallet/my-transactions
router.get("/my-transactions", protect, getMyTransactions);

// POST /api/wallet/deposit/order
router.post("/deposit/order", protect, createDepositOrder);

// POST /api/wallet/deposit/verify
router.post("/deposit/verify", protect, verifyDepositPayment);

// POST /api/wallet/withdraw
router.post("/withdraw", protect, requestWithdrawal);

// GET /api/wallet/my-withdrawals
router.get("/my-withdrawals", protect, getMyWithdrawals);

// GET /api/wallet/events (Server-Sent Events stream for payout.processed and wallet updates)
router.get("/events", protect, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  import("../services/payoutEventService.js").then(({ registerSSEClient }) => {
    registerSSEClient(req.user._id, res);
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  });
});

export default router;
