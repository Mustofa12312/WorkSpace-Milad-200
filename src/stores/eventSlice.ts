import type { StateCreator } from 'zustand';
import type { Event } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { logAuditAction } from '../lib/audit';

export interface EventSlice {
  events: Event[];
  addEvent: (event: Event) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
}

export const createEventSlice: StateCreator<AppState, [], [], EventSlice> = (_set, get) => ({
  events: [],
  
  addEvent: async (event) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'events', event.id), { ...event, organizationId: orgId }); 
      toast.success('Acara berhasil disimpan');
      if (user) logAuditAction(orgId, user, 'CREATE', 'Event', event.id, `Scheduled event "${event.title}"`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menyimpan acara');
      throw e;
    }
  },
  
  updateEvent: async (id, updates) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try {
      await setDoc(doc(db, 'events', id), { ...updates, organizationId: orgId }, { merge: true });
      toast.success('Acara berhasil diperbarui');
      if (user) logAuditAction(orgId, user, 'UPDATE', 'Event', id, `Updated event`);
    } catch (err) { const e = err as Error;
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal memperbarui acara');
      throw e;
    }
  },
  
  deleteEvent: async (id) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Acara berhasil dihapus');
      if (user) logAuditAction(orgId, user, 'DELETE', 'Event', id, `Deleted event`);
    } catch (err) { const e = err as Error;
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menghapus acara');
      throw e;
    }
  },
});
