import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const dbFields = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const hasIndividualConfig = dbFields.every((field) => process.env[field]);

const poolConfig = hasIndividualConfig
  ? {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    }
  : process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : undefined;

if (!poolConfig) {
  throw new Error(
    "Set DATABASE_URL or all of DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD.",
  );
}

export const pool = new Pool({
  ...poolConfig,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.code || "unknown");
});
