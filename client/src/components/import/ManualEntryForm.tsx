import { useState } from "react";
import { PenLine, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { wordApi } from "../../api";
import { useWordStore } from "../../store/wordStore";
import type { Word } from "../../types";

type UpdateFn = (id: string, patch: Partial<Pick<Word, "translation" | "englishExplanation" | "partOfSpeech" | "partOfSpeechZh" | "article" | "category" | "notes">>) => Promise<void>;

/** Poll GET /api/words/:id until translation or POS is populated, then patch the store. */
async function pollForEnrichment(id: string, updateWord: UpdateFn) {
  const MAX_ATTEMPTS = 20;
  const INTERVAL_MS = 2000;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
    try {
      const refreshed = await wordApi.getOne(id);
      if (refreshed.translation || refreshed.partOfSpeech !== "unknown") {
        await updateWord(id, {
          translation: refreshed.translation,
          englishExplanation: refreshed.englishExplanation,
          partOfSpeech: refreshed.partOfSpeech,
          partOfSpeechZh: refreshed.partOfSpeechZh,
          article: refreshed.article,
          category: refreshed.category,
        });
        return;
      }
    } catch {
      // ignore transient errors and keep retrying
    }
  }
}

export default function ManualEntryForm() {
  const { addWords, updateWord } = useWordStore();
  const [word, setWord] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
    setLoading(true);
    try {
      const created = await wordApi.create({ word: word.trim(), notes });
      addWords([created]);
      toast.success(`"${created.word}" added! Fetching translation…`);
      setWord("");
      setNotes("");
      // Background: poll until server enrichment finishes, then silently update store
      void pollForEnrichment(created.id, updateWord);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to add word";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center">
          <PenLine size={18} className="text-brand-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Manual Entry</h2>
          <p className="text-xs text-slate-400">Add a word by typing it in</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Dutch word *</label>
          <input
            className="input"
            placeholder="e.g. gezellig"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Usage notes, examples…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-400">
          After you add the word, the app auto-fetches English explanation, part of speech, and de/het for nouns.
        </p>
        <button className="btn-primary w-full justify-center" type="submit" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Add Word
        </button>
      </form>
    </div>
  );
}
