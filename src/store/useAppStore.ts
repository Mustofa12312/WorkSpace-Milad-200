import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

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
  currentUser: User | null;
  tasks: Task[];
  projects: Project[];
  documents: Document[];
  team: User[];
  events: Event[];
  
  setCurrentUser: (user: User | null) => void;
  setCurrentOrgId: (orgId: string) => void;
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  addTask: (task: Task) => void;
  addProject: (project: Project) => void;
  addDocument: (doc: Document) => void;
  addTeamMember: (member: User) => void;
  addEvent: (event: Event) => void;
  fetchTasks: () => Promise<void>;
}

const INITIAL_TASKS: Task[] = [];

export const useAppStore = create<AppState>((set, get) => ({
  currentOrgId: 'default-org-1',
  currentUser: null,
  tasks: INITIAL_TASKS,
  
  projects: [],
  documents: [],
  team: [],
  events: [],
  
  setCurrentOrgId: (orgId) => {
    set({ currentOrgId: orgId });
    get().fetchTasks();
  },

  setCurrentUser: (user) => set({ currentUser: user }),
  
  setTasks: (tasks) => set({ tasks }),

  addProject: async (project) => {
    const orgId = get().currentOrgId;
    const projectWithOrg = { ...project, organizationId: orgId };
    set((state) => ({ projects: [...state.projects, projectWithOrg] }));
    try { await setDoc(doc(db, 'projects', project.id), projectWithOrg); } catch (e) { console.error("Firestore error:", e); }
  },
  
  addDocument: async (docInfo) => {
    const orgId = get().currentOrgId;
    const docWithOrg = { ...docInfo, organizationId: orgId };
    set((state) => ({ documents: [...state.documents, docWithOrg] }));
    try { await setDoc(doc(db, 'documents', docInfo.id), docWithOrg); } catch (e) { console.error("Firestore error:", e); }
  },
  
  addTeamMember: async (member) => {
    const orgId = get().currentOrgId;
    const memberWithOrg = { ...member, organizationId: orgId };
    set((state) => ({ team: [...state.team, memberWithOrg] }));
    try { await setDoc(doc(db, 'team', member.id), memberWithOrg); } catch (e) { console.error("Firestore error:", e); }
  },
  
  addEvent: async (event) => {
    const orgId = get().currentOrgId;
    const eventWithOrg = { ...event, organizationId: orgId };
    set((state) => ({ events: [...state.events, eventWithOrg] }));
    try { await setDoc(doc(db, 'events', event.id), eventWithOrg); } catch (e) { console.error("Firestore error:", e); }
  },
  
  updateTaskStatus: async (taskId, newStatus) => {
    set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    }));
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
    set((state) => ({
      tasks: [...state.tasks, taskWithOrg]
    }));
    try {
      await setDoc(doc(db, 'tasks', task.id), taskWithOrg);
    } catch (error) {
      console.error("Firestore sync error:", error);
    }
  },

  fetchTasks: async () => {
    const orgId = get().currentOrgId;
    try {
      const getDocsSafe = async (col: string) => {
        try {
          // Note: In a real app with proper Firebase Indexes, we should use:
          // query(collection(db, col), where("organizationId", "==", orgId))
          // For MVP without creating indexes manually, we fetch all and filter in memory:
          const snap = await getDocs(collection(db, col));
          return snap.docs.filter(d => {
            const data = d.data();
            return !data.organizationId || data.organizationId === orgId;
          });
        } catch {
          return [];
        }
      };

      const [tasksDocs, projectsDocs, docsDocs, teamDocs, eventsDocs] = await Promise.all([
        getDocsSafe('tasks'),
        getDocsSafe('projects'),
        getDocsSafe('documents'),
        getDocsSafe('team'),
        getDocsSafe('events')
      ]);

      const tasksList = tasksDocs.map(d => ({ id: d.id, ...(d.data() as object) } as Task));
      const projectsList = projectsDocs.map(d => ({ id: d.id, ...(d.data() as object) } as Project));
      const documentsList = docsDocs.map(d => ({ id: d.id, ...(d.data() as object) } as Document));
      const teamList = teamDocs.map(d => ({ id: d.id, ...(d.data() as object) } as User));
      const eventsList = eventsDocs.map(d => ({ id: d.id, ...(d.data() as object) } as Event));

      // Always set state from Firestore so it reflects actual database
      set({ tasks: tasksList });
      set({ projects: projectsList });
      set({ documents: documentsList });
      set({ team: teamList });
      set({ events: eventsList });

    } catch (error) {
      console.error("Firestore sync fetch error:", error);
    }
  }
}));
