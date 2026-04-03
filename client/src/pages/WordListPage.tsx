import { useEffect, useMemo, useState } from "react";
import { Search, ListOrdered } from "lucide-react";
import { useWordStore } from "../store/wordStore";

export default function WordListPage() {
  const { words, fetchWords, loading } = useWordStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (words.length === 0) {
      fetchWords();
    }
  }, [fetchWords, words.length]);

  const sorted = useMemo(
    () =>
      [...words].sort(
        (a, b) =>
          (b.usageCount ?? 1) - (a.usageCount ?? 1) ||
          a.word.localeCompare(b.word)
      ),
    [words]
  );

  const filtered = sorted.filter((w) => {
    const fullLine = `${w.article ? `${w.article} ` : ""}${w.word} / ${w.partOfSpeech || "unknown"} / ${w.englishExplanation || w.translation || ""}`;
    return fullLine.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Word List</h1>
          <p className="text-slate-400 text-sm mt-1">
            Format: (de/het when noun) word / part of speech / english explanation
          </p>
        </div>
        <div className="text-xs text-slate-400 bg-white border border-slate-100 rounded-xl px-3 py-2">
          Sorted by frequency (highest first)
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search in word list line..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16 text-sm">Loading word list…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ListOrdered size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">No words in list</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {filtered.map((word) => {
              const line = `${word.article ? `${word.article} ` : ""}${word.word} / ${word.partOfSpeech || "unknown"} / ${word.englishExplanation || word.translation || ""}`;
              return (
                <li key={word.id} className="px-4 py-3 flex items-start justify-between gap-4">
                  <p className="text-sm text-slate-700 break-words">{line}</p>
                  <span className="text-xs text-slate-400 shrink-0">x{word.usageCount ?? 1}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
