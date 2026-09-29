import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import Profile from "./src/models/Profile.js";
import Campaign from "./src/models/Campaign.js";
import Connection from "./src/models/Connection.js";
import Conversation from "./src/models/Conversation.js";
import Message from "./src/models/Message.js";
import Payment from "./src/models/Payment.js";
import PaymentAuditLog from "./src/models/PaymentAuditLog.js";
import Submission from "./src/models/Submission.js";
import Payout from "./src/models/Payout.js";
import Wallet from "./src/models/Wallet.js";
import WalletTransaction from "./src/models/WalletTransaction.js";
import Notification from "./src/models/Notification.js";

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("=== Connected to MongoDB ===");

    // 1. Fetch Brand (Sachin) & Creator (Tannuu)
    const brandProfile = await Profile.findOne({ fullName: /sachin/i, role: "brand" });
    const creatorProfile = await Profile.findOne({ fullName: /tannu/i, role: "creator" });
    const mysteryCampaign = await Campaign.findOne({ title: /mystery box/i });

    console.log("Brand:", brandProfile?._id?.toString(), "-", brandProfile?.fullName);
    console.log("Creator:", creatorProfile?._id?.toString(), "-", creatorProfile?.fullName);
    console.log("Campaign:", mysteryCampaign?._id?.toString(), "-", mysteryCampaign?.title);

    if (!brandProfile || !creatorProfile || !mysteryCampaign) {
      throw new Error("Could not find Brand, Creator, or Mystery Box Campaign.");
    }

    // 2. Setup Connection
    let connection = await Connection.findOne({
      brandId: brandProfile._id,
      creatorId: creatorProfile._id,
      campaignId: mysteryCampaign._id,
    });

    const now = Date.now();

    if (!connection) {
      connection = await Connection.create({
        brandId: brandProfile._id,
        creatorId: creatorProfile._id,
        campaignId: mysteryCampaign._id,
        status: "accepted",
        paymentStatus: "PENDING",
        agreedAmount: 1000,
        creatorAmount: 800,
        pravixoFee: 200,
        brandTotal: 1000,
        deliverablesTracking: [
          {
            type: "REEL",
            requiredQuantity: 1,
            completedQuantity: 0,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log("Connection ID:", connection._id.toString());

    // 3. STEP 1: Process Escrow Payment (Brand -> Pravixo)
    const invoiceNumber = `INV-${now}-MYSTERY`;
    const gatewayOrderId = `order_test_${now}`;
    const gatewayPaymentId = `pay_test_${now}`;

    let payment = await Payment.findOne({ connectionId: connection._id });
    if (!payment) {
      payment = await Payment.create({
        campaignId: mysteryCampaign._id,
        connectionId: connection._id,
        brandId: brandProfile._id,
        creatorId: creatorProfile._id,
        paymentGateway: "razorpay",
        invoiceNumber,
        invoiceStatus: "paid",
        currency: "INR",
        grossAmount: 1000,
        platformCommissionPercentage: 20,
        platformCommissionAmount: 200,
        creatorAmount: 800,
        paymentStatus: "payment_successful",
        gatewayOrderId,
        gatewayPaymentId,
        gatewaySignature: "mock_signature",
        gatewayStatus: "captured",
        transactionReference: `TXN-${gatewayPaymentId}`,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      payment.paymentStatus = "payment_successful";
      payment.invoiceStatus = "paid";
      payment.grossAmount = 1000;
      payment.creatorAmount = 800;
      payment.platformCommissionAmount = 200;
      payment.gatewayPaymentId = gatewayPaymentId;
      payment.updatedAt = now;
      await payment.save();
    }

    await PaymentAuditLog.create({
      paymentId: payment._id,
      action: "Payment Secured",
      details: `Payment of ₹1,000 (Creator: ₹800, Pravixo Fee: ₹200) verified and marked PAID.`,
      createdAt: now,
    });

    connection.paymentStatus = "PAID";
    connection.paymentId = payment._id;
    connection.paidAt = now;
    connection.creatorAmount = 800;
    connection.pravixoFee = 200;
    connection.brandTotal = 1000;
    connection.deliverablesTracking = [
      {
        type: "REEL",
        requiredQuantity: 1,
        completedQuantity: 0,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      },
    ];
    connection.updatedAt = now;
    await connection.save();

    console.log("✅ Step 1 Success: Escrow Payment Secured & Connection marked PAID");

    // 4. STEP 2: Conversation & Escrow Funded Message
    let conversation = await Conversation.findOne({
      creatorId: creatorProfile._id,
      brandId: brandProfile._id,
      campaignId: mysteryCampaign._id,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        creatorId: creatorProfile._id,
        brandId: brandProfile._id,
        campaignId: mysteryCampaign._id,
        conversationType: "brand_creator",
        status: "active",
      });
    }

    await Message.create({
      conversationId: conversation._id,
      senderId: brandProfile._id,
      text: `[Escrow Funded] 💳 ${brandProfile.fullName} deposited ₹1,000 to Pravixo Escrow for "${mysteryCampaign.title}". Creator payout of ₹800 (after 20% platform fee) is now 100% secured. Creator can now start work!`,
      messageType: "system",
      metadata: {
        paymentId: payment._id,
        grossAmount: 1000,
        creatorAmount: 800,
        platformFee: 200,
        status: "PAID",
      },
      read: false,
    });

    console.log("✅ Step 2 Success: [Escrow Funded] System message posted to Chat History");

    // 5. STEP 3: Creator submits deliverable proof for mystery box
    const submissionUrl = "https://res.cloudinary.com/demo/video/upload/v1/mystery_box_unboxing.mp4";
    const submission = await Submission.create({
      connectionId: connection._id,
      campaignId: mysteryCampaign._id,
      brandId: brandProfile._id,
      creatorId: creatorProfile._id,
      deliverableType: "REEL",
      contentUrl: submissionUrl,
      caption: "Mystery box unboxing reel created with full branded tags! ✨🎁",
      status: "SUBMITTED",
      version: 1,
      submittedAt: now + 5000,
      createdAt: now + 5000,
      updatedAt: now + 5000,
    });

    await Message.create({
      conversationId: conversation._id,
      senderId: creatorProfile._id,
      text: `[Deliverable Submission] ${creatorProfile.fullName} submitted REEL #1: "Mystery box unboxing reel created with full branded tags! ✨🎁"`,
      messageType: "deliverable_submission",
      metadata: {
        submissionId: submission._id,
        deliverableType: "REEL",
        contentUrl: submissionUrl,
        caption: "Mystery box unboxing reel created with full branded tags! ✨🎁",
        status: "SUBMITTED",
        submittedAt: now + 5000,
        sequenceNumber: 1,
        requiredQuantity: 1,
      },
      read: false,
    });

    console.log("✅ Step 3 Success: Deliverable Submitted by Creator & Posted in Chat");

    // 6. STEP 4: Brand approves deliverable
    submission.status = "APPROVED";
    submission.approvedAt = now + 10000;
    submission.updatedAt = now + 10000;
    await submission.save();

    connection.deliverablesTracking[0].completedQuantity = 1;
    connection.deliverablesTracking[0].status = "COMPLETED";
    connection.deliverablesTracking[0].updatedAt = now + 10000;
    connection.allDeliverablesCompleted = true;
    connection.workCompletedAt = now + 10000;
    connection.approvalCompletedAt = now + 10000;
    connection.paymentReleaseEligibleAt = now + 10000;
    connection.paymentReleaseStatus = "ELIGIBLE_FOR_RELEASE";
    connection.updatedAt = now + 10000;
    await connection.save();

    await Message.create({
      conversationId: conversation._id,
      senderId: brandProfile._id,
      text: `[Deliverable Approved] ${brandProfile.fullName} approved REEL submission (v1) (1/1 approved).`,
      messageType: "deliverable_submission",
      metadata: {
        submissionId: submission._id,
        deliverableType: "REEL",
        contentUrl: submissionUrl,
        status: "APPROVED",
        version: 1,
        reviewedAt: now + 10000,
        approvedCount: 1,
        requiredQuantity: 1,
      },
      read: false,
    });

    await Message.create({
      conversationId: conversation._id,
      senderId: brandProfile._id,
      text: `[Campaign Work Completed] 🎉 All campaign deliverables for "${mysteryCampaign.title}" have been approved by ${brandProfile.fullName}! The 72-hour review period has commenced.`,
      messageType: "system",
      metadata: {
        connectionId: connection._id,
        allDeliverablesCompleted: true,
        completedAt: now + 10000,
      },
      read: false,
    });

    console.log("✅ Step 4 Success: Brand Approved Deliverables & Triggered Work Completed Status");

    // 7. STEP 5: Payout Release & Creator Wallet Credit (₹800)
    const adminProfile = await Profile.findOne({ role: "admin" }) || brandProfile;
    const txRef = `PAYOUT-${Date.now()}-MYSTERY`;
    const payout = await Payout.create({
      collaborationId: connection._id,
      paymentId: payment._id,
      campaignId: mysteryCampaign._id,
      brandId: brandProfile._id,
      creatorId: creatorProfile._id,
      amount: 800,
      currency: "INR",
      status: "COMPLETED",
      payoutMethod: "MANUAL_BANK_TRANSFER",
      transactionReference: txRef,
      initiatedBy: adminProfile._id,
      initiatedAt: now + 15000,
      completedAt: now + 15000,
      notes: "Escrow release verified test for Mystery Box Campaign",
    });

    connection.paymentReleaseStatus = "RELEASED";
    connection.payoutId = payout._id;
    connection.payoutReleasedAt = now + 15000;
    connection.updatedAt = now + 15000;
    await connection.save();

    payment.paymentStatus = "completed";
    payment.holdingStatus = "released";
    payment.payoutStatus = "processed";
    payment.releasedAt = now + 15000;
    payment.payoutReference = txRef;
    payment.updatedAt = now + 15000;
    await payment.save();

    await PaymentAuditLog.create({
      paymentId: payment._id,
      action: "Payout Released",
      details: `Admin released Creator payout of ₹800. Ref: ${txRef}`,
      createdAt: now + 15000,
    });

    // Credit Creator Wallet
    let wallet = await Wallet.findOne({ creatorId: creatorProfile._id });
    if (!wallet) {
      wallet = await Wallet.create({
        creatorId: creatorProfile._id,
        availableBalance: 800,
        pendingWithdrawalBalance: 0,
        totalEarned: 800,
        totalWithdrawn: 0,
        currency: "INR",
      });
    } else {
      wallet.availableBalance = (wallet.availableBalance || 0) + 800;
      wallet.totalEarned = (wallet.totalEarned || 0) + 800;
      await wallet.save();
    }

    await WalletTransaction.create({
      creatorId: creatorProfile._id,
      amount: 800,
      type: "CREDIT",
      category: "EARNING",
      status: "COMPLETED",
      description: `Payout for campaign ${mysteryCampaign.title} (Escrow released)`,
      collaborationId: connection._id,
      campaignId: mysteryCampaign._id,
      payoutId: payout._id,
      referenceId: txRef,
      createdAt: now + 15000,
    });

    await Message.create({
      conversationId: conversation._id,
      senderId: brandProfile._id,
      text: `[Payout Released] Admin released creator payout of ₹800. Transaction Ref: ${txRef}. Collaboration complete.`,
      messageType: "system",
      metadata: {
        payoutId: payout._id,
        amount: 800,
        transactionReference: txRef,
        releasedAt: now + 15000,
      },
      read: false,
    });

    console.log("✅ Step 5 Success: Wallet Credited ₹800 to Tannuu & Payout Recorded");

    // 8. FINAL SNAPSHOT AUDIT
    const finalWallet = await Wallet.findOne({ creatorId: creatorProfile._id }).lean();
    const finalPayment = await Payment.findOne({ connectionId: connection._id }).lean();
    const finalMsgs = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }).lean();
    const finalSubmissions = await Submission.find({ connectionId: connection._id }).lean();

    console.log("\n==========================================");
    console.log("🎉 FULL COLLABORATION LIFECYCLE AUDIT REPORT");
    console.log("==========================================");
    console.log("Campaign Title:       ", mysteryCampaign.title);
    console.log("Brand:                ", brandProfile.fullName, `(${brandProfile._id})`);
    console.log("Creator:              ", creatorProfile.fullName, `(${creatorProfile._id})`);
    console.log("Escrow Payment:       ", `Gross ₹${finalPayment.grossAmount} (Pravixo Fee: ₹${finalPayment.platformCommissionAmount}, Creator: ₹${finalPayment.creatorAmount})`);
    console.log("Payment Invoice:      ", finalPayment.invoiceNumber);
    console.log("Payment Status:       ", finalPayment.paymentStatus);
    console.log("Deliverables Submitted:", finalSubmissions.length, `(Status: ${finalSubmissions[0]?.status})`);
    console.log("Creator Available Bal:", `₹${finalWallet.availableBalance}`);
    console.log("Creator Total Earned: ", `₹${finalWallet.totalEarned}`);
    console.log("Total Chat Messages:  ", finalMsgs.length);
    console.log("\nChat Trail:");
    finalMsgs.forEach((m, idx) => {
      console.log(`  [${idx + 1}] ${m.text}`);
    });
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

runTest();
