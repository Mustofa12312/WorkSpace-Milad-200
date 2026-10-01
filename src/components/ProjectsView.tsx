import { Search, Plus, Filter, MoreHorizontal, FolderKanban, Users, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MOCK_PROJECTS = [
  { id: '1', name: 'Milad 200 Main Event', status: 'Active', progress: 65, members: 12, dueDate: 'Oct 30, 2026', color: 'bg-indigo-500' },
  { id: '2', name: 'Sponsorship & Finance', status: 'Active', progress: 40, members: 5, dueDate: 'Sep 15, 2026', color: 'bg-emerald-500' },
  { id: '3', name: 'Marketing & PR', status: 'Planning', progress: 15, members: 8, dueDate: 'Dec 1, 2026', color: 'bg-amber-500' },
  { id: '4', name: 'Venue & Logistics', status: 'On Hold', progress: 10, members: 4, dueDate: 'Oct 15, 2026', color: 'bg-rose-500' },
];

export default function ProjectsView() {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Projects</h2>
            <p className="text-slate-500 mt-1">Manage and track your organization's initiatives.</p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5">
            <Plus size={18} />
            New Project
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center bg-white rounded-xl px-4 py-2.5 w-80 border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-primary-500/20">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder-slate-400"
            />
          </div>
          <div className="flex gap-3">
            <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_PROJECTS.map(project => (
            <div key={project.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group cursor-pointer flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-sm", project.color)}>
                  <FolderKanban size={24} />
                </div>
                <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              
              <div className="mb-1 flex items-center gap-2">
                <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border", 
                  project.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                  project.status === 'Planning' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                  'bg-rose-50 text-rose-600 border-rose-200'
                )}>
                  {project.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight group-hover:text-primary-600 transition-colors">{project.name}</h3>
              
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <Users size={16} />
                  {project.members}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} />
                  {project.dueDate}
                </div>
              </div>

              <div className="mt-auto pt-6">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Progress</span>
                  <span className="text-slate-700">{project.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", project.color)}
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
