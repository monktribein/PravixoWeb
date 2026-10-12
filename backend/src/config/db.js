// =====================================================
// DATABASE CONFIG — Supabase PostgreSQL Only
// MongoDB has been fully removed from this project
// =====================================================

import { connectPostgres as _connectPostgres } from "./postgres.js";
import { initPostgresTables } from "./initPostgres.js";

export const connectPostgres = _connectPostgres;
export { initPostgresTables };

export default connectPostgres;