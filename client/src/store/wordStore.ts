import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Word } from "../types";
import { wordApi } from "../api";

interface WordStore {
  words: Word[];
  loading: boolean;
  fetchWords: (options?: { silent?: boolean }) => Promise<void>;
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

function mergeByWord(existing: Word[], incoming: Word[]): Word[] {
  const byWord = new Map<string, Word>();

  // Keep existing first so local cached edits survive slow/empty backend responses.
  for (const w of existing) {
    byWord.set(w.word.toLowerCase(), w);
  }
  for (const w of incoming) {
    const key = w.word.toLowerCase();
    if (!byWord.has(key)) byWord.set(key, w);
  }

  return Array.from(byWord.values());
}

export const useWordStore = create<WordStore>()(
  persist(
    (set) => ({
      words: [],
      loading: false,

      fetchWords: async (options) => {
        const silent = options?.silent === true;
        if (!silent) set({ loading: true });

        try {
          const remoteWords = await wordApi.getAll();
          set((s) => ({
            // If remote is empty but cache has data, keep cache to prevent accidental wipe.
            words: remoteWords.length === 0 && s.words.length > 0 ? s.words : mergeByWord(s.words, remoteWords),
            loading: false,
          }));
        } catch {
          set({ loading: false });
        }
      },

      addWords: (newWords) => {
        set((s) => ({ words: mergeByWord(newWords, s.words) }));
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
    }),
    {
      name: "word-store-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ words: state.words }),
    }
  )
);
