import { useEffect, useMemo, useState } from "react";
import { Search, BookOpen, Layers, Globe, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useWordStore } from "../store/wordStore";
import WordCard from "../components/words/WordCard";
import type { WordSource } from "../types";
import { initSpeechVoices } from "../utils/speech";

const SOURCES: { label: string; value: WordSource | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Manual", value: "manual" },
  { label: "Imported", value: "import" },
  { label: "Scraped", value: "scrape" },
];

export default function DashboardPage() {
  const { words, loading, fetchWords, deleteWords } = useWordStore();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<WordSource | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragAction, setDragAction] = useState<"select" | "deselect" | null>(null);

  useEffect(() => {
    fetchWords();
    initSpeechVoices();
  }, [fetchWords]);

  const categories = useMemo(() => {
    const set = new Set(words.map((w) => w.category || "general"));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [words]);

  const filtered = words.filter((w) => {
    const matchSource = sourceFilter === "all" || w.source === sourceFilter;
    const matchCategory = categoryFilter === "all" || (w.category || "general") === categoryFilter;
    const term = search.toLowerCase();
    const matchSearch =
      w.word.toLowerCase().includes(term) ||
      (w.translation || "").toLowerCase().includes(term) ||
      (w.englishExplanation || "").toLowerCase().includes(term) ||
      (w.category || "general").toLowerCase().includes(term);
    return matchSource && matchCategory && matchSearch;
  });

  const stats = [
    { label: "Total words", value: words.length, icon: <BookOpen size={18} />, color: "text-brand-600 bg-brand-50" },
    { label: "Manual", value: words.filter((w) => w.source === "manual").length, icon: <Layers size={18} />, color: "text-slate-600 bg-slate-100" },
    { label: "Imported", value: words.filter((w) => w.source === "import").length, icon: <Layers size={18} />, color: "text-indigo-600 bg-indigo-50" },
    { label: "Scraped", value: words.filter((w) => w.source === "scrape").length, icon: <Globe size={18} />, color: "text-emerald-600 bg-emerald-50" },
  ];

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startDrag = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setDragAction("deselect");
      } else {
        next.add(id);
        setDragAction("select");
      }
      return next;
    });
  };

  const dragEnter = (id: string) => {
    if (!dragAction) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (dragAction === "select") next.add(id);
      if (dragAction === "deselect") next.delete(id);
      return next;
    });
  };

  const endDrag = () => setDragAction(null);

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((w) => w.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteWords(ids);
    toast.success(`Deleted ${ids.length} words`);
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8" onPointerUp={endDrag}>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Vocabulary Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Review and manage your Dutch word collection with AI categories</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4 py-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search words, translation, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-44"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSourceFilter(s.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                sourceFilter === s.value
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            const next = !selectionMode;
            setSelectionMode(next);
            if (!next) clearSelection();
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${selectionMode ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          {selectionMode ? "Exit select mode" : "Mass edit mode"}
        </button>
        <button onClick={selectAllFiltered} disabled={!selectionMode || filtered.length === 0} className="px-3 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-40">
          Select all
        </button>
        <button onClick={clearSelection} disabled={!selectionMode || selectedIds.size === 0} className="px-3 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-40">
          Clear
        </button>
        <button
          onClick={deleteSelected}
          disabled={!selectionMode || selectedIds.size === 0}
          className="px-3 py-2 text-sm rounded-lg bg-rose-600 text-white disabled:opacity-40 inline-flex items-center gap-2"
        >
          <Trash2 size={14} /> Delete selected ({selectedIds.size})
        </button>
        {selectionMode && <p className="text-xs text-slate-400 ml-auto">Tip: hold click and swipe across cards to select/deselect quickly.</p>}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16 text-sm">Loading vocabulary…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">No words found</p>
          <p className="text-slate-300 text-sm mt-1">
            {words.length === 0 ? "Add your first word via Add Words or Import." : "Try a different search or filter"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((w) => (
            <WordCard
              key={w.id}
              word={w}
              selected={selectedIds.has(w.id)}
              selectionMode={selectionMode}
              onToggleSelect={toggleSelected}
              onPointerSelectStart={startDrag}
              onPointerSelectEnter={dragEnter}
              onPointerSelectEnd={endDrag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
