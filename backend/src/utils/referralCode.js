import crypto from "crypto";
import { query } from "../config/postgres.js";

/**
 * Generate a random alphanumeric code prefixed with PVX (e.g. PVX9A2F1)
 */
export const generateCode = (length = 6) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PVX";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
};

/**
 * Generate a guaranteed unique referral code for a creator profile
 */
export const getUniqueReferralCode = async () => {
  let unique = false;
  let code = "";
  let attempts = 0;

  while (!unique && attempts < 10) {
    code = generateCode(6);
    const result = await query(
      "SELECT id FROM profiles WHERE referral_code = $1 LIMIT 1",
      [code]
    );
    if (result.rows.length === 0) {
      unique = true;
    }
    attempts++;
  }

  if (!unique) {
    code = `PVX${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  return code;
};

/**
 * Generate a unique typed referral code: CR-XXXXX or BR-XXXXX
 */
export const generateTypedReferralCode = async (role = "creator") => {
  const prefix = role === "brand" ? "BR" : "CR";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let unique = false;
  let code = "";
  let attempts = 0;

  while (!unique && attempts < 15) {
    let randomPart = "";
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) {
      randomPart += chars[bytes[i] % chars.length];
    }
    code = `${prefix}-${randomPart}`;

    const result = await query(
      "SELECT id FROM profiles WHERE referral_code = $1 LIMIT 1",
      [code]
    );
    if (result.rows.length === 0) {
      unique = true;
    }
    attempts++;
  }

  if (!unique) {
    const fallback = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
    code = `${prefix}-${fallback}`;
  }

  return code;
};
