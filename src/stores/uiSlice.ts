import type { StateCreator } from 'zustand';

export interface UiSlice {
  searchFocus: { type: 'task' | 'meeting' | 'project' | 'member'; id: string } | null;
  setSearchFocus: (focus: { type: 'task' | 'meeting' | 'project' | 'member'; id: string } | null) => void;
  isCreateTaskModalOpen: boolean;
  setCreateTaskModalOpen: (open: boolean) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  searchFocus: null,
  setSearchFocus: (focus) => set({ searchFocus: focus }),
  isCreateTaskModalOpen: false,
  setCreateTaskModalOpen: (open) => set({ isCreateTaskModalOpen: open }),
});
