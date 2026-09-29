import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Campaign from "./src/models/Campaign.js";
import Profile from "./src/models/Profile.js";
import Review from "./src/models/Review.js";
import Connection from "./src/models/Connection.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to Mongo");

  const now = Date.now();
  const filter = {
    status: "APPROVED",
    active: { $ne: false },
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now - 24 * 60 * 60 * 1000 } },
    ],
  };

  const campaigns = await Campaign.find(filter)
    .populate("brandId", "fullName handle avatarUrl rating location category startingPrice")
    .sort({ createdAt: -1 })
    .lean();

  console.log("Found discoverable campaigns count:", campaigns.length);

  for (const c of campaigns) {
    console.log("Campaign:", {
      id: c._id,
      title: c.title,
      status: c.status,
      brand: c.brandId,
      totalBudget: c.totalBudget,
      minBudgetPerCreator: c.minBudgetPerCreator,
    });
  }

  process.exit(0);
}

run().catch(console.error);
