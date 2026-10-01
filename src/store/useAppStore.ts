import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

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
  role?: string;
  status?: string;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  members: number;
  dueDate: string;
  color: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  owner: string;
}

export interface Event {
  id: string;
  title: string;
  date: number; // day of month
  time: string;
  color: string;
}

interface AppState {
  currentUser: User | null;
  tasks: Task[];
  projects: Project[];
  documents: Document[];
  team: User[];
  events: Event[];
  
  setCurrentUser: (user: User | null) => void;
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  addTask: (task: Task) => void;
  addProject: (project: Project) => void;
  addDocument: (doc: Document) => void;
  addTeamMember: (member: User) => void;
  addEvent: (event: Event) => void;
  fetchTasks: () => Promise<void>;
}

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Setup Firebase Auth', project: 'Engineering', priority: 'High', status: 'backlog', dueDate: 'Sep 12', comments: 3, attachments: 1, assignee: 'M' },
  { id: 't2', title: 'Review PRD Document', project: 'Product', priority: 'Medium', status: 'planned', dueDate: 'Tomorrow', comments: 5, attachments: 2, assignee: 'A' },
  { id: 't3', title: 'Finalize Q3 Budget', project: 'Finance', priority: 'Urgent', status: 'in_progress', dueDate: 'Today, 5:00 PM', comments: 12, attachments: 4, assignee: 'H' },
  { id: 't4', title: 'Design System Update', project: 'Design', priority: 'Low', status: 'review', dueDate: 'Sep 15', comments: 2, attachments: 0, assignee: 'F' },
  { id: 't5', title: 'Client Onboarding Meeting', project: 'Operations', priority: 'Medium', status: 'completed', dueDate: 'Sep 10', comments: 0, attachments: 1, assignee: 'S' },
];

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  tasks: INITIAL_TASKS,
  
  projects: [
    { id: '1', name: 'Milad 200 Main Event', status: 'Active', progress: 65, members: 12, dueDate: 'Oct 30, 2026', color: 'bg-indigo-500' },
    { id: '2', name: 'Sponsorship & Finance', status: 'Active', progress: 40, members: 5, dueDate: 'Sep 15, 2026', color: 'bg-emerald-500' },
    { id: '3', name: 'Marketing & PR', status: 'Planning', progress: 15, members: 8, dueDate: 'Dec 1, 2026', color: 'bg-amber-500' }
  ],
  documents: [
    { id: '1', name: 'Proposal Milad 200 Final.pdf', type: 'pdf', size: '2.4 MB', date: 'Sep 28, 2026', owner: 'Mustofa' },
    { id: '2', name: 'RAB Kegiatan (Revisi).xlsx', type: 'sheet', size: '156 KB', date: 'Sep 25, 2026', owner: 'Ahmad F.' }
  ],
  team: [
    { id: '1', name: 'Mustofa', email: 'mustofa@milad200.com', role: 'Owner', status: 'Active' },
    { id: '2', name: 'Ahmad', email: 'ahmad@milad200.com', role: 'Admin', status: 'Active' }
  ],
  events: [
    { id: '1', title: 'Design Review', date: 5, time: '10:00 AM', color: 'bg-indigo-100 text-indigo-700' },
    { id: '2', title: 'Submit Proposal', date: 12, time: '5:00 PM', color: 'bg-emerald-100 text-emerald-700' },
    { id: '3', title: 'Weekly Sync', date: 12, time: '3:00 PM', color: 'bg-indigo-100 text-indigo-700' },
    { id: '4', title: 'Vendor Meeting', date: 20, time: '1:00 PM', color: 'bg-indigo-100 text-indigo-700' }
  ],
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setTasks: (tasks) => set({ tasks }),

  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
  addTeamMember: (member) => set((state) => ({ team: [...state.team, member] })),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  
  updateTaskStatus: async (taskId, newStatus) => {
    set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    }));
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { status: newStatus });
    } catch (error) {
      console.error("Firestore sync error:", error);
    }
  },

  addTask: async (task) => {
    set((state) => ({
      tasks: [...state.tasks, task]
    }));
    try {
      await setDoc(doc(db, 'tasks', task.id), task);
    } catch (error) {
      console.error("Firestore sync error:", error);
    }
  },

  fetchTasks: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'tasks'));
      const tasksList: Task[] = [];
      querySnapshot.forEach((docSnap) => {
        tasksList.push({ id: docSnap.id, ...docSnap.data() } as Task);
      });
      if (tasksList.length > 0) {
        set({ tasks: tasksList });
      } else {
        // If empty, initialize with mock data so the board isn't empty on first run
        INITIAL_TASKS.forEach(async (task) => {
          await setDoc(doc(db, 'tasks', task.id), task).catch(() => {});
        });
      }
    } catch (error) {
      console.error("Firestore fetch error (fallback to mock):", error);
    }
  }
}));
