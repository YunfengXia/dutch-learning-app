import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { getAll, addWords, deleteWord, updateWord } from "../store.js";
import { enrichWordEntries } from "../services/wordMeta.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getAll());
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

    const enriched = await enrichWordEntries([
      {
        word: req.body.word,
        notes: req.body.notes,
        source: "manual",
      },
    ]);
    const added = addWords(enriched);
    if (added.length === 0) {
      return res.status(409).json({ message: "Word already exists" });
    }
    res.status(201).json(added[0]);
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
