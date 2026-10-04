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
  meetingId?: string;
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
  date: number;
  time: string;
  color: string;
  organizationId?: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  presenter?: string;
  duration?: number;
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
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  onlineMeetingUrl?: string;
  organizer: string;
  chairperson?: string;
  secretary?: string;
  participants: string[];
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
