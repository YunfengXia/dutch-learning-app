export function tokenizeDutch(text) {
  return text
    .replace(/[^a-zA-ZàáâäãåæçèéêëìíîïñòóôöõøùúûüýÿÀ-ÿ\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[-']+|[-']+$/g, "").toLowerCase())
    .filter((w) => w.length > 2);
}

export function extractUniqueDutchWords(text) {
  return [...new Set(tokenizeDutch(text))];
}

export function extractDutchWordFrequency(text) {
  const counts = new Map();
  for (const token of tokenizeDutch(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([word, usageCount]) => ({ word, usageCount }))
    .sort((a, b) => b.usageCount - a.usageCount || a.word.localeCompare(b.word));
}
