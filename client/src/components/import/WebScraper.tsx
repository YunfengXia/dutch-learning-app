import { useState } from "react";
import { Globe, Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { scrapeApi } from "../../api";
import { useWordStore } from "../../store/wordStore";

export default function WebScraper() {
  const addWords = useWordStore((s) => s.addWords);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ scrapedCount: number; dutchCount: number; addedCount: number } | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await scrapeApi.scrape(url.trim());
      addWords(data.words);
      setResult({ scrapedCount: data.scrapedCount, dutchCount: data.dutchCount, addedCount: data.addedCount });
      toast.success(`Added ${data.addedCount} new words from the page`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to scrape URL";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Globe size={18} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Website Word Mapper</h2>
          <p className="text-xs text-slate-400">
            Paste a Dutch website URL — words are extracted automatically
          </p>
        </div>
      </div>
      <form onSubmit={handleScrape} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Page URL *</label>
          <input
            className="input"
            type="url"
            placeholder="https://www.vrt.be/vrtnws/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <button className="btn-primary w-full justify-center" type="submit" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
          {loading ? "Scraping…" : "Scrape Website"}
        </button>
      </form>

      {result && (
        <div className="mt-4 flex items-start gap-3 bg-emerald-50 rounded-xl p-4">
          <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-sm text-emerald-800">
            <p className="font-medium">Success!</p>
            <p>
              Found <strong>{result.scrapedCount}</strong> tokens,{" "}
              <strong>{result.dutchCount}</strong> confirmed Dutch,{" "}
              <strong>{result.addedCount}</strong> new words added to your vocabulary.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
