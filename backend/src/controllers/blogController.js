import { query } from "../config/postgres.js";
import { formatBlog } from "../utils/formatters.js";

// Helper to check valid UUID
const isUuid = (str) =>
  typeof str === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

export const getBlogs = async (req, res) => {
  try {
    const { targetRole, featured, published } = req.query;

    const conditions = [];
    const params = [];

    if (targetRole) {
      params.push(targetRole);
      conditions.push(`target_role = $${params.length}`);
    }

    if (featured !== undefined) {
      params.push(featured === "true");
      conditions.push(`featured = $${params.length}`);
    }

    if (published !== undefined) {
      params.push(published === "true");
      conditions.push(`published = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM blogs ${whereClause} ORDER BY created_at DESC`;

    const result = await query(sql, params);
    const blogs = result.rows.map(formatBlog);

    return res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    console.error("Get blogs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs.",
    });
  }
};

export const getBlogById = async (req, res) => {
  try {
    const { blogId } = req.params;

    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: "Blog ID or slug is required.",
      });
    }

    const cleanId = blogId.trim();
    let result;
    if (isUuid(cleanId)) {
      result = await query("SELECT * FROM blogs WHERE id = $1 LIMIT 1", [cleanId]);
    } else {
      result = await query("SELECT * FROM blogs WHERE slug = $1 LIMIT 1", [cleanId]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatBlog(result.rows[0]),
    });
  } catch (error) {
    console.error("Get blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog.",
    });
  }
};

export const createBlog = async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      author,
      coverImage,
      coverImageUrl,
      category,
      targetRole,
      tags,
      published,
      featured,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required.",
      });
    }

    const computedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const insertRes = await query(
      `INSERT INTO blogs (
        title, slug, content, excerpt, author, cover_image, cover_image_url,
        category, target_role, tags, published, featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        title,
        computedSlug,
        content,
        excerpt || "",
        author || "Pravixo Team",
        coverImage || coverImageUrl || "",
        coverImageUrl || coverImage || "",
        category || "Marketing Strategies",
        targetRole || "creator",
        tags || [],
        published !== undefined ? Boolean(published) : true,
        featured !== undefined ? Boolean(featured) : false,
      ]
    );

    return res.status(201).json({
      success: true,
      data: formatBlog(insertRes.rows[0]),
    });
  } catch (error) {
    console.error("Create blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create blog.",
    });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { blogId } = req.params;

    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required.",
      });
    }

    const fieldMapping = {
      title: "title",
      slug: "slug",
      content: "content",
      excerpt: "excerpt",
      author: "author",
      coverImage: "cover_image",
      coverImageUrl: "cover_image_url",
      category: "category",
      targetRole: "target_role",
      tags: "tags",
      published: "published",
      featured: "featured",
    };

    const setClauses = [];
    const values = [];

    for (const [key, col] of Object.entries(fieldMapping)) {
      if (req.body[key] !== undefined) {
        values.push(req.body[key]);
        setClauses.push(`${col} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update.",
      });
    }

    setClauses.push("updated_at = NOW()");
    values.push(blogId.trim());

    const wherePredicate = isUuid(blogId.trim()) ? `id = $${values.length}` : `slug = $${values.length}`;
    const sql = `UPDATE blogs SET ${setClauses.join(", ")} WHERE ${wherePredicate} RETURNING *`;

    const updateRes = await query(sql, values);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatBlog(updateRes.rows[0]),
    });
  } catch (error) {
    console.error("Update blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update blog.",
    });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const { blogId } = req.params;

    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required.",
      });
    }

    const wherePredicate = isUuid(blogId.trim()) ? "id = $1" : "slug = $1";
    const deleteRes = await query(`DELETE FROM blogs WHERE ${wherePredicate} RETURNING id`, [blogId.trim()]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully.",
    });
  } catch (error) {
    console.error("Delete blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete blog.",
    });
  }
};