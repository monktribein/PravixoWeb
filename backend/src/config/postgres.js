import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

let pool = null;

export const getPostgresPool = () => {
  if (!pool) {
    const connectionString =
      process.env.SUPABASE_DB_URL ||
      process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("SUPABASE_DB_URL is not defined in environment variables.");
    }

    pool = new Pool({
      connectionString,
      max: Number(process.env.SUPABASE_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    pool.on("error", (err) => {
      console.error("[PostgreSQL Pool Error]:", err.message);
    });
  }

  return pool;
};

export const query = async (text, params) => {
  const p = getPostgresPool();
  return p.query(text, params);
};

export const connectPostgres = async () => {
  try {
    const p = getPostgresPool();
    const res = await p.query("SELECT NOW() as now, version() as version");
    console.log("✅ Supabase PostgreSQL Connected Successfully!");
    console.log("   Server Time:", res.rows[0].now);
    return true;
  } catch (err) {
    console.error("❌ Supabase PostgreSQL Connection Failed:", err.message);
    throw err;
  }
};

export default {
  getPostgresPool,
  query,
  connectPostgres,
};
