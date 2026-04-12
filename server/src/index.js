import express from "express";
import cors from "cors";
import { connectDB, getDBStatus } from "./db.js";
import wordsRouter from "./routes/words.js";
import scrapeRouter from "./routes/scrape.js";
import importRouter from "./routes/importText.js";

const app = express();
const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    },
  })
);
app.use(express.json());

let dbReady = false;

async function connectDBInBackground() {
  while (!dbReady) {
    try {
      await connectDB();
      dbReady = true;
      console.log("MongoDB ready");
      return;
    } catch (err) {
      console.error("MongoDB unavailable, retrying in 10s:", err?.message || err);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbReady, ...getDBStatus() });
});

// Keep service responsive for Render health checks while DB is connecting.
app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  if (!dbReady) {
    return res.status(503).json({ message: "Database is warming up. Please retry shortly." });
  }
  return next();
});

app.use("/api/words", wordsRouter);
app.use("/api/scrape", scrapeRouter);
app.use("/api/import", importRouter);

// Start HTTP server immediately, then warm DB in background.
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  void connectDBInBackground();
});
