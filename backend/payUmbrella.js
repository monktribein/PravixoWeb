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
import Notification from "./src/models/Notification.js";

async function payUmbrellaCampaign() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("=== Connected to MongoDB ===");

    const brandProfile = await Profile.findOne({ fullName: /sachin/i, role: "brand" });
    const creatorProfile = await Profile.findOne({ fullName: /tannu/i, role: "creator" });
    const umbrellaCampaign = await Campaign.findOne({ title: /umbrella/i });

    if (!brandProfile || !creatorProfile || !umbrellaCampaign) {
      throw new Error("Could not find Brand, Creator, or Umbrella Campaign.");
    }

    console.log("Found Brand:", brandProfile.fullName, `(${brandProfile._id})`);
    console.log("Found Creator:", creatorProfile.fullName, `(${creatorProfile._id})`);
    console.log("Found Campaign:", umbrellaCampaign.title, `(${umbrellaCampaign._id})`);

    const connection = await Connection.findOne({
      brandId: brandProfile._id,
      creatorId: creatorProfile._id,
      campaignId: umbrellaCampaign._id,
    });

    if (!connection) {
      throw new Error("Connection request not found for Umbrella campaign.");
    }

    console.log("Found Connection ID:", connection._id.toString(), "Current Status:", connection.status, "PaymentStatus:", connection.paymentStatus);

    const now = Date.now();
    // Budget: 300 - 500 (default ₹500: creator ₹400 + Pravixo fee ₹100 = total ₹500)
    const brandTotal = 500;
    const pravixoFee = Math.round(brandTotal * 0.2); // 100
    const creatorAmount = brandTotal - pravixoFee; // 400

    const invoiceNumber = `INV-${now}-${connection._id.toString().slice(-4).toUpperCase()}`;
    const gatewayOrderId = `order_umb_${now}`;
    const gatewayPaymentId = `pay_umb_${now}`;

    // 1. Setup Payment Record
    let payment = await Payment.findOne({ connectionId: connection._id });
    if (!payment) {
      payment = await Payment.create({
        campaignId: umbrellaCampaign._id,
        connectionId: connection._id,
        brandId: brandProfile._id,
        creatorId: creatorProfile._id,
        paymentGateway: "razorpay",
        invoiceNumber,
        invoiceStatus: "paid",
        currency: "INR",
        grossAmount: brandTotal,
        platformCommissionPercentage: 20,
        platformCommissionAmount: pravixoFee,
        creatorAmount: creatorAmount,
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
      payment.grossAmount = brandTotal;
      payment.platformCommissionAmount = pravixoFee;
      payment.creatorAmount = creatorAmount;
      payment.gatewayPaymentId = gatewayPaymentId;
      payment.updatedAt = now;
      await payment.save();
    }

    await PaymentAuditLog.create({
      paymentId: payment._id,
      action: "Payment Secured",
      details: `Payment of ₹${brandTotal} (Creator: ₹${creatorAmount}, Pravixo Fee: ₹${pravixoFee}) verified and marked PAID for Umbrella Campaign.`,
      createdAt: now,
    });

    // 2. Setup Deliverables from Umbrella Campaign (2 Posts)
    const requiredPosts = umbrellaCampaign.deliverables?.posts || 2;
    const deliverablesTracking = [
      {
        type: "POST",
        requiredQuantity: requiredPosts,
        completedQuantity: 0,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 3. Mark Connection Accepted & PAID
    connection.status = "accepted";
    connection.paymentStatus = "PAID";
    connection.paymentId = payment._id;
    connection.agreedAmount = brandTotal;
    connection.brandTotal = brandTotal;
    connection.creatorAmount = creatorAmount;
    connection.pravixoFee = pravixoFee;
    connection.deliverablesTracking = deliverablesTracking;
    connection.allDeliverablesCompleted = false;
    connection.paidAt = now;
    connection.updatedAt = now;
    await connection.save();

    console.log("✅ Connection updated: Status = accepted, PaymentStatus = PAID");

    // 4. Create/Get Conversation and post [Escrow Funded] message
    let conversation = await Conversation.findOne({
      creatorId: creatorProfile._id,
      brandId: brandProfile._id,
      campaignId: umbrellaCampaign._id,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        creatorId: creatorProfile._id,
        brandId: brandProfile._id,
        campaignId: umbrellaCampaign._id,
        conversationType: "brand_creator",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Collaboration Accepted Message
    await Message.create({
      conversationId: conversation._id,
      senderId: brandProfile._id,
      text: `[Collaboration Approved] 🎉 ${brandProfile.fullName} approved your application for "${umbrellaCampaign.title}".`,
      messageType: "system",
      metadata: {
        campaignId: umbrellaCampaign._id,
        connectionId: connection._id,
      },
      read: false,
    });

    // Escrow Funded Message
    const escrowMsg = await Message.create({
      conversationId: conversation._id,
      senderId: brandProfile._id,
      text: `[Escrow Funded] 💳 ${brandProfile.fullName} deposited ₹${brandTotal.toLocaleString()} to Pravixo Escrow for "${umbrellaCampaign.title}". Creator payout of ₹${creatorAmount.toLocaleString()} (after 20% platform fee) is now 100% secured. Creator can now start work on 2 Posts!`,
      messageType: "system",
      metadata: {
        paymentId: payment._id,
        grossAmount: brandTotal,
        creatorAmount: creatorAmount,
        platformFee: pravixoFee,
        status: "PAID",
      },
      read: false,
    });

    // Notifications
    await Notification.create({
      recipientId: creatorProfile._id,
      senderId: brandProfile._id,
      type: "payment_secured",
      text: `${brandProfile.fullName} has paid Pravixo ₹${brandTotal.toLocaleString()} for "${umbrellaCampaign.title}". You can now start and submit your 2 Posts deliverables!`,
      targetUrl: "/dashboard/influencer",
      createdAt: now,
    });

    await Notification.create({
      recipientId: brandProfile._id,
      senderId: creatorProfile._id,
      type: "payment_successful",
      text: `Your Escrow payment of ₹${brandTotal.toLocaleString()} for "${umbrellaCampaign.title}" is secured. Creator ${creatorProfile.fullName} has been notified to begin work.`,
      targetUrl: "/dashboard/customer",
      createdAt: now,
    });

    console.log("\n==========================================");
    console.log("🎉 UMBRELLA CAMPAIGN ESCROW PAYMENT COMPLETED!");
    console.log("==========================================");
    console.log("Campaign:           ", umbrellaCampaign.title);
    console.log("Brand:              ", brandProfile.fullName);
    console.log("Creator:            ", creatorProfile.fullName);
    console.log("Brand Paid (Escrow):", `₹${brandTotal}`);
    console.log("Creator Payout Lock:", `₹${creatorAmount} (after ₹${pravixoFee} fee)`);
    console.log("Required Work:      ", `${requiredPosts} Posts`);
    console.log("Invoice No:         ", invoiceNumber);
    console.log("Payment Status:     ", payment.paymentStatus);
    console.log("Chat Notification:  ", escrowMsg.text);
    console.log("==========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Error paying Umbrella campaign:", err);
    process.exit(1);
  }
}

payUmbrellaCampaign();
