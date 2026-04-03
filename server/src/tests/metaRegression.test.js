import { enrichWord } from "../services/wordMeta.js";

const CASES = [
  { word: "dag", partOfSpeech: "noun", article: "de" },
  { word: "huis", partOfSpeech: "noun", article: "het" },
  { word: "water", partOfSpeech: "noun", article: "het" },
  { word: "boom", partOfSpeech: "noun", article: "de" },
  { word: "vrouw", partOfSpeech: "noun", article: "de" },
  { word: "kind", partOfSpeech: "noun", article: "het" },
  { word: "meisje", partOfSpeech: "noun", article: "het" },
  { word: "boek", partOfSpeech: "noun", article: "het" },
  { word: "tafel", partOfSpeech: "noun", article: "de" },
  { word: "auto", partOfSpeech: "noun", article: "de" },
  { word: "lopen", partOfSpeech: "verb", article: "" },
  { word: "jij", partOfSpeech: "pronoun", article: "" },
  { word: "en", partOfSpeech: "conjunction", article: "" },
];

function formatResult(result) {
  return `pos=${result.partOfSpeech}, article=${result.article || "(empty)"}, isDutch=${result.isDutch}`;
}

async function run() {
  let failed = 0;

  console.log(`Running POS/article regression on ${CASES.length} words...`);

  for (const testCase of CASES) {
    const result = await enrichWord(testCase.word);

    const posOk = result.partOfSpeech === testCase.partOfSpeech;
    const articleOk = (result.article || "") === testCase.article;

    if (posOk && articleOk) {
      console.log(`PASS ${testCase.word}: ${formatResult(result)}`);
      continue;
    }

    failed += 1;
    console.error(
      `FAIL ${testCase.word}: expected pos=${testCase.partOfSpeech}, article=${testCase.article || "(empty)"}; got ${formatResult(result)}`,
    );
  }

  if (failed > 0) {
    console.error(`\n${failed} regression test(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll metadata regression tests passed.");
}

run().catch((err) => {
  console.error("Meta regression test crashed:", err);
  process.exit(1);
});
