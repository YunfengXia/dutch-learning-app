import { BookOpen, LayoutDashboard, Plus, CreditCard, ListOrdered, FileUp, Headphones } from "lucide-react";
import type { Page } from "../../App";

interface Props {
  current: Page;
  onNavigate: (p: Page) => void;
}

const nav: { label: string; page: Page; icon: React.ReactNode }[] = [
  { label: "Dashboard",   page: "dashboard",  icon: <LayoutDashboard size={18} /> },
  { label: "Add Words",   page: "add",        icon: <Plus size={18} /> },
  { label: "Import",      page: "import",     icon: <FileUp size={18} /> },
  { label: "Word List",   page: "wordlist",   icon: <ListOrdered size={18} /> },
  { label: "Flashcards",  page: "flashcards", icon: <CreditCard size={18} /> },
  { label: "Listening",   page: "listening",  icon: <Headphones size={18} /> },
];

export default function Sidebar({ current, onNavigate }: Props) {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-100 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <BookOpen size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800 leading-tight">Vlaams Leren</p>
          <p className="text-xs text-slate-400">Dutch / Flemish</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ label, page, icon }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              current === page
                ? "bg-brand-50 text-brand-700"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* Footer hint */}
      <div className="px-6 py-4 text-xs text-slate-400 border-t border-slate-100">
        Leer Nederlands elke dag 🇧🇪
      </div>
    </aside>
  );
}
