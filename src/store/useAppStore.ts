import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export * from '../types';
import type { AuthSlice } from '../stores/authSlice';
import { createAuthSlice } from '../stores/authSlice';
import type { TaskSlice } from '../stores/taskSlice';
import { createTaskSlice } from '../stores/taskSlice';
import type { ProjectSlice } from '../stores/projectSlice';
import { createProjectSlice } from '../stores/projectSlice';
import type { DocumentSlice } from '../stores/documentSlice';
import { createDocumentSlice } from '../stores/documentSlice';
import type { TeamSlice } from '../stores/teamSlice';
import { createTeamSlice } from '../stores/teamSlice';
import type { EventSlice } from '../stores/eventSlice';
import { createEventSlice } from '../stores/eventSlice';
import type { MeetingSlice } from '../stores/meetingSlice';
import { createMeetingSlice } from '../stores/meetingSlice';

export interface AppState extends AuthSlice, TaskSlice, ProjectSlice, DocumentSlice, TeamSlice, EventSlice, MeetingSlice {
  setupSubscriptions: () => void;
  teardownSubscriptions: () => void;
}

let unsubscribers: (() => void)[] = [];

export const useAppStore = create<AppState>()((...a) => {
  const [set, get] = a;
  
  return {
    ...createAuthSlice(...a),
    ...createTaskSlice(...a),
    ...createProjectSlice(...a),
    ...createDocumentSlice(...a),
    ...createTeamSlice(...a),
    ...createEventSlice(...a),
    ...createMeetingSlice(...a),
    
    teardownSubscriptions: () => {
      unsubscribers.forEach(unsub => unsub());
      unsubscribers = [];
    },

    setupSubscriptions: () => {
      const orgId = get().currentUser?.organizationId || get().currentOrgId;
      get().teardownSubscriptions();

      const subscribeToCollection = (colName: string, stateKey: keyof AppState) => {
        const scoped = query(collection(db, colName), where('organizationId', '==', orgId));
        const unsubscribe = onSnapshot(scoped, (snapshot) => {
          const list = snapshot.docs.map(d => ({ ...(d.data() as object), id: d.id }));
          set({ [stateKey]: list } as Partial<AppState>);
        }, (error) => {
          console.error(`Error syncing ${colName}:`, error);
        });
        unsubscribers.push(unsubscribe);
      };

      subscribeToCollection('tasks', 'tasks');
      subscribeToCollection('projects', 'projects');
      subscribeToCollection('documents', 'documents');
      subscribeToCollection('team', 'team');
      subscribeToCollection('events', 'events');
      subscribeToCollection('meetings', 'meetings');
    }
  };
});
