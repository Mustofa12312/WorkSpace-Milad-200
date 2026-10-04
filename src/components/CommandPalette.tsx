import { useState, useEffect, useRef } from 'react';
import { Search, Plus, FolderKanban, CalendarDays, FileText, Users, ArrowRight, CheckSquare } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

interface ResultItem {
  id: string;
  type: 'task' | 'project' | 'meeting' | 'member' | 'action';
  title: string;
  subtitle?: string;
  tab?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export default function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tasks, projects, meetings, team, setSearchFocus } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setQuery('');
        setActiveIndex(0);
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  const q = query.toLowerCase().trim();

  const results: ResultItem[] = [];

  // Quick actions (always shown when no query)
  if (!q) {
    results.push(
      { id: 'new-task', type: 'action', title: 'Buat Task Baru', subtitle: 'Tambahkan ke Kanban Board', tab: 'tasks', icon: <Plus size={15} className="text-primary-500" />, onSelect: () => { onNavigate('tasks'); onClose(); } },
      { id: 'new-meeting', type: 'action', title: 'Buat Rapat Baru', subtitle: 'Jadwalkan rapat baru', tab: 'meetings', icon: <Plus size={15} className="text-indigo-500" />, onSelect: () => { onNavigate('meetings'); onClose(); } },
      { id: 'new-project', type: 'action', title: 'Buat Proyek Baru', subtitle: 'Mulai proyek baru', tab: 'projects', icon: <Plus size={15} className="text-emerald-500" />, onSelect: () => { onNavigate('projects'); onClose(); } },
      { id: 'go-kanban', type: 'action', title: 'Papan Kanban', subtitle: 'Lihat semua task', tab: 'tasks', icon: <CheckSquare size={15} className="text-slate-500" />, onSelect: () => { onNavigate('tasks'); onClose(); } },
      { id: 'go-calendar', type: 'action', title: 'Kalender', subtitle: 'Lihat jadwal', tab: 'calendar', icon: <CalendarDays size={15} className="text-slate-500" />, onSelect: () => { onNavigate('calendar'); onClose(); } },
      { id: 'go-docs', type: 'action', title: 'Dokumen', subtitle: 'Kelola dokumen', tab: 'documents', icon: <FileText size={15} className="text-slate-500" />, onSelect: () => { onNavigate('documents'); onClose(); } },
      { id: 'go-team', type: 'action', title: 'Tim', subtitle: 'Kelola anggota tim', tab: 'team', icon: <Users size={15} className="text-slate-500" />, onSelect: () => { onNavigate('team'); onClose(); } },
    );
  }

  // Search results
  if (q) {
    tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 4).forEach(t => {
      results.push({
        id: t.id, type: 'task', title: t.title, subtitle: `Task · ${t.project} · ${t.status}`,
        icon: <CheckSquare size={15} className="text-primary-500" />,
        onSelect: () => { setSearchFocus({ type: 'task', id: t.id }); onNavigate('tasks'); onClose(); }
      });
    });
    projects.filter(p => p.name.toLowerCase().includes(q)).slice(0, 3).forEach(p => {
      results.push({
        id: p.id, type: 'project', title: p.name, subtitle: `Proyek · ${p.status}`,
        icon: <FolderKanban size={15} className="text-emerald-500" />,
        onSelect: () => { setSearchFocus({ type: 'project', id: p.id }); onNavigate('projects'); onClose(); }
      });
    });
    meetings.filter(m => m.title.toLowerCase().includes(q)).slice(0, 3).forEach(m => {
      results.push({
        id: m.id, type: 'meeting', title: m.title, subtitle: `Rapat · ${m.date} · ${m.status}`,
        icon: <CalendarDays size={15} className="text-indigo-500" />,
        onSelect: () => { setSearchFocus({ type: 'meeting', id: m.id }); onNavigate('meetings'); onClose(); }
      });
    });
    team.filter(u => u.name.toLowerCase().includes(q)).slice(0, 3).forEach(u => {
      results.push({
        id: u.id, type: 'member', title: u.name, subtitle: `Anggota · ${u.role || 'Member'}`,
        icon: <Users size={15} className="text-amber-500" />,
        onSelect: () => { setSearchFocus({ type: 'member', id: u.id }); onNavigate('team'); onClose(); }
      });
    });
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIndex]) { results[activeIndex].onSelect(); }
    if (e.key === 'Escape') { onClose(); }
  };

  if (!isOpen) return null;

  const typeLabel: Record<string, string> = {
    task: 'Task', project: 'Proyek', meeting: 'Rapat', member: 'Anggota', action: ''
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari task, proyek, rapat... atau ketik perintah"
            className="flex-1 bg-transparent outline-none text-slate-800 placeholder-slate-400 text-sm"
          />
          <kbd className="hidden md:flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-200 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && q && (
            <div className="py-10 text-center text-slate-400 text-sm">
              <Search size={24} className="mx-auto mb-2 text-slate-200" />
              Tidak ada hasil untuk "{query}"
            </div>
          )}

          {!q && (
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Aksi Cepat</p>
          )}
          {q && results.length > 0 && (
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Hasil Pencarian</p>
          )}

          {results.map((item, index) => (
            <button
              key={item.id}
              onClick={item.onSelect}
              onMouseEnter={() => setActiveIndex(index)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${index === activeIndex ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                {item.subtitle && <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>}
              </div>
              {typeLabel[item.type] && (
                <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                  {typeLabel[item.type]}
                </span>
              )}
              <ArrowRight size={14} className={`flex-shrink-0 transition-opacity ${index === activeIndex ? 'opacity-60 text-primary-500' : 'opacity-0'}`} />
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-slate-100 px-5 py-2.5 flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><kbd className="border border-slate-200 rounded px-1 font-mono">↑↓</kbd> Navigasi</span>
          <span className="flex items-center gap-1"><kbd className="border border-slate-200 rounded px-1 font-mono">↵</kbd> Pilih</span>
          <span className="flex items-center gap-1"><kbd className="border border-slate-200 rounded px-1 font-mono">Esc</kbd> Tutup</span>
        </div>
      </div>
    </div>
  );
}
