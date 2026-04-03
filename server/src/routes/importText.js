import { Router } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { extractUniqueDutchWords } from "../services/textWords.js";
import { enrichWordEntries } from "../services/wordMeta.js";
import { addWords } from "../store.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

/**
 * Dutch filler / function words to exclude from vocabulary suggestions.
 * These are articles, pronouns, prepositions, conjunctions, auxiliaries and
 * other high-frequency structural words that carry no standalone learning value.
 */
const STOPWORDS = new Set([
  // articles
  "de", "het", "een",
  // personal pronouns
  "ik", "jij", "je", "hij", "zij", "ze", "wij", "we", "jullie", "u",
  "mij", "me", "hem", "haar", "hen", "hun", "ons",
  // demonstratives / determiners
  "dit", "dat", "deze", "die", "elk", "elke", "alle", "ieder", "iedere",
  "beide", "beide", "sommige", "zulke", "zulk",
  // prepositions
  "in", "op", "aan", "van", "voor", "met", "bij", "naar", "uit", "tot",
  "over", "door", "om", "per", "na", "zonder", "binnen", "buiten",
  "onder", "boven", "naast", "tussen", "achter", "voor", "tegen",
  // conjunctions
  "en", "maar", "of", "want", "dus", "dat", "omdat", "als", "toch",
  "noch", "tenzij", "hoewel", "terwijl", "nadat", "voordat", "totdat",
  "zodra", "zodat", "waardoor", "waarbij", "waarmee", "waarop",
  // auxiliaries & modal verbs
  "zijn", "was", "waren", "is", "ben", "bent",
  "hebben", "heb", "hebt", "heeft", "had", "hadden",
  "worden", "word", "wordt", "werd", "werden",
  "kunnen", "kan", "kon", "konden",
  "mogen", "mag", "mocht", "mochten",
  "moeten", "moet", "moest", "moesten",
  "zullen", "zal", "zult", "zou", "zouden",
  "willen", "wil", "wilt", "wilde", "wilden",
  "gaan", "ga", "gaat", "ging", "gingen",
  "komen", "kom", "komt", "kwamen", "kwam",
  "doen", "doe", "doet", "deed", "deden",
  // adverbs & particles
  "er", "hier", "daar", "nu", "dan", "toen", "wel", "niet", "nog",
  "al", "heel", "erg", "zo", "ook", "altijd", "nooit", "soms", "vaak",
  "graag", "zelf", "samen", "misschien", "eigenlijk", "gewoon", "toch",
  "veel", "weinig", "meer", "minder", "heel", "echt", "alleen",
  "altijd", "nergens", "ergens", "overal", "ooit",
  // question words
  "wie", "wat", "waar", "wanneer", "waarom", "hoe", "welke", "welk",
  // numbers (first 20)
  "nul", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht",
  "negen", "tien", "elf", "twaalf", "dertien", "veertien", "vijftien",
  "zestien", "zeventien", "achttien", "negentien", "twintig",
  // other very common words with little standalone vocabulary value
  "naar", "dan", "heeft", "worden", "zijn",
]);

async function extractTextFromBuffer(file) {
  const mime = file.mimetype;

  if (mime === "text/plain") {
    return file.buffer.toString("utf8");
  }

  if (mime === "application/pdf") {
    const parsed = await pdfParse(file.buffer);
    return parsed.text ?? "";
  }

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value ?? "";
  }

  return "";
}

function extractVocabCandidates(text) {
  const allWords = extractUniqueDutchWords(text);
  return allWords.filter((w) => !STOPWORDS.has(w));
}

// POST /api/import/extract  ─  extract candidates without enrichment (fast preview)
router.post("/extract", upload.single("file"), async (req, res) => {
  let text = "";

  if (req.file) {
    text = await extractTextFromBuffer(req.file);
  } else if (typeof req.body?.text === "string") {
    text = req.body.text;
  }

  if (!text.trim()) {
    return res.status(400).json({ message: "No text content found" });
  }

  const candidates = extractVocabCandidates(text);
  res.json({ candidates, total: candidates.length });
});

// POST /api/import/confirm  ─  enrich + store the user-selected word strings
router.post("/confirm", async (req, res) => {
  const words = req.body?.words;
  if (!Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ message: "Provide a non-empty words array" });
  }

  const entries = words
    .filter((w) => typeof w === "string" && w.trim().length > 0)
    .map((w) => ({ word: w.trim(), source: "import" }));

  const enriched = await enrichWordEntries(entries, 12, { translationMode: "fast" });
  const dutchEntries = enriched.filter((e) => e.isDutch).map(({ isDutch, ...rest }) => rest);
  const added = addWords(dutchEntries);

  res.json({ requested: entries.length, dutchCount: dutchEntries.length, addedCount: added.length, words: added });
});

export default router;
