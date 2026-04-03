import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import AddWordsPage from "./pages/AddWordsPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import WordListPage from "./pages/WordListPage";
import ImportPage from "./pages/ImportPage";
import ListeningPage from "./pages/ListeningPage";

export type Page = "dashboard" | "add" | "wordlist" | "flashcards" | "import" | "listening";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        {page === "dashboard" && <DashboardPage />}
        {page === "add" && <AddWordsPage />}
        {page === "wordlist" && <WordListPage />}
        {page === "flashcards" && <FlashcardsPage />}
        {page === "import" && <ImportPage />}
        {page === "listening" && <ListeningPage />}
      </main>
    </div>
  );
}
