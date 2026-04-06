import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "words.json");

/**
 * File-backed word store.
 * Words are persisted to data/words.json so they survive server restarts.
 */

function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return { words: [], nextId: 1 };
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { words: [], nextId: 1 };
  }
}

function saveToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ words, nextId }, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist words:", err);
  }
}

const stored = loadFromDisk();
let words = stored.words;
let nextId = stored.nextId ?? 1;

export function getAll() {
  return words;
}

export function addWords(entries) {
  const added = [];
  // Deduplicate within the incoming batch (keeps first occurrence)
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
    const exists = words.find(
      (w) => w.word.toLowerCase() === entry.word.toLowerCase()
    );
    if (!exists) {
      const record = {
        id: String(nextId++),
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
        createdAt: new Date().toISOString(),
      };
      words.push(record);
      added.push(record);
    }
  }
  if (added.length > 0) saveToDisk();
  return added;
}

export function deleteWord(id) {
  const before = words.length;
  words = words.filter((w) => w.id !== id);
  const deleted = words.length < before;
  if (deleted) saveToDisk();
  return deleted;
}

export function updateWord(id, patch) {
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  words[idx] = { ...words[idx], ...patch };
  saveToDisk();
  return words[idx];
}
