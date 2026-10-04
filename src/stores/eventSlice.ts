import type { StateCreator } from 'zustand';
import type { Event } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export interface EventSlice {
  events: Event[];
  addEvent: (event: Event) => void;
}

export const createEventSlice: StateCreator<AppState, [], [], EventSlice> = (_set, get) => ({
  events: [],
  
  addEvent: async (event) => {
    const orgId = get().currentUser?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'events', event.id), { ...event, organizationId: orgId }); 
      toast.success('Acara berhasil disimpan');
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menyimpan acara');
      throw e;
    }
  },
});
