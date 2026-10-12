import "dotenv/config";
import nodemailer from "nodemailer";
import { query } from "../config/postgres.js";

// =====================================
// BASE EMAIL SENDER (Nodemailer / Vercel Proxy)
// =====================================
export const sendEmail = async ({ to, subject, html, text, origin }) => {
  // 1. Check if SMTP credentials exist
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      return await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || "Pravixo"}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text,
      });
    } catch (err) {
      console.warn("[EmailService] Direct SMTP failed, trying proxy fallback:", err.message);
    }
  }

  // 2. Vercel proxy email sender fallback
  const baseOrigin = origin || process.env.VERCEL_EMAIL_API_URL || "https://pravixo-kashish.vercel.app";
  const cleanOrigin = baseOrigin.replace(/\/$/, "");
  const vercelApiUrl = `${cleanOrigin}/api/send-email`;
  const authSecret = process.env.VERCEL_API_SECRET || "fallback-secret-key-123";

  try {
    const response = await fetch(vercelApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authSecret}`,
      },
      body: JSON.stringify({ to, subject, html, text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(`[EmailService] Proxy response error: ${response.status}`, errorData);
      return { success: false, error: errorData };
    }

    return await response.json();
  } catch (error) {
    console.error("[EmailService] Email dispatch failed:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Generate rich responsive HTML for New Campaign Notification
 */
export const buildNewCampaignEmailHtml = ({
  creatorName,
  brandName,
  campaignTitle,
  campaignDescription,
  campaignCategory,
  campaignLocation,
  campaignBudget,
  campaignDuration,
  campaignUrl,
  unsubscribeUrl,
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Campaign Alert: ${campaignTitle}</title>
  <style>
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #0d0f17; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #161926; border-radius: 20px; overflow: hidden; border: 1px solid #282d3f; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #ec4899 100%); padding: 32px 24px; text-align: center; }
    .logo { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; text-decoration: none; display: inline-block; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 8px; color: #ffffff; }
    .content { padding: 32px 28px; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 8px; }
    .brand-tag { font-size: 14px; color: #94a3b8; margin-bottom: 20px; }
    .card { background-color: #1e2235; border: 1px solid #2d344d; border-radius: 14px; padding: 20px; margin-bottom: 24px; }
    .card-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
    .label { color: #94a3b8; font-weight: 500; }
    .value { color: #ffffff; font-weight: 700; text-align: right; }
    .btn-apply { display: block; width: 100%; box-sizing: border-box; text-align: center; background: linear-gradient(135deg, #f97316 0%, #ec4899 100%); color: #ffffff !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 24px; border-radius: 50px; margin: 28px 0 16px 0; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4); }
    .footer { padding: 24px; text-align: center; border-top: 1px solid #24293d; font-size: 12px; color: #64748b; background-color: #111420; }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <div class="logo">PRAVIXO</div>
      <br />
      <span class="badge">🚀 New Campaign Alert</span>
    </div>

    <!-- CONTENT -->
    <div class="content">
      <h1 class="title">${campaignTitle}</h1>
      <p class="brand-tag">By <strong>${brandName}</strong> • ${campaignCategory}</p>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        Hello <strong>${creatorName}</strong>,<br>
        A new collaboration campaign matching your profile is live on Pravixo. Check out the details below and apply early to secure your spot!
      </p>

      <div class="card">
        <div class="card-row">
          <span class="label">Campaign Budget:</span>
          <span class="value" style="color: #10b981; font-size: 15px;">${campaignBudget || "Competitive"}</span>
        </div>
        <div class="card-row">
          <span class="label">Category:</span>
          <span class="value">${campaignCategory || "General"}</span>
        </div>
        <div class="card-row">
          <span class="label">Target Location:</span>
          <span class="value">${campaignLocation || "Pan India"}</span>
        </div>
        ${campaignDuration ? `
        <div class="card-row" style="margin-bottom: 0;">
          <span class="label">Duration:</span>
          <span class="value">${campaignDuration}</span>
        </div>` : ""}
      </div>

      ${campaignDescription ? `
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; font-style: italic;">
        "${campaignDescription.slice(0, 200)}${campaignDescription.length > 200 ? "..." : ""}"
      </p>` : ""}

      <!-- DIRECT CTA BUTTON -->
      <a href="${campaignUrl}" class="btn-apply" target="_blank">
        View Campaign & Apply Now →
      </a>
      <p style="text-align: center; color: #64748b; font-size: 11px; margin-top: 4px;">
        Clicking redirects directly to your Pravixo creator dashboard.
      </p>
    </div>

    <!-- FOOTER & UNSUBSCRIBE -->
    <div class="footer">
      <p style="margin: 0 0 8px 0;">
        You are receiving this email because you are a registered creator on Pravixo.
      </p>
      <p style="margin: 0;">
        Don't want to receive new campaign notifications? 
        <a href="${unsubscribeUrl}" target="_blank">Unsubscribe here</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Dispatch Email Notifications to all active, opted-in Creators for a new Campaign
 */
export const notifyCreatorsAboutNewCampaign = async ({ campaign, brand, frontendOrigin = null }) => {
  try {
    if (!campaign) return;

    const brandName = brand?.fullName || "A Brand";
    const frontendUrl = (frontendOrigin || process.env.FRONTEND_URL || "https://pravixo-web.vercel.app").replace(/\/$/, "");

    // Find all creators who have email notifications enabled and are not suspended
    const creatorsRes = await query(`
      SELECT id, full_name, email, unsubscribe_token
      FROM profiles
      WHERE role = 'creator'
        AND is_suspended = false
        AND is_deleted = false
        AND email_notifications_enabled != false
        AND email IS NOT NULL
        AND email != ''
    `);

    const creators = creatorsRes.rows.map((row) => ({
      _id: row.id,
      fullName: row.full_name,
      email: row.email,
      unsubscribeToken: row.unsubscribe_token,
    }));

    console.log(`[EmailService] Found ${creators.length} creators eligible for email notification on campaign: "${campaign.title}".`);

    if (!creators || creators.length === 0) return;

    const campaignUrl = `${frontendUrl}/dashboard/influencer?tab=campaigns&campaignId=${campaign.id || campaign._id}`;

    // Dispatch emails asynchronously in parallel with concurrency throttling
    const batchSize = 10;
    for (let i = 0; i < creators.length; i += batchSize) {
      const batch = creators.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((c) => {
          const unsubUrl = `${frontendUrl}/unsubscribe?token=${c.unsubscribeToken || c._id}&email=${encodeURIComponent(c.email)}`;
          const html = buildNewCampaignEmailHtml({
            creatorName: c.fullName || "Creator",
            brandName,
            campaignTitle: campaign.title,
            campaignDescription: campaign.description || "",
            campaignCategory: campaign.category || "General",
            campaignLocation: campaign.location || "Pan India",
            campaignBudget: campaign.budget || (campaign.totalBudget ? `₹${campaign.totalBudget.toLocaleString("en-IN")}` : "Flexible"),
            campaignDuration: campaign.duration || "",
            campaignUrl,
            unsubscribeUrl: unsubUrl,
          });

          return sendEmail({
            to: c.email,
            subject: `🚀 New Brand Campaign: "${campaign.title}" by ${brandName}`,
            html,
            text: `New Campaign "${campaign.title}" by ${brandName} is live on Pravixo! Budget: ${campaign.budget || "Flexible"}. Apply now: ${campaignUrl}`,
            origin: frontendUrl,
          }).catch((err) => console.error(`[EmailService] Failed to send email to ${c.email}:`, err.message));
        })
      );
    }

    console.log(`[EmailService] Finished sending campaign notifications for "${campaign.title}".`);
  } catch (error) {
    console.error("[EmailService] notifyCreatorsAboutNewCampaign error:", error);
  }
};
