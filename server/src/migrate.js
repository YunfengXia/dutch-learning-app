/**
 * One-time migration: reads server/data/words.json and inserts all words into MongoDB.
 * Run once with: node src/migrate.js
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data", "words.json");

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

const client = new MongoClient(uri);

async function migrate() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log("No words.json found — nothing to migrate.");
    process.exit(0);
  }

  const { words = [] } = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (words.length === 0) {
    console.log("words.json is empty — nothing to migrate.");
    process.exit(0);
  }

  await client.connect();
  const col = client.db().collection("words");

  let inserted = 0;
  let skipped = 0;

  for (const word of words) {
    const exists = await col.findOne({ word: { $regex: new RegExp(`^${word.word}$`, "i") } });
    if (!exists) {
      await col.insertOne(word);
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`Migration complete: ${inserted} inserted, ${skipped} already existed.`);
  await client.close();
}

migrate().catch((err) => { console.error(err); process.exit(1); });
