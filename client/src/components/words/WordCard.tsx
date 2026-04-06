import { useState } from "react";
import { Trash2, Pencil, Check, X, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import type { Word } from "../../types";
import { useWordStore } from "../../store/wordStore";
import { speakWord } from "../../utils/speech";

const POS_OPTIONS = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "determiner", "interjection", "numeral", "unknown"];
const POS_TO_ZH: Record<string, string> = {
  noun: "名词", verb: "动词", adjective: "形容词", adverb: "副词", pronoun: "代词",
  preposition: "介词", conjunction: "连词", determiner: "限定词", interjection: "感叹词",
  numeral: "数词", unknown: "未知",
};

interface Props {
  word: Word;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
  onPointerSelectStart?: (id: string) => void;
  onPointerSelectEnter?: (id: string) => void;
  onPointerSelectEnd?: () => void;
}

const sourceBadge: Record<string, string> = {
  manual: "badge-manual",
  scrape: "badge-scrape",
  import: "bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-medium",
  ocr: "badge-ocr",
};

const sourceLabel: Record<string, string> = {
  manual: "Manual",
  scrape: "Scraped",
  import: "Imported",
  ocr: "OCR",
};

export default function WordCard({
  word,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  onPointerSelectStart,
  onPointerSelectEnter,
  onPointerSelectEnd,
}: Props) {
  const { deleteWord, updateWord } = useWordStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    englishExplanation: word.englishExplanation || word.translation,
    partOfSpeech: word.partOfSpeech || "unknown",
    partOfSpeechZh: word.partOfSpeechZh,
    article: word.article,
    category: word.category || "general",
    notes: word.notes,
  });

  const openEdit = () => {
    // Always sync from the latest word prop so background enrichment is reflected.
    setDraft({
      englishExplanation: word.englishExplanation || word.translation,
      partOfSpeech: word.partOfSpeech || "unknown",
      partOfSpeechZh: word.partOfSpeechZh,
      article: word.article,
      category: word.category || "general",
      notes: word.notes,
    });
    setEditing(true);
  };

  const handleDelete = async () => {
    await deleteWord(word.id);
    toast.success(`"${word.word}" removed`);
  };

  const handleSave = async () => {
    const zhFromPos = POS_TO_ZH[draft.partOfSpeech] ?? draft.partOfSpeechZh;
    await updateWord(word.id, {
      translation: draft.englishExplanation,
      englishExplanation: draft.englishExplanation,
      partOfSpeech: draft.partOfSpeech,
      partOfSpeechZh: zhFromPos,
      article: draft.article,
      category: draft.category,
      notes: draft.notes,
    });
    setEditing(false);
    toast.success("Updated");
  };

  const displayLine = `${word.article ? `${word.article} ` : ""}${word.word} / ${word.partOfSpeech || "unknown"} / ${word.englishExplanation || word.translation || ""}`;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${
        selected ? "border-brand-400 ring-2 ring-brand-100" : "border-slate-100"
      }`}
      onPointerDown={() => selectionMode && onPointerSelectStart?.(word.id)}
      onPointerEnter={() => selectionMode && onPointerSelectEnter?.(word.id)}
      onPointerUp={() => selectionMode && onPointerSelectEnd?.()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-semibold text-slate-800 text-lg leading-tight">{displayLine}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={sourceBadge[word.source] ?? "bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-xs font-medium"}>
              {sourceLabel[word.source] ?? word.source}
            </span>
            <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-xs font-medium">
              {word.category || "general"}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {selectionMode && (
            <button
              onClick={() => onToggleSelect?.(word.id)}
              className={`p-2 rounded-lg border ${selected ? "border-brand-300 bg-brand-50 text-brand-600" : "border-slate-200 text-slate-400"}`}
              title="Select"
            >
              <Check size={14} />
            </button>
          )}
          <button onClick={() => speakWord(word, { rate: 0.9, pitch: 1 })} className="p-2 rounded-lg hover:bg-sky-50 text-sky-500" title="Pronounce">
            <Volume2 size={15} />
          </button>
          {editing ? (
            <>
              <button onClick={handleSave} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600">
                <Check size={15} />
              </button>
              <button onClick={() => setEditing(false)} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400">
                <X size={15} />
              </button>
            </>
          ) : (
            <>
              <button onClick={openEdit} className="p-2 rounded-lg hover:bg-brand-50 text-brand-400">
                <Pencil size={15} />
              </button>
              <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-rose-50 text-rose-400">
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <input
            className="input text-sm"
            placeholder="English explanation / translation"
            value={draft.englishExplanation}
            onChange={(e) => setDraft((d) => ({ ...d, englishExplanation: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="input text-sm"
              value={draft.partOfSpeech}
              onChange={(e) => setDraft((d) => ({ ...d, partOfSpeech: e.target.value }))}
            >
              {POS_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              className="input text-sm"
              value={draft.article}
              onChange={(e) => setDraft((d) => ({ ...d, article: e.target.value as "de" | "het" | "" }))}
            >
              <option value="">No article</option>
              <option value="de">de</option>
              <option value="het">het</option>
            </select>
          </div>
          <input
            className="input text-sm"
            placeholder="Category"
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value.toLowerCase() }))}
          />
          <textarea
            className="input text-sm resize-none"
            rows={2}
            placeholder="Notes"
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          />
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">Usage count: {word.usageCount ?? 1}</p>
          {word.notes && <p className="text-xs text-slate-400 italic">{word.notes}</p>}
        </>
      )}
    </div>
  );
}
