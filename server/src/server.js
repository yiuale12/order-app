import app from "./app.js";
import { initializeDatabase } from "./database.js";
import { pool } from "./db.js";

const port = Number(process.env.PORT) || 3000;

try {
  await initializeDatabase();

  const server = app.listen(port, () => {
    console.log(`COZY API server is running at http://localhost:${port}`);
    console.log("PostgreSQL connection verified.");
  });

  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (error) {
  console.error(
    "Could not connect to PostgreSQL:",
    error.code || "unknown connection error",
  );
  await pool.end();
  process.exit(1);
}
