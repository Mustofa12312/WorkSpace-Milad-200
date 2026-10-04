import type { StateCreator } from 'zustand';
import type { Document } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export interface DocumentSlice {
  documents: Document[];
  addDocument: (doc: Document) => void;
  deleteDocument: (docId: string) => void;
}

export const createDocumentSlice: StateCreator<AppState, [], [], DocumentSlice> = (_set, get) => ({
  documents: [],
  
  addDocument: async (docInfo) => {
    const orgId = get().currentUser?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'documents', docInfo.id), { ...docInfo, organizationId: orgId }); 
      toast.success('Dokumen berhasil diunggah');
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menyimpan dokumen');
      throw e;
    }
  },

  deleteDocument: async (docId) => {
    try { 
      await deleteDoc(doc(db, 'documents', docId)); 
      toast.success('Dokumen dihapus');
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menghapus dokumen');
      throw e;
    }
  },
});
