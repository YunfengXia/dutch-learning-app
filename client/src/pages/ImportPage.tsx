import { useRef, useState } from "react";
import { FileText, Upload, ClipboardList, CheckSquare, Square, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { importApi } from "../api";
import { useWordStore } from "../store/wordStore";

type InputMode = "file" | "paste";

export default function ImportPage() {
  const [mode, setMode] = useState<InputMode>("file");
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addWords = useWordStore((s) => s.addWords);

  /* ── file helpers ── */
  const handleFile = (f: File) => {
    const ok = ["text/plain", "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type);
    if (!ok) { toast.error("Only .txt, .pdf, or .docx files are supported"); return; }
    setSelectedFile(f);
    setCandidates([]);
    setChecked(new Set());
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  /* ── extract ── */
  const extract = async () => {
    const payload = mode === "file" ? selectedFile : pasteText.trim();
    if (!payload) { toast.error("Nothing to extract"); return; }
    setLoading(true);
    try {
      const res = await importApi.extract(payload as File | string);
      setCandidates(res.candidates);
      setChecked(new Set(res.candidates));
      if (res.candidates.length === 0) {
        toast("No vocabulary candidates found");
      } else {
        toast.success(`Great! Found ${res.candidates.length} vocabulary candidates.`);
      }
    } catch {
      toast.error("Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── checkbox helpers ── */
  const toggle = (w: string) =>
    setChecked((prev) => { const n = new Set(prev); n.has(w) ? n.delete(w) : n.add(w); return n; });
  const selectAll = () => setChecked(new Set(candidates));
  const deselectAll = () => setChecked(new Set());

  /* ── confirm ── */
  const confirm = async () => {
    const words = candidates.filter((w) => checked.has(w));
    if (words.length === 0) { toast.error("Select at least one word"); return; }
    setConfirming(true);
    try {
      const res = await importApi.confirm(words);
      addWords(res.words);
      toast.success(`Added ${res.addedCount} Dutch words (${res.dutchCount} recognised as Dutch)`);
      setCandidates([]);
      setChecked(new Set());
      setSelectedFile(null);
      setPasteText("");
    } catch {
      toast.error("Import failed");
    } finally {
      setConfirming(false);
    }
  };

  const checkedCount = checked.size;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import Document</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Upload a file or paste text — the app will extract Dutch vocabulary candidates for you to review.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        {(["file", "paste"] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setCandidates([]); setChecked(new Set()); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {m === "file" ? <span className="flex items-center gap-2"><Upload size={15} />Upload File</span>
              : <span className="flex items-center gap-2"><ClipboardList size={15} />Paste Text</span>}
          </button>
        ))}
      </div>

      {/* Input area */}
      {mode === "file" ? (
        <div
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
            dragging ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".txt,.pdf,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <FileText size={36} className="mx-auto text-slate-300 mb-3" />
          {selectedFile ? (
            <p className="font-medium text-slate-700">{selectedFile.name}</p>
          ) : (
            <>
              <p className="font-medium text-slate-600">Drag & drop or click to browse</p>
              <p className="text-sm text-slate-400 mt-1">.txt, .pdf, or .docx — max 20 MB</p>
            </>
          )}
        </div>
      ) : (
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste Dutch text here…"
          rows={8}
          className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      )}

      <button
        onClick={extract}
        disabled={loading || (!selectedFile && !pasteText.trim())}
        className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? "Extracting…" : "Extract Vocabulary"}
      </button>

      {/* Preview */}
      {candidates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-700">
              {candidates.length} candidates — <span className="text-brand-600">{checkedCount} selected</span>
            </p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
                Select all
              </button>
              <button onClick={deselectAll} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
                Deselect all
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {candidates.map((w) => (
              <label
                key={w}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer"
              >
                <span className="text-brand-600">
                  {checked.has(w) ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300" />}
                </span>
                <input type="checkbox" className="sr-only" checked={checked.has(w)} onChange={() => toggle(w)} />
                <span className="text-sm text-slate-700 font-medium">{w}</span>
              </label>
            ))}
          </div>

          <button
            onClick={confirm}
            disabled={confirming || checkedCount === 0}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {confirming && <Loader2 size={18} className="animate-spin" />}
            {confirming ? "Adding words…" : `Add ${checkedCount} selected word${checkedCount !== 1 ? "s" : ""}`}
          </button>

          {confirming && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-semibold">Processing {checkedCount} word{checkedCount !== 1 ? "s" : ""} in fast mode…</p>
              <p className="text-emerald-700 mt-1">Please wait while we enrich part of speech, de/het, and translation.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
