import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'backlog' | 'planned' | 'in_progress' | 'review' | 'completed';

export interface Task {
  id: string;
  title: string;
  project: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  comments: number;
  attachments: number;
  assignee: string;
  organizationId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  status?: string;
  lastActive?: string;
  organizationId?: string;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  members: number;
  dueDate: string;
  color: string;
  organizationId?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  owner: string;
  organizationId?: string;
}

export interface Event {
  id: string;
  title: string;
  date: number; // day of month
  time: string;
  color: string;
  organizationId?: string;
}

interface AppState {
  currentOrgId: string;
  orgName: string;
  currentUser: User | null;
  tasks: Task[];
  projects: Project[];
  documents: Document[];
  team: User[];
  events: Event[];
  
  setCurrentUser: (user: User | null) => void;
  setCurrentOrgId: (orgId: string) => void;
  setOrgName: (name: string) => void;
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  addTask: (task: Task) => void;
  addProject: (project: Project) => void;
  addDocument: (doc: Document) => void;
  addTeamMember: (member: User) => void;
  addEvent: (event: Event) => void;
  setupSubscriptions: () => void;
}

const INITIAL_TASKS: Task[] = [];
let unsubscribers: (() => void)[] = [];

export const useAppStore = create<AppState>((set, get) => ({
  currentOrgId: 'default-org-1',
  orgName: 'Milad 200',
  currentUser: null,
  tasks: INITIAL_TASKS,
  projects: [],
  documents: [],
  team: [],
  events: [],
  
  setCurrentOrgId: (orgId) => {
    set({ currentOrgId: orgId });
    get().setupSubscriptions();
  },

  setOrgName: (name) => set({ orgName: name }),

  setCurrentUser: (user) => set({ currentUser: user }),
  setTasks: (tasks) => set({ tasks }),

  addProject: async (project) => {
    const orgId = get().currentOrgId;
    const projectWithOrg = { ...project, organizationId: orgId };
    try { await setDoc(doc(db, 'projects', project.id), projectWithOrg); } catch (e) { console.error("Firestore error:", e); }
  },
  
  addDocument: async (docInfo) => {
    const orgId = get().currentOrgId;
    const docWithOrg = { ...docInfo, organizationId: orgId };
    try { await setDoc(doc(db, 'documents', docInfo.id), docWithOrg); } catch (e) { console.error("Firestore error:", e); }
  },
  
  addTeamMember: async (member) => {
    const orgId = get().currentOrgId;
    const memberWithOrg = { ...member, organizationId: orgId };
    try { await setDoc(doc(db, 'team', member.id), memberWithOrg); } catch (e) { console.error("Firestore error:", e); }
  },
  
  addEvent: async (event) => {
    const orgId = get().currentOrgId;
    const eventWithOrg = { ...event, organizationId: orgId };
    try { await setDoc(doc(db, 'events', event.id), eventWithOrg); } catch (e) { console.error("Firestore error:", e); }
  },
  
  updateTaskStatus: async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { status: newStatus });
    } catch (error) {
      console.error("Firestore sync error:", error);
    }
  },

  addTask: async (task) => {
    const orgId = get().currentOrgId;
    const taskWithOrg = { ...task, organizationId: orgId };
    try {
      await setDoc(doc(db, 'tasks', task.id), taskWithOrg);
    } catch (error) {
      console.error("Firestore sync error:", error);
    }
  },

  setupSubscriptions: () => {
    const orgId = get().currentOrgId;
    
    // Clear old subscriptions
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];

    const subscribeToCollection = (colName: string, stateKey: keyof AppState) => {
      import('firebase/firestore').then(({ collection, onSnapshot }) => {
        const unsubscribe = onSnapshot(collection(db, colName), (snapshot) => {
          const list = snapshot.docs
            .map(d => ({ id: d.id, ...(d.data() as object) }))
            .filter((data: Record<string, unknown>) => !data.organizationId || data.organizationId === orgId);
          set({ [stateKey]: list });
        }, (error) => {
          console.error(`Error syncing ${colName}:`, error);
        });
        unsubscribers.push(unsubscribe);
      });
    };

    subscribeToCollection('tasks', 'tasks');
    subscribeToCollection('projects', 'projects');
    subscribeToCollection('documents', 'documents');
    subscribeToCollection('team', 'team');
    subscribeToCollection('events', 'events');
  }
}));
