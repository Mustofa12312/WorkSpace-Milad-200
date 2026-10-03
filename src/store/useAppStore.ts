import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, where, deleteDoc } from 'firebase/firestore';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'backlog' | 'planned' | 'in_progress' | 'review' | 'completed';
export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type MeetingType = 'Regular' | 'Emergency' | 'Planning' | 'Evaluation' | 'Project' | 'Internal' | 'External';
export type ApprovalStatus = 'Draft' | 'Review' | 'Revision Required' | 'Approved' | 'Archived';

export interface Task {
  id: string;
  title: string;
  description?: string;
  project: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  comments: number;
  attachments: number;
  assignee: string;
  checklist?: { id: string; text: string; done: boolean }[];
  organizationId?: string;
  createdAt?: string;
  meetingId?: string; // linked meeting source
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
  description?: string;
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
  url?: string;
}

export interface Event {
  id: string;
  title: string;
  date: number; // day of month
  time: string;
  color: string;
  organizationId?: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  presenter?: string;
  duration?: number; // minutes
}

export interface TranscriptLine {
  id: string;
  time: string;
  speaker: string;
  text: string;
}

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  date: string;        // ISO date string e.g. "2026-10-04"
  startTime: string;   // e.g. "19:00"
  endTime: string;     // e.g. "20:30"
  location?: string;
  onlineMeetingUrl?: string;
  organizer: string;   // user id
  chairperson?: string;
  secretary?: string;
  participants: string[]; // user ids or names
  agenda: AgendaItem[];
  transcript?: TranscriptLine[];
  summary?: string;
  decisions?: string[];
  actionItems?: { id: string; task: string; assignee: string; deadline: string }[];
  recordingUrl?: string;
  projectId?: string;
  organizationId?: string;
  createdAt?: string;
  approvalStatus?: ApprovalStatus;
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
  meetings: Meeting[];
  
  setCurrentUser: (user: User | null) => void;
  setCurrentOrgId: (orgId: string) => void;
  setOrgName: (name: string) => void;
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (docId: string) => void;
  addTeamMember: (member: User) => void;
  addEvent: (event: Event) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (meetingId: string) => void;
  setupSubscriptions: () => void;
  teardownSubscriptions: () => void;
}

let unsubscribers: (() => void)[] = [];

export const useAppStore = create<AppState>((set, get) => ({
  currentOrgId: 'default-org-1',
  orgName: 'Milad 200',
  currentUser: null,
  tasks: [],
  projects: [],
  documents: [],
  team: [],
  events: [],
  meetings: [],
  
  setCurrentOrgId: (orgId) => {
    set({ currentOrgId: orgId });
    get().setupSubscriptions();
  },

  setOrgName: (name) => set({ orgName: name }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setTasks: (tasks) => set({ tasks }),

  addProject: async (project) => {
    const orgId = get().currentOrgId;
    try { await setDoc(doc(db, 'projects', project.id), { ...project, organizationId: orgId }); }
    catch (e) { console.error('Firestore error:', e); }
  },
  
  deleteProject: async (projectId) => {
    try { await deleteDoc(doc(db, 'projects', projectId)); }
    catch (e) { console.error('Firestore error:', e); }
  },
  
  addDocument: async (docInfo) => {
    const orgId = get().currentOrgId;
    try { await setDoc(doc(db, 'documents', docInfo.id), { ...docInfo, organizationId: orgId }); }
    catch (e) { console.error('Firestore error:', e); }
  },

  deleteDocument: async (docId) => {
    try { await deleteDoc(doc(db, 'documents', docId)); }
    catch (e) { console.error('Firestore error:', e); }
  },
  
  addTeamMember: async (member) => {
    const orgId = get().currentOrgId;
    try { await setDoc(doc(db, 'team', member.id), { ...member, organizationId: orgId }); }
    catch (e) { console.error('Firestore error:', e); }
  },
  
  addEvent: async (event) => {
    const orgId = get().currentOrgId;
    try { await setDoc(doc(db, 'events', event.id), { ...event, organizationId: orgId }); }
    catch (e) { console.error('Firestore error:', e); }
  },

  addMeeting: async (meeting) => {
    const orgId = get().currentOrgId;
    try { await setDoc(doc(db, 'meetings', meeting.id), { ...meeting, organizationId: orgId, createdAt: new Date().toISOString() }); }
    catch (e) { console.error('Firestore error:', e); }
  },

  updateMeeting: async (meetingId, updates) => {
    try { await updateDoc(doc(db, 'meetings', meetingId), updates as Record<string, unknown>); }
    catch (e) { console.error('Firestore error:', e); }
  },

  deleteMeeting: async (meetingId) => {
    try { await deleteDoc(doc(db, 'meetings', meetingId)); }
    catch (e) { console.error('Firestore error:', e); }
  },
  
  updateTaskStatus: async (taskId, newStatus) => {
    try { await updateDoc(doc(db, 'tasks', taskId), { status: newStatus }); }
    catch (error) { console.error('Firestore sync error:', error); }
  },

  addTask: async (task) => {
    const orgId = get().currentOrgId;
    try { await setDoc(doc(db, 'tasks', task.id), { ...task, organizationId: orgId, createdAt: new Date().toISOString() }); }
    catch (error) { console.error('Firestore sync error:', error); }
  },

  updateTask: async (taskId, updates) => {
    try { await updateDoc(doc(db, 'tasks', taskId), updates as Record<string, unknown>); }
    catch (error) { console.error('Firestore sync error:', error); }
  },

  deleteTask: async (taskId) => {
    try { await deleteDoc(doc(db, 'tasks', taskId)); }
    catch (error) { console.error('Firestore sync error:', error); }
  },

  teardownSubscriptions: () => {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
  },

  setupSubscriptions: () => {
    const orgId = get().currentOrgId;
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
}));
