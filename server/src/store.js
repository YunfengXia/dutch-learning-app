import { getCollection } from "./db.js";

/**
 * MongoDB-backed word store.
 * All functions are async now; callers in routes already await them.
 *
 * Word shape (stored in MongoDB):
 * {
 *   _id: ObjectId (internal),
 *   id: string,        ← kept for API compatibility
 *   word: string,
 *   translation: string,
 *   englishExplanation: string,
 *   partOfSpeech: string,
 *   partOfSpeechZh: string,
 *   article: "de" | "het" | "",
 *   notes: string,
 *   usageCount: number,
 *   source: "manual" | "scrape" | "import" | "ocr",
 *   category: string,
 *   createdAt: string (ISO),
 * }
 */

function strip(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function getAll() {
  const col = getCollection();
  const docs = await col.find({}, { sort: { createdAt: 1 } }).toArray();
  return docs.map(strip);
}

export async function getById(id) {
  const col = getCollection();
  const doc = await col.findOne({ id });
  return strip(doc);
}

export async function addWords(entries) {
  const col = getCollection();
  const added = [];

  // Deduplicate within the incoming batch
  const seenInBatch = new Set();
  const uniqueEntries = [];
  for (const entry of entries) {
    const key = entry.word.toLowerCase();
    if (!seenInBatch.has(key)) {
      seenInBatch.add(key);
      uniqueEntries.push(entry);
    }
  }

  for (const entry of uniqueEntries) {
    const exists = await col.findOne({ word: { $regex: new RegExp(`^${entry.word}$`, "i") } });
    if (!exists) {
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        word: entry.word,
        translation: entry.translation ?? "",
        englishExplanation: entry.englishExplanation ?? "",
        partOfSpeech: entry.partOfSpeech ?? "unknown",
        partOfSpeechZh: entry.partOfSpeechZh ?? "未知",
        article: entry.article ?? "",
        notes: entry.notes ?? "",
        usageCount: typeof entry.usageCount === "number" ? entry.usageCount : 1,
        source: entry.source ?? "manual",
        category: entry.category ?? "general",
        createdAt: entry.createdAt ?? new Date().toISOString(),
      };
      await col.insertOne(record);
      added.push(strip(record));
    }
  }
  return added;
}

export async function deleteWord(id) {
  const col = getCollection();
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function updateWord(id, patch) {
  const col = getCollection();
  const result = await col.findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return strip(result);
}

