import { create } from "zustand";
import type { Word } from "../types";
import { wordApi } from "../api";

interface WordStore {
  words: Word[];
  loading: boolean;
  fetchWords: () => Promise<void>;
  addWords: (newWords: Word[]) => void;
  deleteWord: (id: string) => Promise<void>;
  deleteWords: (ids: string[]) => Promise<void>;
  updateWord: (
    id: string,
    patch: Partial<
      Pick<Word, "translation" | "englishExplanation" | "partOfSpeech" | "partOfSpeechZh" | "article" | "category" | "notes">
    >
  ) => Promise<void>;
}

export const useWordStore = create<WordStore>((set) => ({
  words: [],
  loading: false,

  fetchWords: async () => {
    set({ loading: true });
    const words = await wordApi.getAll();
    set({ words, loading: false });
  },

  addWords: (newWords) => {
    set((s) => ({ words: [...newWords, ...s.words] }));
  },

  deleteWord: async (id) => {
    await wordApi.delete(id);
    set((s) => ({ words: s.words.filter((w) => w.id !== id) }));
  },

  deleteWords: async (ids) => {
    await Promise.all(ids.map((id) => wordApi.delete(id)));
    const idSet = new Set(ids);
    set((s) => ({ words: s.words.filter((w) => !idSet.has(w.id)) }));
  },

  updateWord: async (id, patch) => {
    const updated = await wordApi.update(id, patch);
    set((s) => ({
      words: s.words.map((w) => (w.id === id ? updated : w)),
    }));
  },
}));
