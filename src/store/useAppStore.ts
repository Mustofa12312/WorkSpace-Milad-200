import { create } from 'zustand';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'backlog' | 'planned' | 'in_progress' | 'review' | 'completed';

export interface Task {
  id: string;
  title: string;
  project: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  comments: number;
  attachments: number;
  assignee: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AppState {
  currentUser: User | null;
  tasks: Task[];
  setCurrentUser: (user: User | null) => void;
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  addTask: (task: Task) => void;
}

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Setup Firebase Auth', project: 'Engineering', priority: 'High', status: 'backlog', dueDate: 'Sep 12', comments: 3, attachments: 1, assignee: 'M' },
  { id: 't2', title: 'Review PRD Document', project: 'Product', priority: 'Medium', status: 'planned', dueDate: 'Tomorrow', comments: 5, attachments: 2, assignee: 'A' },
  { id: 't3', title: 'Finalize Q3 Budget', project: 'Finance', priority: 'Urgent', status: 'in_progress', dueDate: 'Today, 5:00 PM', comments: 12, attachments: 4, assignee: 'H' },
  { id: 't4', title: 'Design System Update', project: 'Design', priority: 'Low', status: 'review', dueDate: 'Sep 15', comments: 2, attachments: 0, assignee: 'F' },
  { id: 't5', title: 'Client Onboarding Meeting', project: 'Operations', priority: 'Medium', status: 'completed', dueDate: 'Sep 10', comments: 0, attachments: 1, assignee: 'S' },
];

export const useAppStore = create<AppState>((set) => ({
  currentUser: { id: 'u1', name: 'Mustofa', email: 'mustofa@workspace.com' }, // Default mock user
  tasks: INITIAL_TASKS,
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setTasks: (tasks) => set({ tasks }),
  
  updateTaskStatus: (taskId, newStatus) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
  })),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  }))
}));
