import type { StateCreator } from 'zustand';

export interface UiSlice {
  searchFocus: { type: 'task' | 'meeting' | 'project' | 'member'; id: string } | null;
  setSearchFocus: (focus: { type: 'task' | 'meeting' | 'project' | 'member'; id: string } | null) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
  searchFocus: null,
  setSearchFocus: (focus) => set({ searchFocus: focus }),
});
