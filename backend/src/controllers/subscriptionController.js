import { query } from "../config/postgres.js";
import {
  formatSubscriptionPackage,
  formatSubscriptionOffer,
  formatUserSubscription,
} from "../utils/formatters.js";

const resolveProfileId = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT id FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [idOrUserId]
  );
  return res.rows[0]?.id || null;
};

// =====================================================
// GET SUBSCRIPTION PACKAGES
// =====================================================
export const getPackages = async (req, res) => {
  try {
    const roleQuery = (req.query.role || "").toLowerCase();

    // Default packages
    const defaultBrandPackages = [
      {
        name: "Basic",
        price: 5000,
        originalPrice: 10000,
        billingPeriod: "month",
        badge: "50% OFF",
        targetRole: "brand",
        features: [
          "5 Verified Creators Included",
          "Creator Communication & Shortlisting on Brand's behalf",
          "Creative Guidelines & Video Direction Strategy",
          "Milestone & Work Status Quality Checks",
          "Follow-up Analytics & Performance Tracking",
          "Dedicated Campaign Assistance",
        ],
        sortOrder: 1,
        active: true,
      },
      {
        name: "Pro",
        price: 10000,
        originalPrice: 20000,
        billingPeriod: "month",
        badge: "50% OFF POPULAR",
        targetRole: "brand",
        features: [
          "15 Verified Creators Included",
          "End-to-End Creator Outreach & Contract Negotiations",
          "Custom Creative Brief & Script Supervision",
          "Real-time Work Status & Deliverable Review",
          "In-depth Follow-up Analytics & ROI Reporting",
          "Escrow Milestone Payment Security",
          "Priority Brand Support",
        ],
        sortOrder: 2,
        active: true,
      },
      {
        name: "Elite",
        price: 25000,
        originalPrice: 50000,
        billingPeriod: "month",
        badge: "50% OFF ELITE",
        targetRole: "brand",
        features: [
          "50 Verified Creators Included",
          "Full-Service Influencer Management & VIP Shortlisting",
          "Custom Storyboards, Hook & Video Production Guidelines",
          "Live Work Status Monitoring & Multi-tier Quality Audits",
          "Advanced Follow-up Analytics, Heatmaps & Full Report Export",
          "1-on-1 Dedicated Campaign Account Manager",
          "24/7 VIP Priority Support & Legal Escrow Protection",
        ],
        sortOrder: 3,
        active: true,
      },
    ];

    const defaultCreatorPackages = [
      {
        name: "Basic",
        price: 0,
        originalPrice: 0,
        billingPeriod: "free",
        badge: "Free Starter",
        targetRole: "creator",
        features: [
          "Creator Portfolio & Media Kit",
          "Apply up to 5 Campaigns/month",
          "Standard Discovery Listing",
          "5% Tiered Referral Commission",
          "Direct Brand Chat & Collaboration Invitations",
        ],
        sortOrder: 1,
        active: true,
      },
      {
        name: "Pro",
        price: 999,
        originalPrice: 1999,
        billingPeriod: "month",
        badge: "Recommended",
        targetRole: "creator",
        features: [
          "Everything in Basic",
          "Unlimited Campaign Applications",
          "Priority Listing in Brand Discovery",
          "Verified Creator Badge",
          "Live Social Media Sync & Analytics",
          "Zero Platform Commission on Deals",
        ],
        sortOrder: 2,
        active: true,
      },
      {
        name: "Elite",
        price: 2499,
        originalPrice: 4999,
        billingPeriod: "month",
        badge: "VIP Creator",
        targetRole: "creator",
        features: [
          "Everything in Pro",
          "Featured on Homepage & Brand Newsletters",
          "Dedicated Talent Manager",
          "Guaranteed Brand Collab Introductions",
          "Same-Day Instant Escrow Release",
          "VIP 24/7 WhatsApp Support",
        ],
        sortOrder: 3,
        active: true,
      },
    ];

    let dbPackagesRes = await query(
      `SELECT * FROM subscription_packages WHERE active = true ORDER BY sort_order ASC;`
    );

    // Seed defaults if empty
    if (dbPackagesRes.rows.length === 0) {
      const allDefaults = [...defaultBrandPackages, ...defaultCreatorPackages];
      for (const p of allDefaults) {
        await query(
          `
          INSERT INTO subscription_packages (
            name, price, original_price, billing_period, badge, target_role, features, sort_order, active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9);
          `,
          [
            p.name,
            p.price,
            p.originalPrice,
            p.billingPeriod,
            p.badge,
            p.targetRole,
            JSON.stringify(p.features),
            p.sortOrder,
            p.active,
          ]
        );
      }

      dbPackagesRes = await query(
        `SELECT * FROM subscription_packages WHERE active = true ORDER BY sort_order ASC;`
      );
    }

    let packages = dbPackagesRes.rows.map(formatSubscriptionPackage);

    if (roleQuery === "brand" || roleQuery === "creator") {
      packages = packages.filter((p) => p.targetRole === roleQuery || p.targetRole === "both");
    }

    return res.status(200).json({
      success: true,
      data: packages,
    });
  } catch (error) {
    console.error("Get subscription packages error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription packages.",
    });
  }
};

// =====================================================
// GET ACTIVE OFFERS
// =====================================================
export const getOffers = async (req, res) => {
  try {
    const roleQuery = (req.query.role || "").toLowerCase();
    const now = Date.now();

    const { rows } = await query(
      `
      SELECT
        so.*,
        row_to_json(sp.*) as package
      FROM subscription_offers so
      LEFT JOIN subscription_packages sp ON sp.id = so.package_id
      WHERE so.active = true AND so.expiry_date > $1
      ORDER BY so.created_at DESC;
      `,
      [now]
    );

    let offers = rows.map((r) => ({
      ...formatSubscriptionOffer(r),
      package: formatSubscriptionPackage(r.package),
    }));

    if (roleQuery === "brand") {
      offers = offers.filter((o) => o.targetUsers === "brands" || o.targetUsers === "both");
    } else if (roleQuery === "creator") {
      offers = offers.filter((o) => o.targetUsers === "creators" || o.targetUsers === "both");
    }

    return res.status(200).json({
      success: true,
      data: offers,
    });
  } catch (error) {
    console.error("Get subscription offers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription offers.",
    });
  }
};

// =====================================================
// GET USER SUBSCRIPTION
// =====================================================
export const getUserSubscription = async (req, res) => {
  try {
    const { profileId } = req.params;
    const resolvedId = await resolveProfileId(profileId);

    if (!resolvedId) {
      return res.status(200).json({
        success: true,
        data: null,
        pending: null,
      });
    }

    const { rows } = await query(
      `
      SELECT
        us.*,
        row_to_json(sp.*) as package,
        row_to_json(so.*) as offer
      FROM user_subscriptions us
      LEFT JOIN subscription_packages sp ON sp.id = us.package_id
      LEFT JOIN subscription_offers so ON so.id = us.offer_id
      WHERE us.profile_id = $1 AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1;
      `,
      [resolvedId]
    );

    let activeSub = rows[0] || null;

    if (activeSub && activeSub.expiry_date && Number(activeSub.expiry_date) < Date.now()) {
      await query(`UPDATE user_subscriptions SET status = 'expired', updated_at = NOW() WHERE id = $1;`, [activeSub.id]);
      activeSub = null;
    }

    await query(
      `UPDATE user_subscriptions SET status = 'cancelled', updated_at = NOW() WHERE profile_id = $1 AND status = 'pending';`,
      [resolvedId]
    );

    let formattedData = null;
    if (activeSub) {
      formattedData = {
        ...formatUserSubscription(activeSub),
        packageId: formatSubscriptionPackage(activeSub.package),
        offerId: formatSubscriptionOffer(activeSub.offer),
      };
    }

    return res.status(200).json({
      success: true,
      data: formattedData,
      pending: null,
    });
  } catch (error) {
    console.error("Get user subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user subscription.",
    });
  }
};

// ==========================================
// INITIATE SUBSCRIPTION ORDER
// ==========================================
export const createSubscriptionOrder = async (req, res) => {
  try {
    const { profileId, packageId, offerId } = req.body;

    if (!profileId || !packageId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID and Package ID are required.",
      });
    }

    const resolvedId = await resolveProfileId(profileId);
    if (!resolvedId) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const pkgRes = await query(
      `SELECT * FROM subscription_packages WHERE id::text = $1 AND active = true LIMIT 1;`,
      [packageId]
    );

    if (pkgRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription package not found or inactive.",
      });
    }

    const pkg = pkgRes.rows[0];
    let finalPrice = Number(pkg.price);

    let appliedOffer = null;
    if (offerId) {
      const offerRes = await query(
        `SELECT * FROM subscription_offers WHERE id::text = $1 AND active = true AND expiry_date > $2 LIMIT 1;`,
        [offerId, Date.now()]
      );
      if (offerRes.rows.length > 0) {
        appliedOffer = offerRes.rows[0];
        if (appliedOffer.discount_percentage) {
          finalPrice = Math.round(finalPrice * (1 - Number(appliedOffer.discount_percentage) / 100));
        }
      }
    }

    const receiptId = `SUB-${Date.now()}-${resolvedId.slice(-4).toUpperCase()}`;

    const { createOrder } = await import("../services/paymentServices.js");
    const order = await createOrder({
      amount: Math.max(1, finalPrice),
      currency: "INR",
      receiptId,
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency || "INR",
        keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
        package: {
          id: pkg.id,
          name: pkg.name,
          price: finalPrice,
          billingPeriod: pkg.billing_period,
        },
        offerId: appliedOffer?.id || undefined,
      },
    });
  } catch (error) {
    console.error("Create subscription order error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initiate payment gateway for subscription.",
    });
  }
};

// ==========================================
// VERIFY SUBSCRIPTION PAYMENT & DIRECT ACTIVATION
// ==========================================
export const verifySubscriptionPayment = async (req, res) => {
  try {
    const {
      profileId,
      packageId,
      offerId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!profileId || !packageId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID and Package ID are required.",
      });
    }

    const profRes = await query(`SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1;`, [profileId]);
    if (profRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }
    const profile = profRes.rows[0];

    const pkgRes = await query(`SELECT * FROM subscription_packages WHERE id::text = $1 LIMIT 1;`, [packageId]);
    if (pkgRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription package not found.",
      });
    }
    const pkg = pkgRes.rows[0];

    if (razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      const { verifySignature } = await import("../services/paymentServices.js");
      const isValid = verifySignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      });
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Payment signature verification failed.",
        });
      }
    }

    const startDate = Date.now();
    let expiryDate;
    const billingPeriod = (pkg.billing_period || "month").toLowerCase();

    if (billingPeriod.includes("year") || billingPeriod.includes("annual")) {
      expiryDate = startDate + 365 * 24 * 60 * 60 * 1000;
    } else if (billingPeriod.includes("month")) {
      expiryDate = startDate + 30 * 24 * 60 * 60 * 1000;
    } else if (billingPeriod.includes("week")) {
      expiryDate = startDate + 7 * 24 * 60 * 60 * 1000;
    } else {
      expiryDate = startDate + 30 * 24 * 60 * 60 * 1000;
    }

    // Expire previous subscriptions
    await query(
      `UPDATE user_subscriptions SET status = 'expired', updated_at = NOW() WHERE profile_id = $1 AND status = 'active';`,
      [profile.id]
    );

    const insRes = await query(
      `
      INSERT INTO user_subscriptions (
        profile_id, package_id, offer_id, start_date, expiry_date,
        status, amount_paid, razorpay_order_id, razorpay_payment_id, razorpay_signature
      ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9)
      RETURNING *;
      `,
      [
        profile.id,
        pkg.id,
        offerId || null,
        startDate,
        expiryDate,
        Number(pkg.price),
        razorpayOrderId || null,
        razorpayPaymentId || null,
        razorpaySignature || null,
      ]
    );

    const subscription = insRes.rows[0];

    // Notify admins
    try {
      const adminRes = await query(`SELECT id FROM profiles WHERE role = 'admin';`);
      const userTypeLabel = profile.role === "creator" ? "Creator" : profile.role === "brand" ? "Brand" : "User";
      const notifText = `🎉 ${userTypeLabel} "${profile.full_name}" purchased the "${pkg.name}" plan (₹${pkg.price}/${pkg.billing_period}) via direct payment!`;

      for (const admin of adminRes.rows) {
        await query(
          `
          INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
          VALUES ($1, $2, 'subscription_activated', $3, '/subscriptions', false, NOW());
          `,
          [admin.id, profile.id, notifText]
        );
      }
    } catch (notifErr) {
      console.error("Failed to notify admins of subscription purchase:", notifErr);
    }

    return res.status(200).json({
      success: true,
      message: `Congratulations! Your ${pkg.name} plan has been activated successfully.`,
      data: {
        ...formatUserSubscription(subscription),
        packageId: formatSubscriptionPackage(pkg),
      },
    });
  } catch (error) {
    console.error("Verify subscription payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to activate subscription.",
    });
  }
};

// ==========================================
// CREATE SUBSCRIPTION (DIRECT ACTIVATION FALLBACK)
// ==========================================
export const createSubscription = async (req, res) => {
  try {
    const { profileId, packageId, offerId } = req.body;

    if (!profileId || !packageId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID and Package ID are required.",
      });
    }

    const profRes = await query(`SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1;`, [profileId]);
    if (profRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }
    const profile = profRes.rows[0];

    const pkgRes = await query(`SELECT * FROM subscription_packages WHERE id::text = $1 AND active = true LIMIT 1;`, [packageId]);
    if (pkgRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription package not found or inactive.",
      });
    }
    const subscriptionPackage = pkgRes.rows[0];

    const startDate = Date.now();
    let expiryDate;
    const billingPeriod = (subscriptionPackage.billing_period || "month").toLowerCase();

    if (billingPeriod.includes("year") || billingPeriod.includes("annual")) {
      expiryDate = startDate + 365 * 24 * 60 * 60 * 1000;
    } else if (billingPeriod.includes("month")) {
      expiryDate = startDate + 30 * 24 * 60 * 60 * 1000;
    } else {
      expiryDate = startDate + 30 * 24 * 60 * 60 * 1000;
    }

    await query(
      `UPDATE user_subscriptions SET status = 'expired', updated_at = NOW() WHERE profile_id = $1 AND status = 'active';`,
      [profile.id]
    );

    const insRes = await query(
      `
      INSERT INTO user_subscriptions (
        profile_id, package_id, offer_id, start_date, expiry_date, status, amount_paid
      ) VALUES ($1, $2, $3, $4, $5, 'active', $6)
      RETURNING *;
      `,
      [
        profile.id,
        subscriptionPackage.id,
        offerId || null,
        startDate,
        expiryDate,
        Number(subscriptionPackage.price),
      ]
    );

    const subscription = insRes.rows[0];

    // Notify Admins
    try {
      const adminRes = await query(`SELECT id FROM profiles WHERE role = 'admin';`);
      const userTypeLabel = profile.role === "creator" ? "Creator" : profile.role === "brand" ? "Brand" : "User";
      const notifText = `🎉 ${userTypeLabel} "${profile.full_name}" activated the "${subscriptionPackage.name}" plan (₹${subscriptionPackage.price}/${subscriptionPackage.billing_period}).`;

      for (const admin of adminRes.rows) {
        await query(
          `
          INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
          VALUES ($1, $2, 'subscription_activated', $3, '/subscriptions', false, NOW());
          `,
          [admin.id, profile.id, notifText]
        );
      }
    } catch (notifErr) {
      console.error("Failed to create admin notification:", notifErr);
    }

    return res.status(201).json({
      success: true,
      message: `Your ${subscriptionPackage.name} plan is now active!`,
      data: {
        ...formatUserSubscription(subscription),
        packageId: formatSubscriptionPackage(subscriptionPackage),
      },
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create subscription.",
    });
  }
};

// ==========================================
// CANCEL SUBSCRIPTION
// ==========================================
export const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const findRes = await query(`SELECT * FROM user_subscriptions WHERE id::text = $1;`, [subscriptionId]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    const subscription = findRes.rows[0];
    if (subscription.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Subscription is already cancelled.",
      });
    }

    const updRes = await query(
      `UPDATE user_subscriptions SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [subscription.id]
    );

    return res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully.",
      data: formatUserSubscription(updRes.rows[0]),
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel subscription.",
    });
  }
};