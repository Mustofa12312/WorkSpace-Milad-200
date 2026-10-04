import type { StateCreator } from 'zustand';
import type { Event } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { logAuditAction } from '../lib/audit';

export interface EventSlice {
  events: Event[];
  addEvent: (event: Event) => void;
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
});
