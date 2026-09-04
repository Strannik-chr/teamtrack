import { config } from "dotenv";
config();
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function reset() {
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await client.end();
  console.log("Database reset.");
}
reset();
