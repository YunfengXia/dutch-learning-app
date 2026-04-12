import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI environment variable is not set");

const client = new MongoClient(uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
});
let db = null;

export async function connectDB() {
  if (db) return db;

  const maxAttempts = Number(process.env.MONGODB_CONNECT_RETRIES || 8);
  const baseDelayMs = Number(process.env.MONGODB_RETRY_DELAY_MS || 2000);

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.connect();
      db = client.db(); // uses the database name from the URI
      console.log(`Connected to MongoDB on attempt ${attempt}/${maxAttempts}`);
      return db;
    } catch (err) {
      lastError = err;
      const waitMs = baseDelayMs * attempt;
      console.error(
        `MongoDB connect attempt ${attempt}/${maxAttempts} failed. Retrying in ${waitMs}ms...`,
        err?.message || err
      );
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  throw lastError || new Error("MongoDB connection failed");
}

export function getDB() {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
}

export function getCollection() {
  return getDB().collection("words");
}
