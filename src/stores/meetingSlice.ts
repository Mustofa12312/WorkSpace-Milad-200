import type { StateCreator } from 'zustand';
import type { Meeting } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export interface MeetingSlice {
  meetings: Meeting[];
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (meetingId: string) => void;
}

export const createMeetingSlice: StateCreator<AppState, [], [], MeetingSlice> = (_set, get) => ({
  meetings: [],

  addMeeting: async (meeting) => {
    const orgId = get().currentUser?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'meetings', meeting.id), { ...meeting, organizationId: orgId, createdAt: new Date().toISOString() }); 
      toast.success('Rapat berhasil dijadwalkan');
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menjadwalkan rapat');
      throw e;
    }
  },

  updateMeeting: async (meetingId, updates) => {
    try { 
      await updateDoc(doc(db, 'meetings', meetingId), updates as Record<string, unknown>); 
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal memperbarui rapat');
      throw e;
    }
  },

  deleteMeeting: async (meetingId) => {
    try { 
      await deleteDoc(doc(db, 'meetings', meetingId)); 
      toast.success('Rapat dihapus');
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menghapus rapat');
      throw e;
    }
  },
});
