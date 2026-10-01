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
}

interface AppState {
  currentUser: User | null;
  tasks: Task[];
  setCurrentUser: (user: User | null) => void;
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  addTask: (task: Task) => void;
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
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setTasks: (tasks) => set({ tasks }),
  
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
