import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },

    collaborationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Connection",
      default: null,
      index: true,
    },

    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
      index: true,
    },

    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payout",
      default: null,
    },

    withdrawalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      default: "CREDIT",
      required: true,
    },

    transaction_type: {
      type: String,
      enum: [
        "collaboration",
        "payout",
        "project_payout",
        "withdrawal",
        "referral_commission",
        "refund_reversal",
        "deposit",
        "escrow_payment",
      ],
      default: "collaboration",
    },

    related_transaction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
      index: true,
    },

    related_referral_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReferralRelationship",
      default: null,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED", "reversed"],
      default: "COMPLETED",
      index: true,
    },

    description: {
      type: String,
      default: "Collaboration payment release",
    },

    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    balanceAfter: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

walletTransactionSchema.index({ creatorId: 1, createdAt: -1 });
walletTransactionSchema.index({ payoutId: 1 }, { unique: true, sparse: true });

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

export default WalletTransaction;
