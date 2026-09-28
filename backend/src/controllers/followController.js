import Follow from "../models/Follow.js";
import Profile from "../models/Profile.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

// TOGGLE FOLLOW / UNFOLLOW
export const toggleFollow = async (req, res) => {
  try {
    const followerId = req.user?._id || req.body.followerId;
    const { targetProfileId } = req.body;

    if (!followerId || !targetProfileId) {
      return res.status(400).json({ success: false, message: "Follower and target ID are required." });
    }

    if (followerId.toString() === targetProfileId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself." });
    }

    // Role check: Only Brand can follow Creator and Creator can follow Brand
    if (mongoose.Types.ObjectId.isValid(followerId) && mongoose.Types.ObjectId.isValid(targetProfileId)) {
      const [followerProfile, targetProfile] = await Promise.all([
        Profile.findById(followerId).select("role"),
        Profile.findById(targetProfileId).select("role"),
      ]);

      if (followerProfile && targetProfile) {
        if (followerProfile.role === "creator" && targetProfile.role === "creator") {
          return res.status(400).json({
            success: false,
            message: "A creator cannot follow another creator. Creators can only follow Brands.",
          });
        }
        if (followerProfile.role === "brand" && targetProfile.role === "brand") {
          return res.status(400).json({
            success: false,
            message: "A brand cannot follow another brand. Brands can only follow Creators.",
          });
        }
      }
    }

    const existingFollow = await Follow.findOne({
      followerId,
      followingId: targetProfileId,
    });

    if (existingFollow) {
      await Follow.findByIdAndDelete(existingFollow._id);
      return res.status(200).json({
        success: true,
        isFollowing: false,
        message: "Unfollowed successfully.",
      });
    }

    const newFollow = await Follow.create({
      followerId,
      followingId: targetProfileId,
    });

    // Notify target
    try {
      const followerProfile = await Profile.findById(followerId).select("fullName role");
      await Notification.create({
        recipientId: targetProfileId,
        senderId: followerId,
        type: "new_message",
        text: `${followerProfile?.fullName || "A user"} started following your profile!`,
        targetUrl: `/influencer/${followerId}`,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error("Follow notification error:", err);
    }

    return res.status(200).json({
      success: true,
      isFollowing: true,
      message: "Followed successfully.",
      data: newFollow,
    });
  } catch (error) {
    console.error("Toggle follow error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CHECK FOLLOW STATUS
export const checkFollowStatus = async (req, res) => {
  try {
    const followerId = req.query.followerId || req.user?._id;
    const { targetProfileId } = req.query;

    if (!followerId || !targetProfileId) {
      return res.status(200).json({ success: true, isFollowing: false });
    }

    const follow = await Follow.findOne({
      followerId,
      followingId: targetProfileId,
    });

    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ followingId: targetProfileId }),
      Follow.countDocuments({ followerId: targetProfileId }),
    ]);

    return res.status(200).json({
      success: true,
      isFollowing: Boolean(follow),
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error("Check follow status error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET FOLLOWERS LIST
export const getFollowers = async (req, res) => {
  try {
    const { profileId } = req.params;
    const followers = await Follow.find({ followingId: profileId })
      .populate("followerId", "fullName handle avatarUrl role category location")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: followers.map((f) => f.followerId).filter(Boolean),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET FOLLOWING LIST
export const getFollowing = async (req, res) => {
  try {
    const { profileId } = req.params;
    const following = await Follow.find({ followerId: profileId })
      .populate("followingId", "fullName handle avatarUrl role category location")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: following.map((f) => f.followingId).filter(Boolean),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
