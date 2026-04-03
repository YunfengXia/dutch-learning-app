import axios from "axios";
import * as cheerio from "cheerio";

const cache = new Map();
const WOORDENLIJST_URL = "https://woordenlijst.org/MolexServe/lexicon/find_wordform";
const WOORDENLIJST_DB = "gig_pro_wrdlst";
const WIKTIONARY_API_URL = "https://nl.wiktionary.org/w/api.php";
const LINGUEE_URL = "https://www.linguee.com/english-dutch/search";
const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

const POS_TO_ZH = {
  noun: "名词",
  verb: "动词",
  adjective: "形容词",
  adverb: "副词",
  pronoun: "代词",
  preposition: "介词",
  conjunction: "连词",
  determiner: "限定词",
  interjection: "感叹词",
  numeral: "数词",
  unknown: "未知",
};

const CATEGORY_RULES = [
  {
    category: "food",
    words: ["brood", "water", "koffie", "bier", "melk", "appel", "fruit", "vlees", "vis", "rijst", "aardappel", "eten", "drink", "food", "meal", "bread", "milk", "coffee", "tea", "sugar", "salt"],
  },
  {
    category: "clothes",
    words: ["jas", "broek", "shirt", "jurk", "schoen", "sokken", "kleding", "hoed", "coat", "pants", "dress", "clothes", "shoe", "hat"],
  },
  {
    category: "colors",
    words: ["rood", "blauw", "groen", "geel", "zwart", "wit", "grijs", "paars", "oranje", "kleur", "red", "blue", "green", "yellow", "black", "white", "color"],
  },
  {
    category: "home",
    words: ["huis", "kamer", "keuken", "tafel", "stoel", "deur", "raam", "bed", "woning", "home", "house", "room", "kitchen", "window", "door", "table", "chair"],
  },
  {
    category: "travel",
    words: ["trein", "bus", "auto", "fiets", "station", "straat", "weg", "vliegtuig", "reis", "travel", "train", "bus", "car", "bike", "road", "airport", "ticket"],
  },
  {
    category: "people",
    words: ["man", "vrouw", "kind", "familie", "vriend", "moeder", "vader", "broer", "zus", "persoon", "people", "person", "family", "friend", "mother", "father"],
  },
  {
    category: "time",
    words: ["dag", "week", "maand", "jaar", "ochtend", "middag", "avond", "nacht", "tijd", "hour", "day", "week", "month", "year", "time", "today", "tomorrow"],
  },
  {
    category: "work-study",
    words: ["werk", "school", "studie", "leraar", "student", "boek", "taal", "les", "kantoor", "baan", "work", "study", "school", "teacher", "student", "office", "job"],
  },
  {
    category: "health",
    words: ["arts", "ziek", "gezond", "pijn", "lichaam", "ziekenhuis", "medicijn", "doctor", "hospital", "health", "pain", "medicine"],
  },
  {
    category: "shopping",
    words: ["winkel", "markt", "prijs", "geld", "kopen", "verkopen", "shop", "buy", "sell", "money", "price", "store"],
  },
  {
    category: "nature",
    words: ["boom", "bloem", "zon", "maan", "regen", "wind", "zee", "berg", "natuur", "tree", "flower", "sun", "moon", "rain", "wind", "sea", "mountain"],
  },
];

function inferCategory(word, translation, partOfSpeech) {
  const bag = `${word} ${translation}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((w) => bag.includes(w))) {
      return rule.category;
    }
  }
  if (partOfSpeech === "verb") return "actions";
  if (partOfSpeech === "adjective") return "descriptions";
  if (partOfSpeech === "numeral") return "numbers";
  return "general";
}

function normalizePos(posText = "") {
  const lower = posText.trim().toLowerCase();
  if (!lower) return "unknown";
  if (lower.startsWith("nou")) return "noun";
  if (lower.startsWith("vrb")) return "verb";
  if (lower.startsWith("aa")) return "adjective";
  if (lower.startsWith("adv")) return "adverb";
  if (lower.startsWith("pd")) return "pronoun";
  if (lower.startsWith("adp")) return "preposition";
  if (lower.startsWith("conj")) return "conjunction";
  if (lower.startsWith("det")) return "determiner";
  if (lower.startsWith("int")) return "interjection";
  if (lower.startsWith("num")) return "numeral";
  // Also handle RES (result/symbol) as noun-adjacent
  if (lower.startsWith("res")) return "numeral";
  return "unknown";
}

function scoreNounLemma(lemma) {
  // Prefer complete noun definitions over interjections, symbols, etc.
  // Returns score: higher is better pick
  const pos = (lemma.lemma_part_of_speech ?? "").toLowerCase();
  const gloss = (lemma.gloss ?? "").toLowerCase();

  if (pos.startsWith("nou")) {
    // Noun: prefer those with actual glosses and common meanings
    let score = 100;
    if (gloss && gloss.length > 3) score += 20; // Has gloss
    if (gloss && !gloss.includes("verklein")) score += 10; // Not diminutive
    if (gloss && gloss.includes("periode")) score += 15; // Common time meaning
    return score;
  }

  if (pos.startsWith("int")) {
    // Interjection: lower priority
    return 30;
  }

  if (pos.startsWith("res")) {
    // Symbol/Formula: lowest priority
    return 10;
  }

  // Other POS lower priority
  return 50;
}

function extractGenderFromPos(posText) {
  // Extract gender from patterns like:
  // NOU-C(gender=m) → "m"
  // NOU-C(gender=m/f,number=sg) → "m/f"
  // NOU-C(gender=n) → "n"
  const match = posText.match(/gender=([a-z/]+)/i);
  return match ? match[1] : null;
}

function genderToArticle(gender) {
  if (!gender) return "";
  const g = gender.toLowerCase().trim();
  if (g.includes("n")) return "het"; // neuter → het
  if (g.includes("m") || g.includes("f")) return "de"; // masculine/feminine → de
  return "";
}

async function fetchWoordenlijstMeta(word) {
  try {
    const response = await axios.get(WOORDENLIJST_URL, {
      timeout: 10000,
      params: {
        database: WOORDENLIJST_DB,
        wordform: word,
        part_of_speech: "",
        paradigm: true,
        diminutive: true,
        onlyvalid: true,
        regex: false,
      },
      // Endpoint can return either XML or JSON based on content negotiation.
      responseType: "text",
    });

    const rawData = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    const lemmata = [];

    // JSON response path (preferred when available)
    const trimmed = rawData.trim();
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      const paradigms = Array.isArray(parsed?.paradigms) ? parsed.paradigms : [];

      for (const p of paradigms) {
        const lemmaText = (p?.lemma ?? "").trim();
        const posText = (p?.partOfSpeech ?? "").trim();
        const label = (p?.label ?? "").trim();
        const gloss = (p?.gloss ?? "").trim();
        const id = String(p?.lemmaId ?? "").trim();

        if (lemmaText.toLowerCase() === word.toLowerCase() && posText) {
          lemmata.push({
            lemma: lemmaText,
            lemma_id: id,
            lemma_part_of_speech: posText,
            label,
            gloss,
          });
        }
      }
    } else {
      // XML fallback path
      const $ = cheerio.load(rawData, { xmlMode: true });
      $("found_lemmata").each((_idx, elem) => {
        const lemmaText = $(elem).find("lemma").first().text().trim();
        const posText = $(elem).find("lemma_part_of_speech").text().trim();
        const label = $(elem).find("label").text().trim();
        const gloss = $(elem).find("gloss").text().trim();
        const id = $(elem).find("lemma_id").text().trim();

        if (lemmaText.toLowerCase() === word.toLowerCase() && posText) {
          lemmata.push({
            lemma: lemmaText,
            lemma_id: id,
            lemma_part_of_speech: posText,
            label,
            gloss,
          });
        }
      });
    }

    if (lemmata.length === 0) {
      return null;
    }

    // Score and pick best lemma (prefer noun > others)
    let best = lemmata[0];
    let bestScore = scoreNounLemma(best);

    for (let i = 1; i < lemmata.length; i++) {
      const score = scoreNounLemma(lemmata[i]);
      if (score > bestScore) {
        bestScore = score;
        best = lemmata[i];
      }
    }

    const partOfSpeech = normalizePos(best.lemma_part_of_speech);
    const gender = extractGenderFromPos(best.lemma_part_of_speech);
    const article = partOfSpeech === "noun" ? genderToArticle(gender) : "";

    return { partOfSpeech, article };
  } catch (err) {
    console.error(`[wordMeta] Error for "${word}":`, err.message);
    return null;
  }
}

function extractDutchSection(wikitext = "") {
  const nldStart = wikitext.search(/\{\{=nld=\}\}/i);
  if (nldStart < 0) return "";
  const fromNld = wikitext.slice(nldStart);
  const nextLang = fromNld.search(/\n\{\{=[a-z]{3}=\}\}/i);
  if (nextLang < 0) return fromNld;
  return fromNld.slice(0, nextLang);
}

function normalizeWiktionaryPos(section) {
  const rules = [
    { regex: /\{\{-noun-\|nld\}\}/i, pos: "noun" },
    { regex: /\{\{-verb-\|nld\}\}/i, pos: "verb" },
    { regex: /\{\{-adjc-\|nld\}\}/i, pos: "adjective" },
    { regex: /\{\{-adverb-\|nld\}\}/i, pos: "adverb" },
    { regex: /\{\{-prep-\|nld\}\}/i, pos: "preposition" },
    { regex: /\{\{-conj-\|nld\}\}/i, pos: "conjunction" },
    { regex: /\{\{-pronoun-\|nld\}\}/i, pos: "pronoun" },
    { regex: /\{\{-pronom[^}]*\|nld\}\}/i, pos: "pronoun" },
    { regex: /\{\{-det-\|nld\}\}/i, pos: "determiner" },
    { regex: /\{\{-interj-\|nld\}\}/i, pos: "interjection" },
    { regex: /\{\{-num-\|nld\}\}/i, pos: "numeral" },
  ];

  for (const rule of rules) {
    if (rule.regex.test(section)) return rule.pos;
  }

  return "unknown";
}

function extractWiktionaryGender(section) {
  // Common nl.wiktionary pattern: {{-l-|m}} / {{-l-|n}} / {{-l-|m/v|etym=A}}
  const match = section.match(/\{\{-l-\|([a-z/]+)(?:\|[^}]*)?\}\}/i);
  return match ? match[1] : null;
}

async function fetchWiktionaryMeta(word) {
  try {
    const { data } = await axios.get(WIKTIONARY_API_URL, {
      timeout: 10000,
      params: {
        action: "query",
        prop: "revisions",
        rvslots: "main",
        rvprop: "content",
        formatversion: 2,
        format: "json",
        titles: word,
      },
    });

    const page = data?.query?.pages?.[0];
    const content = page?.revisions?.[0]?.slots?.main?.content;
    if (!content || typeof content !== "string") return null;

    const dutchSection = extractDutchSection(content);
    if (!dutchSection) return null;

    const partOfSpeech = normalizeWiktionaryPos(dutchSection);
    const gender = extractWiktionaryGender(dutchSection);
    const article = partOfSpeech === "noun" ? genderToArticle(gender) : "";

    if (partOfSpeech === "unknown" && !article) return null;
    return { partOfSpeech, article };
  } catch {
    return null;
  }
}

function mergeMeta(primaryMeta, fallbackMeta) {
  if (!primaryMeta) return fallbackMeta;
  if (!fallbackMeta) return primaryMeta;

  const mergedPos = primaryMeta.partOfSpeech !== "unknown"
    ? primaryMeta.partOfSpeech
    : fallbackMeta.partOfSpeech;

  let mergedArticle = primaryMeta.article || "";
  if (!mergedArticle) {
    if (primaryMeta.partOfSpeech === "noun" || mergedPos === "noun") {
      mergedArticle = fallbackMeta.article || "";
    }
  }

  return {
    partOfSpeech: mergedPos,
    article: mergedArticle,
  };
}

async function fetchLingueeTranslation(word) {
  try {
    const { data } = await axios.get(LINGUEE_URL, {
      timeout: 10000,
      params: { source: "dutch", query: word },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    const $ = cheerio.load(data);
    const selectors = [
      ".isForeignTerm .exact .lemma.featured .translation_lines .translation .translation_desc .tag_trans a.dictLink.featured",
      ".isForeignTerm .exact .lemma .translation_lines .translation .translation_desc .tag_trans a.dictLink.featured",
      ".isForeignTerm .exact .lemma .translation_lines .translation .translation_desc .tag_trans a.dictLink",
      ".isForeignTerm .exact .lemma .translation_desc .tag_trans a.dictLink",
    ];

    for (const selector of selectors) {
      const txt = $(selector).first().text().replace(/\s+/g, " ").trim();
      if (txt) return txt;
    }

    return "";
  } catch {
    return "";
  }
}

async function fetchGoogleTranslation(word) {
  try {
    const { data } = await axios.get(GOOGLE_TRANSLATE_URL, {
      timeout: 8000,
      params: {
        client: "gtx",
        sl: "nl",
        tl: "en",
        dt: "t",
        q: word,
      },
    });
    // data[0] is an array of [translated_chunk, original_chunk, ...] pairs
    const translated = (data?.[0] ?? [])
      .filter(Array.isArray)
      .map((pair) => (typeof pair[0] === "string" ? pair[0] : ""))
      .join("")
      .trim();

    return translated && translated.toLowerCase() !== word.toLowerCase() ? translated : "";
  } catch {
    return "";
  }
}

async function fetchMyMemoryTranslation(word) {
  try {
    const { data } = await axios.get(MYMEMORY_URL, {
      timeout: 8000,
      params: { q: word, langpair: "nl|en" },
    });
    const translated = (data?.responseData?.translatedText ?? "").trim();
    return translated && translated.toLowerCase() !== word.toLowerCase() ? translated : "";
  } catch {
    return "";
  }
}

async function fetchTranslation(word) {
  const linguee = await fetchLingueeTranslation(word);
  if (linguee) return linguee;

  // Parallel fallback: try Google Translate and MyMemory at the same time
  const [google, mymemory] = await Promise.all([
    fetchGoogleTranslation(word),
    fetchMyMemoryTranslation(word),
  ]);

  return google || mymemory || "";
}

async function fetchTranslationFast(word) {
  // Fast mode for large imports: skip slow HTML scraping source.
  const [google, mymemory] = await Promise.all([
    fetchGoogleTranslation(word),
    fetchMyMemoryTranslation(word),
  ]);
  return google || mymemory || "";
}

export async function enrichWord(word, options = {}) {
  const { translationMode = "quality" } = options;
  const key = `${translationMode}:${word.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);

  const translationPromise = translationMode === "fast"
    ? fetchTranslationFast(word)
    : fetchTranslation(word);

  const [woordenlijstMeta, translation] = await Promise.all([
    fetchWoordenlijstMeta(word),
    translationPromise,
  ]);

  let resolvedMeta = woordenlijstMeta;
  const needsFallback =
    !resolvedMeta ||
    resolvedMeta.partOfSpeech === "unknown" ||
    (resolvedMeta.partOfSpeech === "noun" && !resolvedMeta.article);

  if (needsFallback) {
    const wiktionaryMeta = await fetchWiktionaryMeta(word);
    resolvedMeta = mergeMeta(resolvedMeta, wiktionaryMeta);
  }

  const isDutch = resolvedMeta !== null;
  const partOfSpeech = resolvedMeta?.partOfSpeech ?? "unknown";
  const cleanedTranslation = (translation || "").trim();

  const result = {
    isDutch,
    translation: cleanedTranslation,
    englishExplanation: cleanedTranslation,
    partOfSpeech,
    partOfSpeechZh: POS_TO_ZH[partOfSpeech] ?? POS_TO_ZH.unknown,
    article: partOfSpeech === "noun" ? resolvedMeta?.article ?? "" : "",
    category: inferCategory(word, cleanedTranslation, partOfSpeech),
  };

  cache.set(key, result);
  return result;
}

export async function enrichWordEntries(entries, concurrency = 4, options = {}) {
  const enriched = [];
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length) {
      const i = cursor++;
      const entry = entries[i];
      const meta = await enrichWord(entry.word, options);
      enriched[i] = { ...entry, ...meta };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
  return enriched;
}
