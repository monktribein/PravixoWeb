import { query } from "../config/postgres.js";
import { formatPortfolio, formatProfile } from "../utils/formatters.js";
import cloudinary from "../config/cloudinary.js";

const getFileUrl = (file) => {
  if (!file) return null;
  if (file.path && (file.path.startsWith("http://") || file.path.startsWith("https://"))) {
    return file.path;
  }
  return `/uploads/${file.filename}`;
};

// Helper: Find Profile
const findProfile = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [String(idOrUserId)]
  );
  return res.rows[0] ? formatProfile(res.rows[0]) : null;
};

// 1. GET PORTFOLIO BY PROFILE
export const getByProfile = async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await findProfile(profileId);
    const targetUuid = profile?.id || profileId;

    const portRes = await query(
      `SELECT * FROM portfolios WHERE profile_id::text = $1 ORDER BY sort_order ASC, created_at DESC`,
      [targetUuid]
    );

    const images = portRes.rows.map(formatPortfolio);

    // Collect all userIds/userNames from comments
    const commentUserIds = new Set();
    const commentUserNames = new Set();

    images.forEach((img) => {
      (img.comments || []).forEach((c) => {
        if (c.userId) commentUserIds.add(String(c.userId).trim());
        if (c.userName) commentUserNames.add(String(c.userName).trim());
      });
    });

    let profileMap = new Map();
    if (commentUserIds.size > 0 || commentUserNames.size > 0) {
      const idArray = Array.from(commentUserIds);
      const nameArray = Array.from(commentUserNames);

      const usersRes = await query(
        `SELECT id, user_id, full_name, handle, avatar_url, gender, role 
         FROM profiles 
         WHERE id::text = ANY($1::text[]) 
            OR user_id = ANY($1::text[]) 
            OR full_name = ANY($2::text[]) 
            OR handle = ANY($2::text[])`,
        [idArray, nameArray]
      );

      usersRes.rows.forEach((p) => {
        const prof = formatProfile(p);
        profileMap.set(String(prof.id), prof);
        if (prof.userId) profileMap.set(String(prof.userId), prof);
        if (prof.fullName) profileMap.set(prof.fullName.trim().toLowerCase(), prof);
        if (prof.handle) profileMap.set(prof.handle.trim().toLowerCase().replace(/^@/, ""), prof);
      });
    }

    const results = images.map((image) => {
      const enrichedComments = (image.comments || []).map((comm) => {
        const uId = comm.userId ? String(comm.userId).trim() : "";
        const uName = comm.userName ? String(comm.userName).trim().toLowerCase() : "";
        const pMatch =
          (uId && profileMap.get(uId)) ||
          (uName && profileMap.get(uName)) ||
          (uName && profileMap.get(uName.replace(/^@/, "")));

        const avatar = pMatch?.avatarUrl || comm.userAvatar || "";

        return {
          ...comm,
          userAvatar: avatar,
          userGender: pMatch?.gender || comm.userGender || "",
          userRole: pMatch?.role || comm.userRole || "creator",
        };
      });

      return {
        ...image,
        comments: enrichedComments,
        url: image.imageUrl,
      };
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Get portfolio error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch portfolio.",
    });
  }
};

// 2. ADD PORTFOLIO IMAGE
export const addImage = async (req, res) => {
  try {
    const {
      profileId,
      sortOrder,
      type,
      caption,
      brandTag,
      likesCount,
      viewsCount,
      aspectRatio,
      mediaType,
    } = req.body;

    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    const profile = await findProfile(profileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Portfolio media file is required.",
      });
    }

    const mime = req.file.mimetype || "";
    const isVideo =
      mime.startsWith("video/") || /\.(mp4|mov|avi|webm|mkv)$/i.test(req.file.originalname || "");
    const finalMediaType = mediaType || (isVideo ? "video" : "image");
    const finalType = type || (finalMediaType === "video" ? "reel" : "post");

    const imageUrl = getFileUrl(req.file);
    const finalSortOrder = Number(sortOrder) || 0;
    const finalLikes = Number(likesCount) || 0;
    const finalViews =
      Number(viewsCount) || (finalType === "reel" ? Math.floor(Math.random() * 2000) + 500 : 0);
    const finalAspect =
      aspectRatio || (finalType === "reel" || finalType === "story" ? "9:16" : "1:1");

    const insRes = await query(
      `INSERT INTO portfolios (
        profile_id, image_url, cloudinary_public_id, media_type, type,
        caption, brand_tag, likes_count, views_count, comments_count, shares_count,
        aspect_ratio, sort_order, liked_by_users, comments, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, $10, $11, '[]'::jsonb, '[]'::jsonb, NOW(), NOW())
      RETURNING *`,
      [
        profile.id,
        imageUrl,
        req.file.filename || "",
        finalMediaType,
        finalType,
        caption || "",
        brandTag || "",
        finalLikes,
        finalViews,
        finalAspect,
        finalSortOrder,
      ]
    );

    const portfolioImage = formatPortfolio(insRes.rows[0]);

    return res.status(201).json({
      success: true,
      data: {
        ...portfolioImage,
        url: portfolioImage.imageUrl,
      },
    });
  } catch (error) {
    console.error("Add portfolio image error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add portfolio image.",
    });
  }
};

// 3. TOGGLE LIKE ON PORTFOLIO ITEM
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const itemRes = await query(`SELECT * FROM portfolios WHERE id::text = $1 LIMIT 1`, [id]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found.",
      });
    }

    const item = formatPortfolio(itemRes.rows[0]);
    let likedUsers = item.likedByUsers || [];
    let likesCount = item.likesCount || 0;
    let isLiked = false;

    if (userId) {
      const userStr = String(userId);
      const userIdx = likedUsers.findIndex((u) => String(u) === userStr);
      if (userIdx > -1) {
        likedUsers.splice(userIdx, 1);
        likesCount = Math.max(0, likesCount - 1);
        isLiked = false;
      } else {
        likedUsers.push(userStr);
        likesCount = likesCount + 1;
        isLiked = true;
      }
    } else {
      likesCount = likesCount + 1;
      isLiked = true;
    }

    await query(
      `UPDATE portfolios 
       SET liked_by_users = $1::jsonb, likes_count = $2, updated_at = NOW() 
       WHERE id = $3`,
      [JSON.stringify(likedUsers), likesCount, item.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        likesCount,
        isLiked,
      },
    });
  } catch (error) {
    console.error("Toggle like error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update like status.",
    });
  }
};

// 4. ADD COMMENT ON PORTFOLIO ITEM
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, userName, userAvatar, userGender, userRole } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required.",
      });
    }

    const itemRes = await query(`SELECT * FROM portfolios WHERE id::text = $1 LIMIT 1`, [id]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found.",
      });
    }
    const item = formatPortfolio(itemRes.rows[0]);

    let freshAvatar = userAvatar || "";
    let finalUserName = userName || req.user?.fullName || req.user?.name || "Pravixo User";
    let finalGender = userGender || "";
    let finalRole = userRole || req.user?.role || "creator";
    let finalUserId = userId;

    if (userId) {
      const p = await findProfile(userId);
      if (p) {
        freshAvatar = p.avatarUrl || freshAvatar;
        finalUserName = p.fullName || finalUserName;
        finalGender = p.gender || finalGender;
        finalRole = p.role || finalRole;
        finalUserId = p.id;
      }
    }

    const newComment = {
      _id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: finalUserId || undefined,
      userName: finalUserName,
      userAvatar: freshAvatar,
      userGender: finalGender,
      userRole: finalRole,
      text: text.trim(),
      createdAt: new Date(),
    };

    const comments = item.comments || [];
    comments.push(newComment);
    const commentsCount = comments.length;

    await query(
      `UPDATE portfolios 
       SET comments = $1::jsonb, comments_count = $2, updated_at = NOW() 
       WHERE id = $3`,
      [JSON.stringify(comments), commentsCount, item.id]
    );

    return res.status(201).json({
      success: true,
      data: comments,
      commentsCount,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to post comment.",
    });
  }
};

// 5. DELETE COMMENT ON PORTFOLIO ITEM
export const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    const itemRes = await query(`SELECT * FROM portfolios WHERE id::text = $1 LIMIT 1`, [id]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found.",
      });
    }
    const item = formatPortfolio(itemRes.rows[0]);

    let comments = (item.comments || []).filter(
      (c) => String(c._id) !== String(commentId) && String(c.id) !== String(commentId)
    );

    const commentsCount = comments.length;

    await query(
      `UPDATE portfolios 
       SET comments = $1::jsonb, comments_count = $2, updated_at = NOW() 
       WHERE id = $3`,
      [JSON.stringify(comments), commentsCount, item.id]
    );

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
      data: comments,
      commentsCount,
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete comment.",
    });
  }
};

// 6. UPDATE PORTFOLIO ITEM
export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, brandTag, type, aspectRatio } = req.body;

    const itemRes = await query(`SELECT * FROM portfolios WHERE id::text = $1 LIMIT 1`, [id]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found.",
      });
    }
    const item = formatPortfolio(itemRes.rows[0]);

    const newCaption = caption !== undefined ? caption : item.caption;
    const newBrandTag = brandTag !== undefined ? brandTag : item.brandTag;
    const newType = type !== undefined ? type : item.type;
    const newAspect = aspectRatio !== undefined ? aspectRatio : item.aspectRatio;

    const updRes = await query(
      `UPDATE portfolios 
       SET caption = $1, brand_tag = $2, type = $3, aspect_ratio = $4, updated_at = NOW() 
       WHERE id = $5 
       RETURNING *`,
      [newCaption, newBrandTag, newType, newAspect, item.id]
    );

    return res.status(200).json({
      success: true,
      data: formatPortfolio(updRes.rows[0]),
    });
  } catch (error) {
    console.error("Update portfolio item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update portfolio item.",
    });
  }
};

// 7. REMOVE PORTFOLIO IMAGE
export const removeImage = async (req, res) => {
  try {
    const { id } = req.params;

    const itemRes = await query(`SELECT * FROM portfolios WHERE id::text = $1 LIMIT 1`, [id]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Portfolio image not found.",
      });
    }
    const image = formatPortfolio(itemRes.rows[0]);

    if (image.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryPublicId, {
          resource_type: image.mediaType === "video" ? "video" : "image",
        });
      } catch (err) {
        console.warn("Cloudinary delete ignored:", err.message);
      }
    }

    await query(`DELETE FROM portfolios WHERE id = $1`, [image.id]);

    return res.status(200).json({
      success: true,
      message: "Portfolio item removed successfully.",
    });
  } catch (error) {
    console.error("Remove portfolio image error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove portfolio image.",
    });
  }
};