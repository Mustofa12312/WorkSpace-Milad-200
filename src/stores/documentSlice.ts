import type { StateCreator } from 'zustand';
import type { Document } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { logAuditAction } from '../lib/audit';

export interface DocumentSlice {
  documents: Document[];
  addDocument: (doc: Document) => void;
  deleteDocument: (docId: string) => void;
}

export const createDocumentSlice: StateCreator<AppState, [], [], DocumentSlice> = (_set, get) => ({
  documents: [],
  
  addDocument: async (docInfo) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'documents', docInfo.id), { ...docInfo, organizationId: orgId }); 
      toast.success('Dokumen berhasil diunggah');
      if (user) logAuditAction(orgId, user, 'CREATE', 'Document', docInfo.id, `Uploaded document "${docInfo.name}"`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menyimpan dokumen');
      throw e;
    }
  },

  deleteDocument: async (docId) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await deleteDoc(doc(db, 'documents', docId)); 
      toast.success('Dokumen dihapus');
      if (user) logAuditAction(orgId, user, 'DELETE', 'Document', docId, `Deleted document`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menghapus dokumen');
      throw e;
    }
  },
});
