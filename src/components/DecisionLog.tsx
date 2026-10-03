import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Search, Gavel, Calendar, Filter, AlertCircle, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DecisionLog({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { meetings } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('All');

  // Extract all decisions from all meetings
  const allDecisions = useMemo(() => {
    const decs: Array<{ id: string; text: string; meetingId: string; meetingTitle: string; date: string; projectId?: string; status: string }> = [];
    meetings.forEach(m => {
      if (m.decisions && m.decisions.length > 0) {
        m.decisions.forEach((d, index) => {
          decs.push({
            id: `${m.id}-${index}`,
            text: d,
            meetingId: m.id,
            meetingTitle: m.title,
            date: m.date,
            projectId: m.projectId,
            status: m.approvalStatus || 'Draft',
          });
        });
      }
    });
    return decs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [meetings]);

  const filteredDecisions = allDecisions.filter(d => {
    const matchesSearch = d.text.toLowerCase().includes(search.toLowerCase()) || d.meetingTitle.toLowerCase().includes(search.toLowerCase());
    const matchesProject = filterProject === 'All' || d.projectId === filterProject;
    return matchesSearch && matchesProject;
  });

  const projectsWithDecisions = Array.from(new Set(allDecisions.map(d => d.projectId).filter(Boolean)));
  const { projects } = useAppStore();
  
  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Gavel className="text-indigo-600" /> Decision Log
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Catatan pusat untuk semua keputusan dari setiap rapat.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <div className="flex-1 flex items-center gap-2 px-3 border-r border-slate-100">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Cari keputusan atau nama rapat..."
              className="w-full bg-transparent border-none outline-none text-sm py-2 text-slate-700"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-3">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer py-2"
            >
              <option value="All">Semua Proyek</option>
              {projectsWithDecisions.map(pid => {
                const p = projects.find(x => x.id === pid);
                return p ? <option key={pid} value={pid}>{p.name}</option> : null;
              })}
            </select>
          </div>
        </div>

        {/* Results */}
        {filteredDecisions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Tidak Ada Keputusan</h3>
            <p className="text-slate-500 text-sm mt-1">Belum ada keputusan yang tercatat atau tidak ada hasil yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2">Keputusan</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Sumber Rapat</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDecisions.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">{d.text}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => onNavigate('meetings')}
                          className="text-left text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 w-fit"
                        >
                          {d.meetingTitle} <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(d.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full uppercase', 
                        d.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        d.status === 'Review' ? 'bg-blue-100 text-blue-700' :
                        d.status === 'Revision Required' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
