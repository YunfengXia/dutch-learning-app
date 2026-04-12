import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
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

app.use("/api/words", wordsRouter);
app.use("/api/scrape", scrapeRouter);
app.use("/api/import", importRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Connect to MongoDB first, then start HTTP server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
