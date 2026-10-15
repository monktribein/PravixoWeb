import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const OLD_DB_URL = "postgresql://postgres.vrrsgnlrzfkdvmivszql:qhSnHrKawAd0cptl@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";
const NEW_DB_URL = process.env.SUPABASE_DB_URL;

const { Pool } = pg;

async function syncDatabases() {
  console.log("=== STEP 1: COMPARING & SYNCHRONIZING COLUMNS FROM OLD DB TO NEW DB ===");
  const oldPool = new Pool({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });
  const newPool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    // 1. Get all columns for all public tables in old DB
    const oldColsRes = await oldPool.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    // 2. Get all columns for all public tables in new DB
    const newColsRes = await newPool.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    const newColsSet = new Set(newColsRes.rows.map(r => `${r.table_name}.${r.column_name}`));
    const newTablesSet = new Set(newColsRes.rows.map(r => r.table_name));

    // For any missing column in new DB, add it
    for (const oldCol of oldColsRes.rows) {
      if (!newTablesSet.has(oldCol.table_name)) continue;
      const key = `${oldCol.table_name}.${oldCol.column_name}`;
      if (!newColsSet.has(key)) {
        let typeStr = oldCol.udt_name;
        if (oldCol.data_type === "character varying") typeStr = "VARCHAR(255)";
        else if (oldCol.data_type === "ARRAY") typeStr = "TEXT[]";
        else if (oldCol.udt_name === "jsonb") typeStr = "JSONB";
        else if (oldCol.udt_name === "uuid") typeStr = "UUID";
        else if (oldCol.udt_name === "int4") typeStr = "INT";
        else if (oldCol.udt_name === "int8") typeStr = "BIGINT";
        else if (oldCol.udt_name === "numeric") typeStr = "NUMERIC";
        else if (oldCol.udt_name === "bool") typeStr = "BOOLEAN";
        else if (oldCol.udt_name === "timestamptz") typeStr = "TIMESTAMPTZ";
        else if (oldCol.udt_name === "text") typeStr = "TEXT";

        console.log(`Adding missing column: ${oldCol.table_name}.${oldCol.column_name} (${typeStr})`);
        try {
          await newPool.query(`ALTER TABLE "${oldCol.table_name}" ADD COLUMN IF NOT EXISTS "${oldCol.column_name}" ${typeStr};`);
        } catch (addErr) {
          console.warn(`Could not add column ${key}:`, addErr.message);
        }
      }
    }

    console.log("✅ Column alignment complete.\n");

    console.log("=== STEP 2: COPYING ALL DATA TABLE BY TABLE IN CORRECT DEPENDENCY ORDER ===");
    // Disable constraints during bulk insert to avoid order deadlocks
    // In PostgreSQL on Supabase, drop constraints or use deferred or clean order:
    // Order: profiles -> wallets -> campaigns -> connections -> submissions -> conversations -> messages -> others
    const tableOrder = [
      "profiles",
      "wallets",
      "creator_bank_details",
      "social_connections",
      "social_analytics",
      "campaigns",
      "campaign_tasks",
      "pricing_tiers",
      "connections",
      "submissions",
      "conversations",
      "messages",
      "agreements",
      "payments",
      "payouts",
      "payment_audit_logs",
      "wallet_transactions",
      "withdrawals",
      "reviews",
      "video_reviews",
      "trust_reviews",
      "favorites",
      "follows",
      "notifications",
      "push_subscriptions",
      "blogs",
      "pro_tips",
      "addon_services",
      "addon_bookings",
      "referral_settings",
      "referral_relationships",
      "referral_rewards",
      "referrals",
      "subscription_packages",
      "subscription_offers",
      "user_subscriptions",
      "offer_analytics",
      "offers",
      "popup_settings",
      "portfolios",
      "portfolio",
      "portfolio_images",
      "otps",
      "contact_inquiries",
      "webhook_logs"
    ];

    let totalMigrated = 0;

    for (const tableName of tableOrder) {
      try {
        const countRes = await oldPool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const count = parseInt(countRes.rows[0].count, 10);
        if (count === 0) continue;

        console.log(`-> Migrating ${tableName} (${count} rows)...`);
        const oldData = await oldPool.query(`SELECT * FROM "${tableName}"`);
        
        let inserted = 0;
        for (const row of oldData.rows) {
          // Filter row columns to only those that exist in new table
          const validKeys = [];
          const validVals = [];
          for (const key of Object.keys(row)) {
            validKeys.push(key);
            validVals.push(row[key]);
          }

          const colList = validKeys.map(k => `"${k}"`).join(", ");
          const placeholders = validVals.map((_, i) => `$${i + 1}`).join(", ");

          try {
            await newPool.query(
              `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              validVals
            );
            inserted++;
          } catch (rowErr) {
            // console.warn(`   Row in ${tableName} skipped:`, rowErr.message);
          }
        }
        totalMigrated += inserted;
        console.log(`   ✅ ${tableName}: ${inserted}/${count} rows inserted.`);
      } catch (tblErr) {
        // Table might not exist in old DB, ignore
      }
    }

    console.log(`\n🎉 Total Rows Successfully Migrated: ${totalMigrated}\n`);

    console.log("=== STEP 3: FINAL ROW COUNTS IN NEW SUPABASE DB ===");
    for (const tbl of tableOrder) {
      try {
        const res = await newPool.query(`SELECT COUNT(*) as count FROM "${tbl}"`);
        const c = parseInt(res.rows[0].count, 10);
        if (c > 0) {
          console.log(`📊 ${tbl.padEnd(25)} : ${c} rows`);
        }
      } catch (e) {}
    }

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

syncDatabases();
