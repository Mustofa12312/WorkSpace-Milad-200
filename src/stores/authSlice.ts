import type { StateCreator } from 'zustand';
import type { User } from '../types';
import type { AppState } from '../store/useAppStore';

export interface AuthSlice {
  currentOrgId: string;
  orgName: string;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  setCurrentOrgId: (orgId: string) => void;
  setOrgName: (name: string) => void;
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  currentOrgId: 'default-org-1',
  orgName: 'Milad 200',
  currentUser: null,
  
  setCurrentOrgId: (orgId) => {
    set({ currentOrgId: orgId });
    get().setupSubscriptions();
  },

  setOrgName: (name) => set({ orgName: name }),
  setCurrentUser: (user) => set({ currentUser: user }),
});
