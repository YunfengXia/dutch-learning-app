import type { Word } from "../types";

let cachedVoices: SpeechSynthesisVoice[] = [];
let preferredVoiceName: string | null = null;

function scoreVoice(v: SpeechSynthesisVoice) {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let score = 0;
  if (v.lang.toLowerCase().startsWith("nl")) score += 20;
  if (n.includes("google")) score += 8;
  if (n.includes("microsoft")) score += 7;
  if (n.includes("enhanced") || n.includes("premium") || n.includes("natural")) score += 4;
  if (v.default) score += 2;
  return score;
}

function refreshVoices() {
  cachedVoices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("nl"));
}

export function initSpeechVoices() {
  refreshVoices();
  if (cachedVoices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      refreshVoices();
    };
  }
}

export function getDutchVoices() {
  if (!cachedVoices.length) refreshVoices();
  return [...cachedVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

export function setPreferredVoice(name: string | null) {
  preferredVoiceName = name;
}

function getBestDutchVoice() {
  const voices = getDutchVoices();
  if (!voices.length) return null;
  if (preferredVoiceName) {
    const exact = voices.find((v) => v.name === preferredVoiceName);
    if (exact) return exact;
  }
  return voices[0];
}

export function buildSpeechText(word: Word) {
  const isNoun = word.partOfSpeech?.toLowerCase().includes("noun");
  return isNoun && word.article ? `${word.article} ${word.word}.` : `${word.word}.`;
}

export function speakDutch(text: string, options?: { rate?: number; pitch?: number; onend?: () => void; onerror?: () => void }) {
  const utter = new SpeechSynthesisUtterance(text);
  const voice = getBestDutchVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    utter.lang = "nl-NL";
  }
  utter.rate = options?.rate ?? 0.9;
  utter.pitch = options?.pitch ?? 1;
  utter.onend = options?.onend ?? null;
  utter.onerror = options?.onerror ?? null;
  window.speechSynthesis.speak(utter);
  return utter;
}

export function speakWord(word: Word, options?: { rate?: number; pitch?: number; onend?: () => void; onerror?: () => void }) {
  return speakDutch(buildSpeechText(word), options);
}
