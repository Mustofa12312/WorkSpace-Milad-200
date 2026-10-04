import type { StateCreator } from 'zustand';
import type { Project } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { logAuditAction } from '../lib/audit';

export interface ProjectSlice {
  projects: Project[];
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
}

export const createProjectSlice: StateCreator<AppState, [], [], ProjectSlice> = (_set, get) => ({
  projects: [],
  
  addProject: async (project) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'projects', project.id), { ...project, organizationId: orgId }); 
      toast.success('Proyek berhasil disimpan');
      if (user) logAuditAction(orgId, user, 'CREATE', 'Project', project.id, `Created project "${project.name}"`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menyimpan proyek');
      throw e;
    }
  },
  
  deleteProject: async (projectId) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await deleteDoc(doc(db, 'projects', projectId)); 
      toast.success('Proyek dihapus');
      if (user) logAuditAction(orgId, user, 'DELETE', 'Project', projectId, `Deleted project`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menghapus proyek');
      throw e;
    }
  },
});
