import { useState, useEffect, useRef } from 'react';
import { useAppStore, type Task, type TaskStatus, type Priority } from '../store/useAppStore';
import { Plus, MoreHorizontal, Calendar, MessageSquare, Paperclip, AlertCircle, GripVertical, Search } from 'lucide-react';
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
  const { tasks, updateTaskStatus, addTask } = useAppStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', project: 'General', priority: 'Medium', status: 'backlog' as TaskStatus, dueDate: '' });
  
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
    setNewTask({ title: '', project: 'General', priority: 'Medium', status, dueDate: '' });
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
    
    addTask({
      id: `task-${Date.now()}`,
      title: newTask.title,
      project: newTask.project,
      priority: newTask.priority as Priority,
      status: newTask.status,
      dueDate: formattedDate,
      comments: 0,
      attachments: 0,
      assignee: 'M'
    });
    
    setIsModalOpen(false);
    setNewTask({ title: '', project: 'General', priority: 'Medium', status: 'backlog', dueDate: '' });
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                  <input type="text" value={newTask.project} onChange={e => setNewTask({...newTask, project: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 outline-none transition-all" placeholder="e.g., General" />
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

    </div>
  );
}

// --- DND Kit Column Component ---
function DroppableColumn({ column, tasks, onQuickAdd }: { column: { id: TaskStatus; title: string; color: string }, tasks: Task[], onQuickAdd: () => void }) {
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
          <DraggableTask key={task.id} task={task} />
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
function DraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: 'Task', task }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-30">
        <TaskCard task={task} isDragging />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl cursor-grab touch-manipulation">
      <TaskCard task={task} />
    </div>
  );
}

// --- Presentation Component for Task ---
function TaskCard({ 
  task,
  isDragging = false,
  isOverlay = false
}: { 
  task: Task;
  isDragging?: boolean;
  isOverlay?: boolean;
}) {
  const priorityColors = {
    Low: 'bg-slate-100 text-slate-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Urgent: 'bg-red-100 text-red-700',
  };

  return (
    <div 
      className={cn(
        "bg-white p-4 rounded-xl border transition-all group",
        isOverlay ? "shadow-xl border-primary-400 scale-105 rotate-2 cursor-grabbing" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300",
        isDragging && !isOverlay ? "opacity-50" : ""
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 md:block hidden" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            {task.project}
          </span>
        </div>
        <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1', priorityColors[task.priority])}>
          {task.priority === 'Urgent' && <AlertCircle size={10} />}
          {task.priority}
        </span>
      </div>
      
      <h4 className="font-semibold text-slate-800 mb-4 leading-tight group-hover:text-primary-600 transition-colors">
        {task.title}
      </h4>
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
          {task.dueDate && task.dueDate !== 'No date' && (
            <div className={cn(
              "flex items-center gap-1", 
              (task.dueDate.includes('Today') || task.dueDate.includes('Urgent')) ? "text-red-500" : ""
            )}>
              <Calendar size={13} />
              {task.dueDate}
            </div>
          )}
          
          {(task.comments > 0 || task.attachments > 0) && (
            <div className="flex items-center gap-2">
              {task.comments > 0 && (
                <div className="flex items-center gap-1 hover:text-slate-600">
                  <MessageSquare size={13} />
                  {task.comments}
                </div>
              )}
              {task.attachments > 0 && (
                <div className="flex items-center gap-1 hover:text-slate-600">
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
  );
}
