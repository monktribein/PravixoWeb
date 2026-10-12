import { query } from "../config/postgres.js";
import { formatFollow, formatProfile } from "../utils/formatters.js";

const resolveProfileId = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT id FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [idOrUserId]
  );
  return res.rows[0]?.id || null;
};

// TOGGLE FOLLOW / UNFOLLOW
export const toggleFollow = async (req, res) => {
  try {
    const followerId = req.user?._id || req.body.followerId;
    const { targetProfileId } = req.body;

    if (!followerId || !targetProfileId) {
      return res.status(400).json({ success: false, message: "Follower and target ID are required." });
    }

    const resolvedFollowerId = await resolveProfileId(followerId);
    const resolvedTargetId = await resolveProfileId(targetProfileId);

    if (!resolvedFollowerId || !resolvedTargetId) {
      return res.status(400).json({ success: false, message: "Invalid user profiles." });
    }

    if (String(resolvedFollowerId) === String(resolvedTargetId)) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself." });
    }

    const existingFollow = await query(
      `SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1`,
      [resolvedFollowerId, resolvedTargetId]
    );

    if (existingFollow.rows.length > 0) {
      await query(`DELETE FROM follows WHERE id = $1`, [existingFollow.rows[0].id]);
      return res.status(200).json({
        success: true,
        isFollowing: false,
        message: "Unfollowed successfully.",
      });
    }

    // Role check: Only Brand can follow Creator and Creator can follow Brand
    const [followerProfileRes, targetProfileRes] = await Promise.all([
      query(`SELECT role, full_name FROM profiles WHERE id = $1`, [resolvedFollowerId]),
      query(`SELECT role FROM profiles WHERE id = $1`, [resolvedTargetId]),
    ]);

    const followerProfile = followerProfileRes.rows[0];
    const targetProfile = targetProfileRes.rows[0];

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

    const newFollowRes = await query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) RETURNING *;`,
      [resolvedFollowerId, resolvedTargetId]
    );

    try {
      await query(
        `
        INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, read, created_at)
        VALUES ($1, $2, 'new_message', $3, $4, false, NOW());
        `,
        [
          resolvedTargetId,
          resolvedFollowerId,
          `${followerProfile?.full_name || "A user"} started following your profile!`,
          `/influencer/${resolvedFollowerId}`,
        ]
      );
    } catch (err) {
      console.error("Follow notification error:", err);
    }

    return res.status(200).json({
      success: true,
      isFollowing: true,
      message: "Followed successfully.",
      data: formatFollow(newFollowRes.rows[0]),
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

    const resolvedFollowerId = await resolveProfileId(followerId);
    const resolvedTargetId = await resolveProfileId(targetProfileId);

    if (!resolvedFollowerId || !resolvedTargetId) {
      return res.status(200).json({ success: true, isFollowing: false, followersCount: 0, followingCount: 0 });
    }

    const [followRes, followersCountRes, followingCountRes] = await Promise.all([
      query(`SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1`, [
        resolvedFollowerId,
        resolvedTargetId,
      ]),
      query(`SELECT COUNT(*) as c FROM follows WHERE following_id = $1`, [resolvedTargetId]),
      query(`SELECT COUNT(*) as c FROM follows WHERE follower_id = $1`, [resolvedTargetId]),
    ]);

    return res.status(200).json({
      success: true,
      isFollowing: followRes.rows.length > 0,
      followersCount: parseInt(followersCountRes.rows[0]?.c || "0", 10),
      followingCount: parseInt(followingCountRes.rows[0]?.c || "0", 10),
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
    const resolvedId = await resolveProfileId(profileId);

    if (!resolvedId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const { rows } = await query(
      `
      SELECT
        p.id, p.full_name, p.handle, p.avatar_url, p.role, p.category, p.location
      FROM follows f
      JOIN profiles p ON p.id = f.follower_id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC;
      `,
      [resolvedId]
    );

    return res.status(200).json({
      success: true,
      data: rows.map(formatProfile),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET FOLLOWING LIST
export const getFollowing = async (req, res) => {
  try {
    const { profileId } = req.params;
    const resolvedId = await resolveProfileId(profileId);

    if (!resolvedId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const { rows } = await query(
      `
      SELECT
        p.id, p.full_name, p.handle, p.avatar_url, p.role, p.category, p.location
      FROM follows f
      JOIN profiles p ON p.id = f.following_id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC;
      `,
      [resolvedId]
    );

    return res.status(200).json({
      success: true,
      data: rows.map(formatProfile),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
