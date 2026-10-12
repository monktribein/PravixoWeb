import jwt from "jsonwebtoken";
import { query } from "../config/postgres.js";

// =====================================================
// PROTECT MIDDLEWARE — Supabase PostgreSQL Only
// =====================================================
export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Authentication token is missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret");

    const result = await query(
      "SELECT id, user_id, email, role, full_name, is_suspended, suspension_reason, suspended_until FROM profiles WHERE id = $1",
      [decoded.profileId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. User profile not found.",
      });
    }

    const profile = result.rows[0];

    // Check if account is suspended
    if (profile.is_suspended && profile.suspended_until && new Date(profile.suspended_until) > new Date()) {
      return res.status(403).json({
        success: false,
        message: "Your account is temporarily suspended.",
        suspensionReason: profile.suspension_reason,
        suspendedUntil: profile.suspended_until,
      });
    }

    req.user = {
      _id: profile.id,
      profileId: profile.id,
      userId: profile.user_id,
      email: profile.email,
      role: profile.role,
      fullName: profile.full_name,
    };
    req.profile = profile;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Not authorized. Invalid or expired token.",
    });
  }
};

// =====================================================
// OPTIONAL AUTH MIDDLEWARE
// =====================================================
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret");

      const result = await query(
        "SELECT id, user_id, email, role, full_name FROM profiles WHERE id = $1",
        [decoded.profileId]
      );

      if (result.rows.length > 0) {
        const profile = result.rows[0];
        req.user = {
          _id: profile.id,
          profileId: profile.id,
          userId: profile.user_id,
          email: profile.email,
          role: profile.role,
          fullName: profile.full_name,
        };
        req.profile = profile;
      }
    }
  } catch (err) {
    // Ignore invalid tokens for optional auth
  }
  next();
};

// =====================================================
// ADMIN PROTECT MIDDLEWARE
// =====================================================
export const adminProtect = async (req, res, next) => {
  protect(req, res, () => {
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Not authorized as an admin",
      });
    }
  });
};
