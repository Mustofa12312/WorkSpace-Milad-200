import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Firebase mocks ──────────────────────────────────────────────────────────
const fs = vi.hoisted(() => {
  const listeners: Array<{ col: string; orgId: unknown; next: (snap: unknown) => void; unsub: () => void }> = [];
  return {
    listeners,
    collection: vi.fn((_db: unknown, name: string) => ({ name })),
    where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
    query: vi.fn((col: { name: string }, cond: { value: unknown }) => ({ col: col.name, orgId: cond.value })),
    doc: vi.fn((_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` })),
    setDoc: vi.fn(async () => undefined),
    updateDoc: vi.fn(async () => undefined),
    onSnapshot: vi.fn((q: { col: string; orgId: unknown }, next: (snap: unknown) => void) => {
      const unsub = vi.fn();
      listeners.push({ col: q.col, orgId: q.orgId, next, unsub });
      return unsub;
    }),
  };
});

vi.mock('firebase/firestore', () => fs);
vi.mock('../lib/firebase', () => ({ db: { __mock: 'db' } }));

import { useAppStore, type Task } from './useAppStore';

const initialState = useAppStore.getState();

const sampleTask: Task = {
  id: 'task-1',
  title: 'Prepare proposal',
  project: 'Seminar',
  priority: 'High',
  status: 'backlog',
  dueDate: 'Oct 10',
  comments: 0,
  attachments: 0,
  assignee: 'M',
};

beforeEach(() => {
  useAppStore.getState().teardownSubscriptions();
  useAppStore.setState(initialState, true);
  fs.listeners.length = 0;
  vi.clearAllMocks();
});

describe('useAppStore — writes', () => {
  it('addTask stamps the current organizationId', async () => {
    useAppStore.setState({ currentOrgId: 'org-A' });
    await useAppStore.getState().addTask(sampleTask);

    expect(fs.doc).toHaveBeenCalledWith(expect.anything(), 'tasks', 'task-1');
    expect(fs.setDoc).toHaveBeenCalledWith(
      { path: 'tasks/task-1' },
      expect.objectContaining({ ...sampleTask, organizationId: 'org-A' }),
    );
  });

  it.each([
    ['addProject', 'projects', { id: 'p1', name: 'P', status: 'Active', progress: 0, members: 1, dueDate: '', color: 'blue' }],
    ['addDocument', 'documents', { id: 'd1', name: 'D', type: 'pdf', size: '1 KB', date: '', owner: 'me' }],
    ['addEvent', 'events', { id: 'e1', title: 'E', date: 1, time: '10:00', color: 'blue' }],
    ['addTeamMember', 'team', { id: 'u1', name: 'U', email: 'u@x.io', role: 'Member' }],
  ] as const)('%s writes to "%s" with organizationId', async (method, col, payload) => {
    useAppStore.setState({ currentOrgId: 'org-B' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (useAppStore.getState()[method] as (p: any) => Promise<void>)(payload);
    expect(fs.setDoc).toHaveBeenCalledWith({ path: `${col}/${payload.id}` }, { ...payload, organizationId: 'org-B' });
  });

  it('updateTaskStatus only patches the status field', async () => {
    await useAppStore.getState().updateTaskStatus('task-1', 'review');
    expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'tasks/task-1' }, { status: 'review' });
  });

  it('throws Firestore errors so the UI can handle them', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fs.setDoc.mockRejectedValueOnce(new Error('permission-denied'));
    await expect(useAppStore.getState().addTask(sampleTask)).rejects.toThrow('permission-denied');
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('useAppStore — realtime subscriptions', () => {
  it('subscribes to every collection with an org-scoped query', () => {
    useAppStore.setState({ currentOrgId: 'org-A' });
    useAppStore.getState().setupSubscriptions();

    expect(fs.listeners.map((l) => l.col).sort()).toEqual(['documents', 'events', 'invitations', 'meetings', 'projects', 'tasks', 'team']);
    expect(fs.where).toHaveBeenCalledWith('organizationId', '==', 'org-A');
    expect(fs.listeners.every((l) => l.orgId === 'org-A')).toBe(true);
  });

  it('writes snapshot data into state, keeping the Firestore doc id', () => {
    useAppStore.getState().setupSubscriptions();
    const tasksListener = fs.listeners.find((l) => l.col === 'tasks')!;

    tasksListener.next({
      docs: [{ id: 'task-1', data: () => ({ ...sampleTask, id: 'stale-id', organizationId: 'default-org-1' }) }],
    });

    expect(useAppStore.getState().tasks).toEqual([
      { ...sampleTask, id: 'task-1', organizationId: 'default-org-1' },
    ]);
  });

  it('tears down previous listeners when re-subscribing (e.g. org switch)', () => {
    useAppStore.getState().setupSubscriptions();
    const first = [...fs.listeners];

    useAppStore.getState().setCurrentOrgId('org-Z');

    first.forEach((l) => expect(l.unsub).toHaveBeenCalledTimes(1));
    expect(fs.listeners.slice(first.length).every((l) => l.orgId === 'org-Z')).toBe(true);
  });

  it('teardownSubscriptions unsubscribes everything', () => {
    useAppStore.getState().setupSubscriptions();
    useAppStore.getState().teardownSubscriptions();
    fs.listeners.forEach((l) => expect(l.unsub).toHaveBeenCalledTimes(1));
  });
});
