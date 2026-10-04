import { useState, useEffect, useRef } from 'react';
import { useAppStore, type Task, type TaskStatus, type Priority } from '../store/useAppStore';
import { Plus, MoreHorizontal, Calendar, MessageSquare, Paperclip, AlertCircle, Search, X, Trash2, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// DND Kit
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  TouchSensor,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: '💡 Backlog', color: 'border-slate-200 bg-slate-50' },
  { id: 'planned', title: '📌 Planned', color: 'border-blue-200 bg-blue-50' },
  { id: 'in_progress', title: '🔵 In Progress', color: 'border-indigo-200 bg-indigo-50' },
  { id: 'review', title: '🟡 Review', color: 'border-amber-200 bg-amber-50' },
  { id: 'completed', title: '🟢 Completed', color: 'border-emerald-200 bg-emerald-50' },
];

export default function KanbanBoard() {
  const { tasks, updateTaskStatus, addTask, projects } = useAppStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    projectId: '', // use empty string initially to prompt selection
    priority: 'Medium', 
    status: 'backlog' as TaskStatus, 
    dueDate: '' 
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // A11y Focus trap and Esc key for Modal
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleQuickAdd = (status: TaskStatus = 'backlog') => {
    setNewTask({ title: '', projectId: projects.length > 0 ? projects[0].id : '', priority: 'Medium', status, dueDate: '' });
    setIsModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || newTask.title.trim() === '') return;
    
    let formattedDate = 'No date';
    if (newTask.dueDate) {
      const d = new Date(newTask.dueDate);
      formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    const selectedProject = projects.find(p => p.id === newTask.projectId);
    const projectName = selectedProject ? selectedProject.name : 'General';
    
    addTask({
      id: `task-${Date.now()}`,
      title: newTask.title,
      project: projectName, // Save the actual project name
      priority: newTask.priority as Priority,
      status: newTask.status,
      dueDate: formattedDate,
      comments: 0,
      attachments: 0,
      assignee: 'M'
    });
    
    setIsModalOpen(false);
    setNewTask({ title: '', projectId: '', priority: 'Medium', status: 'backlog', dueDate: '' });
  };
  
  // --- DND Kit Setup ---
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px distance before dragging starts (prevents accidental drags when clicking)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Require hold for 250ms on mobile
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const activeTaskId = active.id as string;
    const overColumnId = over.id as TaskStatus;

    const task = tasks.find(t => t.id === activeTaskId);
    if (task && task.status !== overColumnId) {
      updateTaskStatus(activeTaskId, overColumnId);
    }
  };

  // Filter tasks based on search
  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden bg-slate-50/50">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 flex-shrink-0 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Project Tasks</h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Manage your team's workflow and track progress.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center w-full md:w-auto">
          
          <div className="flex items-center bg-white rounded-xl px-4 py-2 w-full md:w-64 border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20 shadow-sm transition-shadow">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder-slate-400"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={() => handleQuickAdd('backlog')}
              className="flex-1 md:flex-none bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <Plus size={18} />
              New Task
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Columns */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 flex-1 items-start min-h-0 custom-scrollbar snap-x md:snap-none">
          {COLUMNS.map((column) => {
            const columnTasks = filteredTasks.filter(t => t.status === column.id);
            return (
              <DroppableColumn 
                key={column.id} 
                column={column} 
                tasks={columnTasks} 
                onQuickAdd={() => handleQuickAdd(column.id)}
                onOpenDetail={setDetailTask}
              />
            );
          })}
        </div>

        {/* Drag Overlay for visual feedback during drag */}
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            ref={modalRef}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Create New Task</h3>
            </div>
            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                <input 
                  autoFocus
                  type="text" 
                  required 
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 outline-none transition-all" 
                  placeholder="e.g., Design homepage mockup" 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                  <select 
                    required
                    value={newTask.projectId} 
                    onChange={e => setNewTask({...newTask, projectId: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 outline-none bg-white transition-all"
                  >
                    <option value="" disabled>Select a project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    {projects.length === 0 && <option value="general">General (No Projects)</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 outline-none bg-white transition-all">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={newTask.status} onChange={e => setNewTask({...newTask, status: e.target.value as TaskStatus})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 outline-none bg-white transition-all">
                    {COLUMNS.map(col => (
                      <option key={col.id} value={col.id}>{col.title.replace(/[^a-zA-Z ]/g, '').trim()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 outline-none transition-all" />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-primary-500/30 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Side Panel */}
      {detailTask && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setDetailTask(null)}>
          <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Detail Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{detailTask.project}</span>
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-md ${ detailTask.priority === 'Urgent' ? 'bg-red-100 text-red-700' : detailTask.priority === 'High' ? 'bg-orange-100 text-orange-700' : detailTask.priority === 'Medium' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{detailTask.priority}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{detailTask.title}</h3>
              </div>
              <button onClick={() => setDetailTask(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {(['backlog', 'planned', 'in_progress', 'review', 'completed'] as TaskStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => { updateTaskStatus(detailTask.id, s); setDetailTask({...detailTask, status: s}); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        detailTask.status === s
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {s === 'backlog' ? '💡 Backlog' : s === 'planned' ? '📌 Planned' : s === 'in_progress' ? '🔵 In Progress' : s === 'review' ? '🟡 Review' : '🟢 Done'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              {detailTask.dueDate && detailTask.dueDate !== 'No date' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Due Date</label>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Calendar size={15} className="text-slate-400" />
                    {detailTask.dueDate}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Assignee</label>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {detailTask.assignee}
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{detailTask.assignee}</span>
                </div>
              </div>
            </div>

            {/* Detail Actions */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => { updateTaskStatus(detailTask.id, detailTask.status === 'completed' ? 'in_progress' : 'completed'); setDetailTask({...detailTask, status: detailTask.status === 'completed' ? 'in_progress' : 'completed'}); }}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  detailTask.status === 'completed'
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                }`}
              >
                <CheckCircle2 size={16} />
                {detailTask.status === 'completed' ? 'Buka Kembali' : 'Tandai Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- DND Kit Column Component ---
function DroppableColumn({ column, tasks, onQuickAdd, onOpenDetail }: { 
  column: { id: TaskStatus; title: string; color: string }, 
  tasks: Task[], 
  onQuickAdd: () => void,
  onOpenDetail: (t: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'Column', column }
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-80 md:w-80 w-[85vw] snap-center bg-slate-100/50 rounded-2xl flex flex-col max-h-full border transition-colors",
        isOver ? "border-primary-400 bg-primary-50/30 shadow-sm" : "border-slate-200/60"
      )}
    >
      {/* Column Header */}
      <div className={cn("p-4 border-b rounded-t-2xl flex justify-between items-center sticky top-0 bg-white/50 backdrop-blur-sm z-10", column.color)}>
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          {column.title}
          <span className="bg-white/80 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">
            {tasks.length}
          </span>
        </h3>
        <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-white/50 transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Column Body / Tasks List */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar min-h-[150px]">
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} onOpenDetail={onOpenDetail} />
        ))}
        
        {tasks.length === 0 && !isOver && (
          <div className="h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-sm">
            Belum ada tugas
          </div>
        )}
      </div>
      
      {/* Quick Add Button */}
      <div className="p-3 border-t border-slate-200/50 bg-slate-50/50 rounded-b-2xl mt-auto">
        <button 
          onClick={onQuickAdd}
          className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm font-medium hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>
    </div>
  );
}

// --- DND Kit Task Component ---
function DraggableTask({ task, onOpenDetail }: { task: Task; onOpenDetail: (t: Task) => void }) {
  const { setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: 'Task', task }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-30">
        <TaskCard task={task} isDragging onOpenDetail={onOpenDetail} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl touch-manipulation">
      <TaskCard task={task} onOpenDetail={onOpenDetail} />
    </div>
  );
}

// --- Presentation Component for Task ---
function TaskCard({ 
  task,
  isDragging = false,
  isOverlay = false,
  onOpenDetail
}: { 
  task: Task;
  isDragging?: boolean;
  isOverlay?: boolean;
  onOpenDetail?: (t: Task) => void;
}) {
  const { updateTaskStatus, deleteTask } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isCompleted = task.status === 'completed';

  const handleCheckbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTaskStatus(task.id, isCompleted ? 'in_progress' : 'completed');
  };

  const handleMenuAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (action === 'delete') {
      setConfirmDelete(true);
    } else if (action === 'detail' && onOpenDetail) {
      onOpenDetail(task);
    } else if (action === 'backlog' || action === 'planned' || action === 'in_progress' || action === 'review' || action === 'completed') {
      updateTaskStatus(task.id, action as TaskStatus);
    }
  };

  const priorityColors: Record<string, string> = {
    Low: 'bg-slate-100 text-slate-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Urgent: 'bg-red-100 text-red-700',
  };

  return (
    <>
      <div 
        className={cn(
          "bg-white p-4 rounded-xl border transition-all group relative",
          isOverlay ? "shadow-xl border-primary-400 scale-105 rotate-2 cursor-grabbing" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300",
          isDragging && !isOverlay ? "opacity-50" : "",
          isCompleted ? "bg-slate-50/70" : ""
        )}
        onClick={() => !isOverlay && onOpenDetail && onOpenDetail(task)}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {/* Checkbox */}
            <button
              onClick={handleCheckbox}
              title={isCompleted ? "Tandai belum selesai" : "Tandai selesai"}
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer hover:scale-110",
                isCompleted 
                  ? "bg-emerald-500 border-emerald-500 text-white" 
                  : "border-slate-300 hover:border-emerald-400"
              )}
            >
              {isCompleted && (
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {task.project}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1', priorityColors[task.priority])}>
              {task.priority === 'Urgent' && <AlertCircle size={10} />}
              {task.priority}
            </span>
            {/* Context Menu Button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
              >
                <MoreHorizontal size={15} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button onClick={(e) => handleMenuAction(e, 'detail')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-slate-400"><path d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.5a.75.75 0 01-1.5 0V6a.75.75 0 011.5 0v3z" fill="currentColor"/></svg>
                    Lihat Detail
                  </button>
                  <hr className="my-1 border-slate-100" />
                  <p className="px-4 py-1 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pindah ke</p>
                  {(['backlog', 'planned', 'in_progress', 'review', 'completed'] as TaskStatus[]).filter(s => s !== task.status).map(s => (
                    <button key={s} onClick={(e) => handleMenuAction(e, s)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      {s === 'backlog' ? '💡 Backlog' : s === 'planned' ? '📌 Planned' : s === 'in_progress' ? '🔵 In Progress' : s === 'review' ? '🟡 Review' : '🟢 Completed'}
                    </button>
                  ))}
                  <hr className="my-1 border-slate-100" />
                  <button onClick={(e) => handleMenuAction(e, 'delete')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">
                    <Trash2 size={14} />
                    Hapus Tugas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <h4 className={cn(
          "font-semibold text-slate-800 mb-4 leading-tight transition-colors cursor-pointer",
          isCompleted ? "line-through text-slate-400" : "group-hover:text-primary-600"
        )}>
          {task.title}
        </h4>
        
        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
            {task.dueDate && task.dueDate !== 'No date' && (
              <div className={cn(
                "flex items-center gap-1", 
                task.dueDate.includes('Today') || task.dueDate.includes('Urgent') ? "text-red-500" : ""
              )}>
                <Calendar size={13} />
                {task.dueDate}
              </div>
            )}
            {(task.comments > 0 || task.attachments > 0) && (
              <div className="flex items-center gap-2">
                {task.comments > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageSquare size={13} />
                    {task.comments}
                  </div>
                )}
                {task.attachments > 0 && (
                  <div className="flex items-center gap-1">
                    <Paperclip size={13} />
                    {task.attachments}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="h-6 w-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full text-white flex items-center justify-center font-bold text-[10px] shadow-sm ring-2 ring-white">
            {task.assignee}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Hapus Tugas?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Tugas <strong>"{task.title}"</strong> akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">Batal</button>
              <button onClick={() => { deleteTask(task.id); setConfirmDelete(false); }} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors shadow-sm">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
