import express from "express";
import { protect } from "../middleware/auth.js";

import {
  initiatePaymentOrder,
  verifyPaymentSignatureController,
  refundPayment,
  raiseDispute,
  handleWebhookEvent,
  saveCreatorBankDetails,
  getCreatorBankDetails,
  getPaymentsForBrand,
  getPaymentsForCreator,
  initiateCollaborationPayment,
  verifyCollaborationPayment,
  payCollaborationWithWallet,
} from "../controllers/paymentController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Task 4: Collaboration Payment (Brand -> Pravixo)
|--------------------------------------------------------------------------
*/

router.post(
  "/collaboration/:connectionId/order",
  protect,
  initiateCollaborationPayment
);

router.post(
  "/collaboration/:connectionId/verify",
  protect,
  verifyCollaborationPayment
);

router.post(
  "/collaboration/:connectionId/pay-with-wallet",
  protect,
  payCollaborationWithWallet
);

/*
|--------------------------------------------------------------------------
| Payment Order
|--------------------------------------------------------------------------
*/

router.post(
  "/:paymentId/order",
  initiatePaymentOrder
);

/*
|--------------------------------------------------------------------------
| Verify Payment
|--------------------------------------------------------------------------
*/

router.post(
  "/:paymentId/verify",
  verifyPaymentSignatureController
);

/*
|--------------------------------------------------------------------------
| Refund Payment
|--------------------------------------------------------------------------
*/

router.post(
  "/:paymentId/refund",
  refundPayment
);

/*
|--------------------------------------------------------------------------
| Dispute
|--------------------------------------------------------------------------
*/

router.post(
  "/:paymentId/dispute",
  raiseDispute
);

/*
|--------------------------------------------------------------------------
| Creator Bank Details
|--------------------------------------------------------------------------
*/

router.post(
  "/bank-details",
  saveCreatorBankDetails
);

router.get(
  "/bank-details/:creatorId",
  getCreatorBankDetails
);

/*
|--------------------------------------------------------------------------
| Payment History
|--------------------------------------------------------------------------
*/

router.get(
  "/brand/:brandId",
  getPaymentsForBrand
);

router.get(
  "/creator/:creatorId",
  getPaymentsForCreator
);

/*
|--------------------------------------------------------------------------
| Razorpay Webhook
|--------------------------------------------------------------------------
*/

router.post(
  "/webhook",
  express.raw({
    type: "application/json",
  }),
  handleWebhookEvent
);

export default router;