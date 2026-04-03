import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";
import { useWordStore } from "../store/wordStore";
import type { Word } from "../types";
import { chunkWords, sortByStudyFrequency } from "../utils/frequency";
import { getDutchVoices, initSpeechVoices, setPreferredVoice, speakWord } from "../utils/speech";

const RATES: { label: string; value: number }[] = [
  { label: "Very slow", value: 0.55 },
  { label: "Slow", value: 0.75 },
  { label: "Natural", value: 0.9 },
  { label: "Fast", value: 1.05 },
  { label: "Very fast", value: 1.2 },
];

function formatLine(w: Word): string {
  const prefix = w.article ? `(${w.article}) ` : "";
  const pos = w.partOfSpeech || w.partOfSpeechZh || "";
  const eng = w.englishExplanation || w.translation || "";
  return `${prefix}${w.word}${pos ? ` / ${pos}` : ""}${eng ? ` / ${eng}` : ""}`;
}

export default function ListeningPage() {
  const words = useWordStore((s) => s.words);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(2);
  const [rateIndex, setRateIndex] = useState(2);
  const [groupIndex, setGroupIndex] = useState(0);
  const [voiceName, setVoiceName] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const frequencySorted = useMemo(() => sortByStudyFrequency(words), [words]);
  const groups = useMemo(() => chunkWords(frequencySorted, 20), [frequencySorted]);
  const groupWords = groups[groupIndex] ?? [];
  const totalWords = groupWords.length;
  const progress = totalWords > 0 ? (currentIndex / totalWords) * 100 : 0;
  const voices = useMemo(() => getDutchVoices(), [words.length]);

  const cancelAll = () => {
    window.speechSynthesis.cancel();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    activeRef.current = false;
  };

  const speakIndex = (idx: number) => {
    if (idx >= totalWords) {
      setIsPlaying(false);
      setCurrentIndex(0);
      activeRef.current = false;
      return;
    }
    const current = groupWords[idx];
    if (!current) return;
    setCurrentIndex(idx);
    speakWord(current, {
      rate: RATES[rateIndex].value,
      pitch: 1,
      onend: () => {
        if (!activeRef.current) return;
        timerRef.current = setTimeout(() => {
          if (!activeRef.current) return;
          speakIndex(idx + 1);
        }, breakSeconds * 1000);
      },
    });
  };

  const play = () => {
    if (totalWords === 0) return;
    cancelAll();
    activeRef.current = true;
    setIsPlaying(true);
    speakIndex(currentIndex);
  };

  const pause = () => {
    cancelAll();
    setIsPlaying(false);
  };

  const step = (delta: -1 | 1) => {
    cancelAll();
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(0, Math.min(totalWords - 1, prev + delta)));
  };

  useEffect(() => {
    initSpeechVoices();
    const list = getDutchVoices();
    if (list[0]) {
      setVoiceName(list[0].name);
      setPreferredVoice(list[0].name);
    }
    return () => cancelAll();
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
    pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex]);

  useEffect(() => {
    if (!voiceName) return;
    setPreferredVoice(voiceName);
    if (isPlaying) pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceName]);

  if (words.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-64 text-slate-400 text-sm">
        <Volume2 size={36} className="mb-3 text-slate-200" />
        No words in your list yet. Add some first!
      </div>
    );
  }

  const current = groupWords[currentIndex] ?? groupWords[0];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Listening Mode</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Words are sorted by practical usage frequency and grouped in batches of 20.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 grid sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Practice group</p>
          <select className="input" value={groupIndex} onChange={(e) => setGroupIndex(Number(e.target.value))}>
            {groups.map((g, i) => (
              <option key={i} value={i}>
                Group {i + 1} ({g.length} words)
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Voice quality</p>
          <select className="input" value={voiceName} onChange={(e) => setVoiceName(e.target.value)}>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Speed profile</p>
          <div className="flex flex-wrap gap-2">
            {RATES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setRateIndex(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  rateIndex === i
                    ? "bg-brand-600 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {current && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-2">
          <p className="text-4xl font-bold text-slate-800">
            {current.article ? (
              <span>
                <span className="text-brand-400 text-3xl mr-2">{current.article}</span>
                {current.word}
              </span>
            ) : current.word}
          </p>
          {(current.partOfSpeech || current.englishExplanation || current.translation) && (
            <p className="text-slate-500 text-sm">{formatLine(current)}</p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>
            Word {Math.min(currentIndex + 1, totalWords)} of {totalWords} (Group {groupIndex + 1}/{groups.length})
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => step(-1)}
          disabled={currentIndex === 0}
          className="p-3 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition"
          title="Previous word"
        >
          <SkipBack size={20} className="text-slate-600" />
        </button>

        {isPlaying ? (
          <button onClick={pause} className="p-4 rounded-full bg-brand-600 text-white hover:bg-brand-700 shadow transition">
            <Pause size={24} />
          </button>
        ) : (
          <button onClick={play} className="p-4 rounded-full bg-brand-600 text-white hover:bg-brand-700 shadow transition">
            <Play size={24} />
          </button>
        )}

        <button
          onClick={() => step(1)}
          disabled={currentIndex >= totalWords - 1}
          className="p-3 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition"
          title="Next word"
        >
          <SkipForward size={20} className="text-slate-600" />
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <p className="text-sm font-medium text-slate-700">
          Break between words: <span className="text-brand-600">{breakSeconds}s</span>
        </p>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={breakSeconds}
          onChange={(e) => setBreakSeconds(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-50 max-h-80 overflow-y-auto">
        {groupWords.map((w, i) => (
          <button
            key={w.id}
            onClick={() => {
              cancelAll();
              setIsPlaying(false);
              setCurrentIndex(i);
            }}
            className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors ${
              i === currentIndex ? "bg-brand-50" : ""
            }`}
          >
            <span className={`text-xs font-mono w-6 text-right shrink-0 ${i === currentIndex ? "text-brand-600 font-bold" : "text-slate-300"}`}>
              {i + 1}
            </span>
            <span className={`text-sm font-medium ${i === currentIndex ? "text-brand-700" : "text-slate-700"}`}>
              {formatLine(w)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
