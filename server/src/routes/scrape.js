import { Router } from "express";
import { body, validationResult } from "express-validator";
import axios from "axios";
import * as cheerio from "cheerio";
import { addWords } from "../store.js";
import { extractDutchWordFrequency } from "../services/textWords.js";
import { enrichWordEntries } from "../services/wordMeta.js";

const router = Router();

router.post(
  "/",
  [body("url").trim().isURL().withMessage("A valid URL is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { url } = req.body;

    try {
      const { data } = await axios.get(url, {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DutchLearner/1.0)" },
      });
      const $ = cheerio.load(data);
      // remove nav/header/footer/script/style noise
      $("script, style, nav, header, footer, aside").remove();
      const rawText = $("body").text();
      const rankedWords = extractDutchWordFrequency(rawText);

      const entries = rankedWords.map(({ word, usageCount }) => ({
        word,
        usageCount,
        source: "scrape",
      }));
      const enrichedEntries = await enrichWordEntries(entries);

      // Keep only words confirmed in woordenlijst.org as valid Dutch
      const dutchEntries = enrichedEntries
        .filter((e) => e.isDutch)
        .map(({ isDutch, ...rest }) => rest);

      const added = addWords(dutchEntries);
      res.json({
        scrapedCount: rankedWords.length,
        dutchCount: dutchEntries.length,
        addedCount: added.length,
        words: added,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to scrape URL", detail: err.message });
    }
  }
);

export default router;
