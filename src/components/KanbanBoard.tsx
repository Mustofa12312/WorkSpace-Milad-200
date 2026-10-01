import { useState } from 'react';
import { useAppStore, type Task, type TaskStatus } from '../store/useAppStore';
import { Plus, MoreHorizontal, Calendar, MessageSquare, Paperclip, AlertCircle, GripVertical } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  
  const handleQuickAdd = (status: TaskStatus = 'backlog') => {
    const title = window.prompt("Enter new task title:");
    if (!title || title.trim() === '') return;
    
    addTask({
      id: `task-${Date.now()}`,
      title,
      project: 'General',
      priority: 'Medium',
      status,
      dueDate: 'No date',
      comments: 0,
      attachments: 0,
      assignee: 'M'
    });
  };
  
  // Basic drag state for native HTML5 drag and drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to be generated before styling changes
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    setDraggedTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, statusId: TaskStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    
    updateTaskStatus(draggedTaskId, statusId);
  };

  return (
    <div className="h-full flex flex-col p-8 overflow-hidden">
      <div className="flex justify-between items-center mb-8 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Project Tasks</h2>
          <p className="text-slate-500 mt-1">Manage your team's workflow and track progress.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex -space-x-2 mr-4">
            <div className="h-10 w-10 bg-indigo-500 rounded-full border-2 border-white text-white flex items-center justify-center text-sm font-bold z-30">M</div>
            <div className="h-10 w-10 bg-emerald-500 rounded-full border-2 border-white text-white flex items-center justify-center text-sm font-bold z-20">A</div>
            <div className="h-10 w-10 bg-amber-500 rounded-full border-2 border-white text-white flex items-center justify-center text-sm font-bold z-10">H</div>
            <div className="h-10 w-10 bg-slate-200 rounded-full border-2 border-white text-slate-600 flex items-center justify-center text-sm font-bold z-0">+4</div>
          </div>
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-sm">
            Filter
          </button>
          <button 
            onClick={() => handleQuickAdd('backlog')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:-translate-y-0.5"
          >
            <Plus size={18} />
            New Task
          </button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 flex-1 items-start min-h-0">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter(t => t.status === column.id);
          
          return (
            <div 
              key={column.id} 
              className={cn(
                "flex-shrink-0 w-80 bg-slate-100/50 rounded-2xl flex flex-col max-h-full border border-slate-200/60",
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={cn("p-4 border-b rounded-t-2xl flex justify-between items-center sticky top-0", column.color)}>
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  {column.title}
                  <span className="bg-white/60 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                    {columnTasks.length}
                  </span>
                </h3>
                <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-white/50 transition-colors">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              {/* Column Body / Tasks List */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {columnTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
                
                {/* Empty Drop Zone visually */}
                {columnTasks.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                    Drop tasks here
                  </div>
                )}
              </div>
              
              {/* Quick Add Button */}
              <div className="p-3 border-t border-slate-200/50 bg-slate-50/50 rounded-b-2xl">
                <button 
                  onClick={() => handleQuickAdd(column.id)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm font-medium hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={16} />
                  Add Task
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({ 
  task,
  onDragStart,
  onDragEnd
}: { 
  task: Task;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
}) {
  
  const priorityColors = {
    Low: 'bg-slate-100 text-slate-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Urgent: 'bg-red-100 text-red-700',
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 cursor-grab" />
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
          {task.dueDate && (
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
