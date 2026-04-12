import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI environment variable is not set");

const client = new MongoClient(uri);
let db = null;

export async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db(); // uses the database name from the URI
  console.log("Connected to MongoDB");
  return db;
}

export function getDB() {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
}

export function getCollection() {
  return getDB().collection("words");
}
