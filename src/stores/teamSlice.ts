import type { StateCreator } from 'zustand';
import type { User } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export interface TeamSlice {
  team: User[];
  addTeamMember: (member: User) => void;
}

export const createTeamSlice: StateCreator<AppState, [], [], TeamSlice> = (_set, get) => ({
  team: [],
  
  addTeamMember: async (member) => {
    const orgId = get().currentUser?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'team', member.id), { ...member, organizationId: orgId }); 
      toast.success('Anggota berhasil ditambahkan');
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menambahkan anggota');
      throw e;
    }
  },
});
