import type { StateCreator } from 'zustand';
import type { User } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { logAuditAction } from '../lib/audit';

export interface TeamSlice {
  team: User[];
  addTeamMember: (member: User) => void;
}

export const createTeamSlice: StateCreator<AppState, [], [], TeamSlice> = (_set, get) => ({
  team: [],
  
  addTeamMember: async (member) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try { 
      await setDoc(doc(db, 'team', member.id), { ...member, organizationId: orgId }); 
      toast.success('Anggota berhasil ditambahkan');
      if (user) logAuditAction(orgId, user, 'CREATE', 'Team', member.id, `Added team member "${member.name}"`);
    } catch (err) { const e = err as Error; 
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal menambahkan anggota');
      throw e;
    }
  },
});
