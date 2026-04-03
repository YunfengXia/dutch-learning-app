export type WordSource = "manual" | "scrape" | "import" | "ocr";

export interface Word {
  id: string;
  word: string;
  translation: string;
  englishExplanation: string;
  partOfSpeech: string;
  partOfSpeechZh: string;
  article: "de" | "het" | "";
  notes: string;
  usageCount: number;
  source: WordSource;
  category: string;
  createdAt: string;
}
