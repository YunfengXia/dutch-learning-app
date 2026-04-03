import type { Word } from "../types";

const DUTCH_COMMON_RANK: Record<string, number> = {
  zijn: 1, hebben: 2, worden: 3, kunnen: 4, moeten: 5, willen: 6, gaan: 7, komen: 8, zeggen: 9, maken: 10,
  geven: 11, nemen: 12, zien: 13, weten: 14, denken: 15, vinden: 16, blijven: 17, werken: 18, spreken: 19, lopen: 20,
  huis: 21, man: 22, vrouw: 23, kind: 24, dag: 25, jaar: 26, tijd: 27, leven: 28, hand: 29, land: 30,
  water: 31, stad: 32, straat: 33, school: 34, werk: 35, taal: 36, woord: 37, vraag: 38, antwoord: 39, voorbeeld: 40,
  eten: 41, drinken: 42, brood: 43, melk: 44, koffie: 45, appel: 46, fiets: 47, trein: 48, auto: 49, station: 50,
  rood: 51, blauw: 52, groen: 53, geel: 54, zwart: 55, wit: 56, mooi: 57, goed: 58, slecht: 59, groot: 60,
  klein: 61, snel: 62, langzaam: 63, nieuw: 64, oud: 65, warm: 66, koud: 67, vroeg: 68, laat: 69, vandaag: 70,
  morgen: 71, gisteren: 72, avond: 73, ochtend: 74, middag: 75, week: 76, maand: 77, uur: 78, minuut: 79, seconde: 80,
};

function rankWord(word: Word) {
  const key = word.word.toLowerCase();
  const knownRank = DUTCH_COMMON_RANK[key];
  if (typeof knownRank === "number") {
    // Lower rank means more common.
    return { known: true, score: knownRank };
  }
  // Fallback: infer relative frequency from imported usageCount (higher usageCount = more common)
  const usage = Math.max(1, word.usageCount ?? 1);
  return { known: false, score: 1000 - Math.min(usage, 999) };
}

export function sortByStudyFrequency(words: Word[]) {
  return [...words].sort((a, b) => {
    const ra = rankWord(a);
    const rb = rankWord(b);
    if (ra.known !== rb.known) return ra.known ? -1 : 1;
    if (ra.score !== rb.score) return ra.score - rb.score;
    return a.word.localeCompare(b.word);
  });
}

export function chunkWords(words: Word[], size = 20) {
  const out: Word[][] = [];
  for (let i = 0; i < words.length; i += size) {
    out.push(words.slice(i, i + size));
  }
  return out;
}
