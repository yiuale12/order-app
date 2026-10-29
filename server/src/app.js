import cors from "cors";
import express from "express";
import { pool } from "./db.js";
import routes, { apiErrorHandler } from "./routes.js";

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch {
    response.status(503).json({
      status: "error",
      database: "unavailable",
      error: "데이터베이스에 연결할 수 없습니다.",
    });
  }
});

app.use("/api", routes);

app.use((_request, response) => {
  response.status(404).json({ error: "요청한 API를 찾을 수 없습니다." });
});

app.use((error, _request, response, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "요청 본문이 올바른 JSON 형식이 아닙니다." });
    return;
  }

  apiErrorHandler(error, _request, response, next);
});

export default app;
