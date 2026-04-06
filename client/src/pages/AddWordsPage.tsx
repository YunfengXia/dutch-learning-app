import ManualEntryForm from "../components/import/ManualEntryForm";
import WebScraper from "../components/import/WebScraper";
import DocumentImport from "./ImportPage";

export default function AddWordsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Add Words</h1>
        <p className="text-slate-400 text-sm mt-1">
          Add one word manually or import many from website/documents. The app auto-fetches English explanation, part of speech, and de/het for nouns.
        </p>
      </div>

      <ManualEntryForm />
      <WebScraper />
      <DocumentImport />
    </div>
  );
}
