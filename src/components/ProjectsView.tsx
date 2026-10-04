import { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreHorizontal, FolderKanban, Users, Clock, X, CheckCircle2, Trash2, ChevronRight, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAppStore, type Project } from '../store/useAppStore';

export default function ProjectsView() {
  const { projects, tasks, addProject, deleteProject, searchFocus, setSearchFocus } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', status: 'Planning', dueDate: '', description: '' });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle global search focus
  useEffect(() => {
    if (searchFocus?.type === 'project') {
      const project = projects.find(p => p.id === searchFocus.id);
      if (project) {
        setTimeout(() => {
          setDetailProject(project);
          setSearchFocus(null);
        }, 0);
      }
    }
  }, [searchFocus, projects, setSearchFocus]);

  // Close menu on click outside
  useEffect(() => {
    const closeMenu = () => setActiveMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const handleNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || newProject.name.trim() === '') return;
    
    let formattedDate = 'TBD';
    if (newProject.dueDate) {
      const d = new Date(newProject.dueDate);
      formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    addProject({
      id: `proj-${Date.now()}`,
      name: newProject.name,
      description: newProject.description,
      status: newProject.status,
      progress: 0,
      members: 1,
      dueDate: formattedDate,
      color: randomColor
    });
    
    setIsModalOpen(false);
    setNewProject({ name: '', status: 'Planning', dueDate: '', description: '' });
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    setConfirmDeleteId(null);
    if (detailProject?.id === projectId) setDetailProject(null);
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColor = (status: string) => {
    if (status === 'Active') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (status === 'Planning') return 'bg-blue-50 text-blue-600 border-blue-200';
    if (status === 'Completed') return 'bg-purple-50 text-purple-600 border-purple-200';
    return 'bg-rose-50 text-rose-600 border-rose-200';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Proyek</h2>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Kelola dan lacak inisiatif organisasi Anda.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl md:rounded-full font-medium flex items-center justify-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <Plus size={18} />
            Proyek Baru
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center bg-white rounded-xl px-4 py-2.5 w-80 border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-primary-500/20">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari proyek..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
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
        {filteredProjects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <FolderKanban size={32} className="text-primary-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{searchTerm ? 'Tidak Ditemukan' : 'Belum Ada Proyek'}</h3>
            <p className="text-slate-500 max-w-sm mb-6">{searchTerm ? `Tidak ada proyek dengan kata kunci "${searchTerm}".` : 'Mulai rencanakan dan lacak inisiatif tim Anda.'}</p>
            {!searchTerm && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-primary-50 text-primary-600 hover:bg-primary-100 font-medium px-6 py-2.5 rounded-xl transition-colors"
              >
                Buat Proyek
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => {
              const projectTasks = tasks.filter(t => t.project === project.name);
              const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
              const computedProgress = projectTasks.length > 0 
                ? Math.round((completedTasks / projectTasks.length) * 100) 
                : project.progress;

              return (
                <div 
                  key={project.id} 
                  onClick={() => setDetailProject(project)}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all group cursor-pointer flex flex-col relative"
                >
                  <div className="flex justify-between items-start mb-4 relative">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-sm", project.color)}>
                      <FolderKanban size={24} />
                    </div>
                    
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === project.id ? null : project.id);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {activeMenuId === project.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-10">
                          <button 
                            onClick={() => { setDetailProject(project); setActiveMenuId(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                          >
                            <ChevronRight size={14} className="text-slate-400" />
                            Lihat Detail
                          </button>
                          <button 
                            onClick={() => { setConfirmDeleteId(project.id); setActiveMenuId(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            Hapus Proyek
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border", statusColor(project.status))}>
                      {project.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight group-hover:text-primary-600 transition-colors">{project.name}</h3>
                  {project.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{project.description}</p>}
                  
                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Users size={16} />
                      {project.members}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={16} />
                      {project.dueDate}
                    </div>
                    {projectTasks.length > 0 && (
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 size={16} />
                        {completedTasks}/{projectTasks.length} tugas
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span>Progres</span>
                      <span className="text-slate-700">{computedProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", project.color)}
                        style={{ width: `${computedProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Project Detail Side Panel */}
      {detailProject && (() => {
        const projectTasks = tasks.filter(t => t.project === detailProject.name);
        const completedCount = projectTasks.filter(t => t.status === 'completed').length;
        const progress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : detailProject.progress;

        const priorityColors: Record<string, string> = {
          Low: 'bg-slate-100 text-slate-600',
          Medium: 'bg-blue-100 text-blue-700',
          High: 'bg-orange-100 text-orange-700',
          Urgent: 'bg-red-100 text-red-700',
        };

        return (
          <div className="fixed inset-0 z-50 flex" onClick={() => setDetailProject(null)}>
            <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" />
            <div
              className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={cn("p-6 text-white", detailProject.color)}>
                <div className="flex justify-between items-start">
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <FolderKanban size={24} />
                  </div>
                  <button onClick={() => setDetailProject(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <h2 className="text-2xl font-bold">{detailProject.name}</h2>
                {detailProject.description && <p className="text-white/80 text-sm mt-1">{detailProject.description}</p>}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                {[
                  { label: 'Status', value: detailProject.status },
                  { label: 'Anggota', value: `${detailProject.members} orang` },
                  { label: 'Tenggat', value: detailProject.dueDate },
                ].map(({ label, value }) => (
                  <div key={label} className="p-4 text-center">
                    <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
                    <div className="text-sm font-bold text-slate-800">{value}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                  <span>Progress Keseluruhan</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs", detailProject.color, "text-white")}>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", detailProject.color)} style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-slate-500 mt-1">{completedCount} dari {projectTasks.length} tugas selesai</div>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary-500" />
                  Tugas dalam Proyek ({projectTasks.length})
                </h3>
                {projectTasks.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <FolderKanban size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">Belum ada tugas untuk proyek ini.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                          task.status === 'completed' ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                        )}>
                          {task.status === 'completed' && (
                            <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium truncate", task.status === 'completed' ? "line-through text-slate-400" : "text-slate-800")}>
                            {task.title}
                          </p>
                          <p className="text-xs text-slate-500">{task.dueDate !== 'No date' ? task.dueDate : ''}</p>
                        </div>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", priorityColors[task.priority])}>
                          {task.priority}
                        </span>
                        {task.priority === 'Urgent' && <AlertCircle size={14} className="text-red-500 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => { setConfirmDeleteId(detailProject.id); setDetailProject(null); }}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl text-sm transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Hapus Proyek?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">Proyek akan dihapus permanen. Tugas dalam proyek ini tidak akan ikut terhapus.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">Batal</button>
              <button onClick={() => handleDeleteProject(confirmDeleteId)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors shadow-sm">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Buat Proyek Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleNewProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Proyek <span className="text-red-500">*</span></label>
                <input type="text" required value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g., Seminar Nasional 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none" rows={2} placeholder="Deskripsi singkat proyek..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tenggat</label>
                  <input type="date" value={newProject.dueDate} onChange={e => setNewProject({...newProject, dueDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-primary-500/30">Buat Proyek</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


