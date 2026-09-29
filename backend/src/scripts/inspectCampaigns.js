import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "dns";
dotenv.config();
dns.setDefaultResultOrder("ipv4first");

import Campaign from "../models/Campaign.js";
import Profile from "../models/Profile.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const campaigns = await Campaign.find().lean();
    console.log("Total Campaigns in DB:", campaigns.length);
    campaigns.forEach((c) => {
      console.log({
        _id: c._id,
        title: c.title,
        status: c.status,
        active: c.active,
        totalBudget: c.totalBudget,
        minBudgetPerCreator: c.minBudgetPerCreator,
        endDate: c.endDate,
        endDateReadable: c.endDate ? new Date(c.endDate).toISOString() : null,
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

run();
