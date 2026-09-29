const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Very basic security check to ensure it's called by our backend
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.VERCEL_API_SECRET || "fallback-secret-key-123"}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { to, subject, html, text } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const rawUser = process.env.SMTP_USER || "";
    const rawPass = process.env.SMTP_PASS || "";

    const user = rawUser.trim().replace(/^['"]|['"]$/g, "");
    const pass = rawPass.replace(/\s+/g, "").replace(/^['"]|['"]$/g, "");

    if (!user || !pass) {
      return res.status(500).json({
        error: "SMTP credentials not configured on Vercel (SMTP_USER or SMTP_PASS missing)",
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: 465, // Vercel can safely use 465 without blocking
      secure: true,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 15000,
      socketTimeout: 15000,
    });

    const info = await transporter.sendMail({
      from: `"Pravixo" <${user}>`,
      to,
      subject,
      html,
      text,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Vercel Email Sending Error:", error);
    const configuredUser = process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 3)}***@${process.env.SMTP_USER.split("@")[1] || ""}` : "MISSING";
    const passLength = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "").length : 0;
    return res.status(500).json({
      error: error.message,
      diagnostic: {
        userConfigured: configuredUser,
        passLengthConfigured: passLength,
      },
    });
  }
}
