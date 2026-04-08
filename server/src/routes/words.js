import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { getAll, getById, addWords, deleteWord, updateWord } from "../store.js";
import { enrichWordEntries } from "../services/wordMeta.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getAll());
});

router.get("/:id", (req, res) => {
  const word = getById(req.params.id);
  if (!word) return res.status(404).json({ message: "Not found" });
  res.json(word);
});

router.post(
  "/",
  [
    body("word").trim().notEmpty().withMessage("word is required"),
    body("notes").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Save immediately so manual add feels instant, then enrich metadata in background.
    const added = addWords([
      {
        word: req.body.word,
        notes: req.body.notes,
        source: "manual",
      },
    ]);
    if (added.length === 0) {
      return res.status(409).json({ message: "Word already exists" });
    }

    const created = added[0];
    res.status(201).json(created);

    void enrichWordEntries(
      [
        {
          word: created.word,
          notes: created.notes,
          source: created.source,
        },
      ],
      1,
      { translationMode: "fast" }
    )
      .then((enriched) => {
        const meta = enriched[0];
        if (!meta) return;
        updateWord(created.id, {
          translation: meta.translation,
          englishExplanation: meta.englishExplanation,
          partOfSpeech: meta.partOfSpeech,
          partOfSpeechZh: meta.partOfSpeechZh,
          article: meta.article,
          category: meta.category,
        });
      })
      .catch((err) => {
        console.error("Background enrichment failed:", err?.message || err);
      });
  }
);

router.patch(
  "/:id",
  [
    param("id").notEmpty(),
    body("translation").optional().trim(),
    body("englishExplanation").optional().trim(),
    body("partOfSpeech").optional().trim(),
    body("partOfSpeechZh").optional().trim(),
    body("article").optional().trim(),
    body("category").optional().trim(),
    body("notes").optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const updated = updateWord(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  }
);

router.delete("/:id", (req, res) => {
  const deleted = deleteWord(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Not found" });
  res.status(204).end();
});

export default router;
