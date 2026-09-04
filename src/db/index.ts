import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { config } from "../config/config.js";
import dotenv from "dotenv";
import * as schema from "./schema.js";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://teamtrack:teamtrack_pass@localhost:5432/teamtrack_db";

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
