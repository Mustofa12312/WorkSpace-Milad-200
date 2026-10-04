import type { StateCreator } from 'zustand';
import type { User, Invitation } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { logAuditAction } from '../lib/audit';

export interface TeamSlice {
  team: User[];
  invitations: Invitation[];
  addTeamMember: (member: User) => void;
  removeTeamMember: (memberId: string) => void;
  updateTeamMemberRole: (memberId: string, role: string) => Promise<void>;
  createInvitation: (email: string, role: string) => Promise<string>;
  deleteInvitation: (id: string) => void;
}

export const createTeamSlice: StateCreator<AppState, [], [], TeamSlice> = (_set, get) => ({
  team: [],
  invitations: [],
  
  removeTeamMember: async (memberId) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try {
      await deleteDoc(doc(db, 'team', memberId));
      toast.success('Anggota berhasil dikeluarkan');
      if (user) logAuditAction(orgId, user, 'DELETE', 'Team', memberId, `Removed team member`);
    } catch (err) {
      const e = err as Error;
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal mengeluarkan anggota');
      throw e;
    }
  },
  
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

  updateTeamMemberRole: async (memberId, role) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try {
      await updateDoc(doc(db, 'team', memberId), { role });
      toast.success('Role anggota berhasil diubah');
      if (user) logAuditAction(orgId, user, 'UPDATE', 'Team', memberId, `Updated role to ${role}`);
    } catch (err) {
      const e = err as Error;
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal mengubah role anggota');
      throw e;
    }
  },

  createInvitation: async (email: string, role: string) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    const inviteId = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    try {
      await setDoc(doc(db, 'invitations', inviteId), {
        id: inviteId,
        organizationId: orgId,
        email,
        role,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      });
      toast.success('Undangan berhasil dikirim');
      if (user) logAuditAction(orgId, user, 'CREATE', 'Team', inviteId, `Invited ${email} as ${role}`);
      return inviteId;
    } catch (err) {
      const e = err as Error;
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal mengirim undangan');
      throw e;
    }
  },

  deleteInvitation: async (id: string) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try {
      await deleteDoc(doc(db, 'invitations', id));
      toast.success('Undangan dibatalkan');
      if (user) logAuditAction(orgId, user, 'DELETE', 'Team', id, `Cancelled invitation ${id}`);
    } catch (err) {
      const e = err as Error;
      console.error('Firestore error:', e);
      toast.error(e.message || 'Gagal membatalkan undangan');
      throw e;
    }
  },
});
