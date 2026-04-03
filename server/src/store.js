/**
 * In-memory word store.
 * Replace with a database (SQLite / Postgres) for persistence.
 *
 * Word shape:
 * {
 *   id: string,
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

let words = [];
let nextId = 1;

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
  return added;
}

export function deleteWord(id) {
  const before = words.length;
  words = words.filter((w) => w.id !== id);
  return words.length < before;
}

export function updateWord(id, patch) {
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  words[idx] = { ...words[idx], ...patch };
  return words[idx];
}
