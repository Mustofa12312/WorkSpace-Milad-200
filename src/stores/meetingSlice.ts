import type { StateCreator } from 'zustand';
import type { Meeting } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { logAuditAction } from '../lib/audit';

export interface MeetingSlice {
  meetings: Meeting[];
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (meetingId: string) => void;
}

export const createMeetingSlice: StateCreator<AppState, [], [], MeetingSlice> = (_set, get) => ({
  meetings: [],

  addMeeting: async (meeting) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'meetings', meeting.id), { ...meeting, organizationId: orgId, createdAt: new Date().toISOString() }); 
      toast.success('Rapat berhasil dijadwalkan');
      if (user) logAuditAction(orgId, user, 'CREATE', 'Meeting', meeting.id, `Scheduled meeting "${meeting.title}"`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menjadwalkan rapat');
      throw e;
    }
  },

  updateMeeting: async (meetingId, updates) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await updateDoc(doc(db, 'meetings', meetingId), updates as Record<string, unknown>); 
      if (user) logAuditAction(orgId, user, 'UPDATE', 'Meeting', meetingId, `Updated meeting details`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal memperbarui rapat');
      throw e;
    }
  },

  deleteMeeting: async (meetingId) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await deleteDoc(doc(db, 'meetings', meetingId)); 
      toast.success('Rapat dihapus');
      if (user) logAuditAction(orgId, user, 'DELETE', 'Meeting', meetingId, `Deleted meeting`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menghapus rapat');
      throw e;
    }
  },
});
