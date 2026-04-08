import axios from "axios";
import type { Word } from "../types";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api";
const api = axios.create({ baseURL: apiBaseUrl });

export const wordApi = {
  getAll: () => api.get<Word[]>("/words").then((r) => r.data),
  getOne: (id: string) => api.get<Word>(`/words/${id}`).then((r) => r.data),
  create: (payload: { word: string; notes?: string }) =>
    api.post<Word>("/words", payload).then((r) => r.data),
  update: (
    id: string,
    patch: Partial<
      Pick<Word, "translation" | "englishExplanation" | "partOfSpeech" | "partOfSpeechZh" | "article" | "category" | "notes">
    >
  ) =>
    api.patch<Word>(`/words/${id}`, patch).then((r) => r.data),
  delete: (id: string) => api.delete(`/words/${id}`),
};

export const scrapeApi = {
  scrape: (url: string) =>
    api
      .post<{ scrapedCount: number; dutchCount: number; addedCount: number; words: Word[] }>("/scrape", { url })
      .then((r) => r.data),
};

export const importApi = {
  extract: (payload: File | string) => {
    if (typeof payload === "string") {
      return api
        .post<{ candidates: string[]; total: number }>("/import/extract", { text: payload })
        .then((r) => r.data);
    }
    const fd = new FormData();
    fd.append("file", payload);
    return api
      .post<{ candidates: string[]; total: number }>("/import/extract", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  confirm: (words: string[]) =>
    api
      .post<{ requested: number; dutchCount: number; addedCount: number; words: Word[] }>("/import/confirm", { words })
      .then((r) => r.data),
};
