import type { StateCreator } from 'zustand';
import type { Task, TaskStatus } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export interface TaskSlice {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
}

export const createTaskSlice: StateCreator<AppState, [], [], TaskSlice> = (set, get) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),

  updateTaskStatus: async (taskId, newStatus) => {
    try { 
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus }); 
    } catch (err) { const e = err as Error; 
      console.error('Firestore sync error:', e);
      toast.error(e.message || 'Gagal memindahkan tugas');
      throw e;
    }
  },

  addTask: async (task) => {
    const orgId = get().currentUser?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'tasks', task.id), { ...task, organizationId: orgId, createdAt: new Date().toISOString() }); 
      toast.success('Tugas berhasil dibuat');
    } catch (err) { const e = err as Error; 
      console.error('Firestore sync error:', e);
      toast.error(e.message || 'Gagal membuat tugas');
      throw e;
    }
  },

  updateTask: async (taskId, updates) => {
    try { 
      await updateDoc(doc(db, 'tasks', taskId), updates as Record<string, unknown>); 
      toast.success('Tugas diperbarui');
    } catch (err) { const e = err as Error; 
      console.error('Firestore sync error:', e);
      toast.error(e.message || 'Gagal memperbarui tugas');
      throw e;
    }
  },

  deleteTask: async (taskId) => {
    try { 
      await deleteDoc(doc(db, 'tasks', taskId)); 
      toast.success('Tugas dihapus');
    } catch (err) { const e = err as Error; 
      console.error('Firestore sync error:', e);
      toast.error(e.message || 'Gagal menghapus tugas');
      throw e;
    }
  },
});
