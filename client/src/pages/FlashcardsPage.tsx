import { useEffect, useState } from "react";
import { CreditCard, RotateCcw, ChevronRight, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { useWordStore } from "../store/wordStore";
import type { Word } from "../types";
import { initSpeechVoices, speakWord } from "../utils/speech";

type ReviewMode = "idle" | "review" | "done";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardsPage() {
  const { words, fetchWords } = useWordStore();
  const [deck, setDeck] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<ReviewMode>("idle");
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

  useEffect(() => {
    if (words.length === 0) fetchWords();
  }, [fetchWords, words.length]);

  useEffect(() => {
    initSpeechVoices();
  }, []);

  useEffect(() => {
    if (mode !== "review") return;
    const currentWord = deck[index];
    if (!currentWord) return;

    // Speak each new flashcard automatically.
    window.speechSynthesis.cancel();
    speakWord(currentWord, { rate: 0.9, pitch: 1 });
  }, [deck, index, mode]);

  useEffect(() => {
    if (mode !== "review") return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((v) => !v);
        return;
      }

      if (!flipped) return;

      if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "ArrowRight") {
        e.preventDefault();
        handleAnswer(true);
        return;
      }

      if (e.code === "Backspace" || e.code === "Delete" || e.code === "ArrowLeft") {
        e.preventDefault();
        handleAnswer(false);
        return;
      }

      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        const currentWord = deck[index];
        if (!currentWord) return;
        window.speechSynthesis.cancel();
        speakWord(currentWord, { rate: 0.9, pitch: 1 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deck, flipped, index, mode]);

  useEffect(() => {
    if (mode !== "review") return;
    if (score.correct > 0 && score.correct % 5 === 0) {
      toast.success(`Great momentum: ${score.correct} correct answers!`);
    }
  }, [mode, score.correct]);

  useEffect(() => {
    if (mode !== "done") return;
    const total = score.correct + score.wrong;
    if (total === 0) return;
    const pct = Math.round((score.correct / total) * 100);
    if (pct >= 85) {
      toast.success(`Excellent session! ${pct}% accuracy.`);
    } else if (pct >= 65) {
      toast.success(`Nice work. You finished at ${pct}%.`);
    } else {
      toast.success(`Session complete. Keep going, you are improving.`);
    }
  }, [mode, score.correct, score.wrong]);

  const startSession = () => {
    const only = words.filter((w) => w.translation);
    if (only.length === 0) return;
    setDeck(shuffle(only));
    setIndex(0);
    setFlipped(false);
    setScore({ correct: 0, wrong: 0 });
    setMode("review");
  };

  const handleAnswer = (correct: boolean) => {
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));

    const next = index + 1;
    if (!correct) {
      const wrongCard = deck[index];
      if (wrongCard) {
        setDeck((prev) => {
          const nextDeck = [...prev];
          // Reinforced study: ask wrong cards again after a few cards.
          const offset = 2 + Math.floor(Math.random() * 3); // 2-4 cards later
          const insertAt = Math.min(index + offset, nextDeck.length);
          nextDeck.splice(insertAt, 0, wrongCard);
          return nextDeck;
        });
      }
    }

    const deckLengthAfterAnswer = correct ? deck.length : deck.length + 1;
    if (next >= deckLengthAfterAnswer) {
      setMode("done");
    } else {
      setIndex(next);
      setFlipped(false);
    }
  };

  const current = deck[index];
  const wordWithArticle = current?.article ? `${current.article} ${current.word}` : current?.word;

  if (mode === "idle") {
    const eligible = words.filter((w) => w.translation).length;
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto">
          <CreditCard size={32} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Flashcard Review</h1>
          <p className="text-slate-400 text-sm mt-2">
            {eligible > 0
              ? `${eligible} words with translations ready for review`
              : "Add translations to your words first"}
          </p>
        </div>
        <button
          onClick={startSession}
          disabled={eligible === 0}
          className="btn-primary mx-auto px-8 py-3"
        >
          Start Session
        </button>
      </div>
    );
  }

  if (mode === "done") {
    const total = score.correct + score.wrong;
    const pct = Math.round((score.correct / total) * 100);
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-6">
        <div className="card space-y-4 bg-gradient-to-br from-white to-emerald-50">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Review Complete</p>
          <p className="text-5xl font-bold text-brand-600">{pct}%</p>
          <p className="text-slate-600 font-medium">Session complete!</p>
          <div className="flex justify-center gap-6 text-sm">
            <div className="text-emerald-600 font-semibold">{score.correct} correct</div>
            <div className="text-rose-500 font-semibold">{score.wrong} wrong</div>
          </div>
        </div>
        <button onClick={startSession} className="btn-secondary mx-auto gap-2">
          <RotateCcw size={15} /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Flashcards</h1>
        <div className="text-right">
          <span className="text-sm text-slate-400">
            {index + 1} / {deck.length}
          </span>
          <p className="text-xs font-semibold text-brand-600">{Math.round(((index + 1) / deck.length) * 100)}% done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-brand-500 to-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((index + 1) / deck.length) * 100}%` }}
        />
      </div>

      <p className="text-xs text-slate-400 text-center">
        Shortcuts: <span className="font-semibold">Space</span> flip, <span className="font-semibold">Enter</span> correct, <span className="font-semibold">Backspace</span> wrong, <span className="font-semibold">S</span> speak
      </p>

      {/* Card */}
      <div
        onClick={() => setFlipped((v) => !v)}
        className={`card min-h-52 cursor-pointer select-none hover:shadow-md transition-all duration-300 overflow-hidden ${
          flipped ? "scale-[1.01]" : "scale-100"
        }`}
      >
        {!flipped ? (
          <div className="min-h-52 flex flex-col items-center justify-center text-center space-y-3">
            <p className="text-3xl font-bold text-slate-800">{wordWithArticle}</p>
            {current.notes && <p className="text-xs text-slate-400 italic">{current.notes}</p>}
            <p className="text-xs text-slate-300 flex items-center gap-1">
              Tap to reveal <ChevronRight size={12} />
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[20%_60%_20%] min-h-52 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAnswer(false);
              }}
              className="h-full w-full inline-flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-rose-500 to-rose-600 text-white font-semibold transition-all hover:brightness-95 active:scale-[0.99]"
            >
              <X size={20} />
              <span className="text-sm">Wrong</span>
            </button>

            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 bg-white px-4">
              <p className="text-2xl font-semibold text-brand-700">{current.translation}</p>
              {current.article && <p className="text-sm font-medium text-slate-500">{wordWithArticle}</p>}
              {current.notes && <p className="text-xs text-slate-400 italic">{current.notes}</p>}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAnswer(true);
              }}
              className="h-full w-full inline-flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white font-semibold transition-all hover:brightness-95 active:scale-[0.99]"
            >
              <Check size={20} />
              <span className="text-sm">Correct</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
