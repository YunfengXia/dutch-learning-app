import { Router } from "express";
import multer from "multer";
import { createWorker } from "tesseract.js";
import pdfParse from "pdf-parse";
import { addWords } from "../store.js";
import { extractUniqueDutchWords } from "../services/textWords.js";
import { enrichWordEntries } from "../services/wordMeta.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/tiff", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  },
});

async function textFromUpload(file) {
  if (file.mimetype === "application/pdf") {
    try {
      const parsed = await pdfParse(file.buffer);
      const text = (parsed.text ?? "").trim();
      if (text) {
        return text;
      }
    } catch (pdfErr) {
      console.warn("PDF text extraction failed, trying Tesseract fallback:", pdfErr.message);
    }

    // Fallback attempt: some PDFs may still OCR correctly from raw bytes.
    let worker;
    try {
      worker = await createWorker("nld");
      const {
        data: { text: ocrText },
      } = await worker.recognize(file.buffer);
      const trimmed = (ocrText ?? "").trim();
      if (!trimmed) {
        throw new Error("Unable to extract text from this PDF");
      }
      return trimmed;
    } catch (tesseractErr) {
      throw new Error(`PDF OCR failed: ${tesseractErr.message}`);
    } finally {
      if (worker) await worker.terminate();
    }
  }

  // Image file (JPG, PNG, WEBP, TIFF)
  let worker;
  try {
    worker = await createWorker("nld");
    const {
      data: { text },
    } = await worker.recognize(file.buffer);
    if (!text || !text.trim()) {
      throw new Error("No text detected in image");
    }
    return text;
  } catch (tesseractErr) {
    throw new Error(`Image OCR failed: ${tesseractErr.message}`);
  } finally {
    if (worker) await worker.terminate();
  }
}

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded or unsupported type" });
  }

  try {
    console.log(`[OCR] Processing ${req.file.originalname} (${req.file.size} bytes, type: ${req.file.mimetype})`);
    const text = await textFromUpload(req.file);

    const words = extractUniqueDutchWords(text);
    const entries = words.map((w) => ({ word: w, source: "ocr" }));

    console.log(`[OCR] Extracted ${words.length} unique tokens, enriching…`);
    // Enrich — enrichWord calls woordenlijst.org; isDutch=true means confirmed Dutch
    const enrichedEntries = await enrichWordEntries(entries);

    // Keep only confirmed Dutch words (verified via woordenlijst.org)
    const dutchEntries = enrichedEntries
      .filter((e) => e.isDutch)
      .map(({ isDutch, ...rest }) => rest);

    const added = addWords(dutchEntries);
    console.log(`[OCR] Complete: ${words.length} extracted → ${dutchEntries.length} Dutch → ${added.length} added`);

    res.json({
      rawText: text,
      extractedCount: words.length,
      dutchCount: dutchEntries.length,
      addedCount: added.length,
      words: added,
    });
  } catch (err) {
    console.error("[OCR] Error:", err.message, err.stack);
    res.status(500).json({ message: err.message || "OCR failed" });
  }
});

export default router;
