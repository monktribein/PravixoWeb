import {
  sendOtp,
  verifyOtp,
  sendResetLink,
} from "../services/otpService.js";

// =====================================
// SEND OTP
// POST /api/otp/send
// =====================================

export const sendOtpController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const origin = req.headers.origin || process.env.FRONTEND_URL || "https://pravixo.com";
    const result = await sendOtp(email, origin);

    return res.status(200).json({
      success: true,
      message: result.message || "OTP sent successfully.",
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to send OTP.",
    });
  }
};

// =====================================
// VERIFY OTP
// POST /api/otp/verify
// =====================================

export const verifyOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const result = await verifyOtp(email, otp);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to verify OTP.",
    });
  }
};

// =====================================
// SEND RESET LINK
// POST /api/otp/reset-link
// =====================================

export const sendResetLinkController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const origin =
      req.headers.origin ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const result = await sendResetLink(email, origin);

    return res.status(200).json({
      success: true,
      message:
        result.message || "Password reset link sent successfully.",
    });
  } catch (error) {
    console.error("Send reset link error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Failed to send reset link.",
    });
  }
};