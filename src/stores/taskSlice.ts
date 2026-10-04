import type { StateCreator } from 'zustand';
import type { Task, TaskStatus } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { logAuditAction } from '../lib/audit';

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
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus }); 
      if (user) logAuditAction(orgId, user, 'UPDATE', 'Task', taskId, `Status changed to ${newStatus}`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore sync error:', e);
      toast.error(e.message || 'Gagal memindahkan tugas');
      throw e;
    }
  },

  addTask: async (task) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'tasks', task.id), { ...task, organizationId: orgId, createdAt: new Date().toISOString() }); 
      toast.success('Tugas berhasil dibuat');
      if (user) logAuditAction(orgId, user, 'CREATE', 'Task', task.id, `Created task "${task.title}"`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore sync error:', e);
      toast.error(e.message || 'Gagal membuat tugas');
      throw e;
    }
  },

  updateTask: async (taskId, updates) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await updateDoc(doc(db, 'tasks', taskId), updates as Record<string, unknown>); 
      toast.success('Tugas diperbarui');
      if (user) logAuditAction(orgId, user, 'UPDATE', 'Task', taskId, `Updated task details`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore sync error:', e);
      toast.error(e.message || 'Gagal memperbarui tugas');
      throw e;
    }
  },

  deleteTask: async (taskId) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await deleteDoc(doc(db, 'tasks', taskId)); 
      toast.success('Tugas dihapus');
      if (user) logAuditAction(orgId, user, 'DELETE', 'Task', taskId, `Deleted task`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore sync error:', e);
      toast.error(e.message || 'Gagal menghapus tugas');
      throw e;
    }
  },
});
