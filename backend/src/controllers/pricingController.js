import mongoose from "mongoose";
import PricingTier from "../models/PricingTier.js";
import Profile from "../models/Profile.js";

// ==========================================
// GET PRICING BY PROFILE
// ==========================================

export const getByProfile = async (req, res) => {
  try {
    const { profileId } = req.params;

    console.log(
      "========================================="
    );
    console.log("GET PRICING profileId:", profileId);
    console.log(
      "========================================="
    );

    // Never query MongoDB with undefined
    if (!profileId || profileId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
        data: [],
      });
    }

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID.",
        data: [],
      });
    }

    const pricing = await PricingTier.find({
      profileId: new mongoose.Types.ObjectId(profileId),
    })
      .sort({ sortOrder: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    console.error("Get pricing error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pricing.",
      data: [],
    });
  }
};

// ==========================================
// CREATE / UPDATE PRICING
// ==========================================

export const upsertMany = async (req, res) => {
  try {
    const { profileId, tiers } = req.body;

    console.log("UPDATE PRICING:", {
      profileId,
      tiers,
    });

    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: "profileId is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profileId.",
      });
    }

    if (!Array.isArray(tiers)) {
      return res.status(400).json({
        success: false,
        message: "tiers must be an array.",
      });
    }

    const mongoProfileId =
      new mongoose.Types.ObjectId(profileId);

    const profile = await Profile.findById(
      mongoProfileId
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    // Extract valid incoming IDs
    const incomingIds = tiers
      .map((t) => t?.id || t?._id)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Delete any existing tiers for this profile that are NOT in the incoming array
    await PricingTier.deleteMany({
      profileId: mongoProfileId,
      _id: { $nin: incomingIds },
    });

    // Update existing or create new tiers
    for (let index = 0; index < tiers.length; index++) {
      const tier = tiers[index];
      const tierId = tier?.id || tier?._id;
      const name = String(tier?.name || `Tier ${index + 1}`).trim();
      const price = Number(tier?.price) || 0;
      const sortOrder = tier?.sortOrder !== undefined ? Number(tier.sortOrder) : index;

      if (tierId && mongoose.Types.ObjectId.isValid(tierId)) {
        await PricingTier.findOneAndUpdate(
          {
            _id: tierId,
            profileId: mongoProfileId,
          },
          {
            name,
            price,
            sortOrder,
          },
          {
            new: true,
            runValidators: true,
          }
        );
      } else {
        await PricingTier.create({
          profileId: mongoProfileId,
          name,
          price,
          sortOrder,
        });
      }
    }

    // ==========================================
    // RECALCULATE STARTING PRICE
    // ==========================================

    const allTiers = await PricingTier.find({
      profileId: mongoProfileId,
    })
      .sort({ sortOrder: 1 })
      .lean();

    const validPrices = allTiers
      .map((tier) => Number(tier.price))
      .filter((price) => price > 0);

    const startingPrice =
      validPrices.length > 0
        ? Math.min(...validPrices)
        : 0;

    await Profile.findByIdAndUpdate(
      mongoProfileId,
      {
        startingPrice,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Pricing tiers updated successfully.",
      data: allTiers,
    });
  } catch (error) {
    console.error(
      "Upsert pricing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update pricing tiers.",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE PRICING TIER
// ==========================================

export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Pricing tier ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pricing tier ID.",
      });
    }

    const tier =
      await PricingTier.findById(id);

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: "Pricing tier not found.",
      });
    }

    const profileId = tier.profileId;

    await PricingTier.findByIdAndDelete(id);

    // ==========================================
    // RECALCULATE STARTING PRICE
    // ==========================================

    const remainingTiers =
      await PricingTier.find({
        profileId,
      }).lean();

    const validPrices = remainingTiers
      .map((tier) => Number(tier.price))
      .filter((price) => price > 0);

    const startingPrice =
      validPrices.length > 0
        ? Math.min(...validPrices)
        : 0;

    await Profile.findByIdAndUpdate(
      profileId,
      {
        startingPrice,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Pricing tier removed successfully.",
    });
  } catch (error) {
    console.error(
      "Remove pricing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to remove pricing tier.",
      error: error.message,
    });
  }
};