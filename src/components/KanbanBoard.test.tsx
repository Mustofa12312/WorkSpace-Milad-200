import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  query: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

import KanbanBoard from './KanbanBoard';
import { useAppStore, type Task } from '../store/useAppStore';

const makeTask = (overrides: Partial<Task>): Task => ({
  id: 't',
  title: 'Task',
  project: 'General',
  priority: 'Medium',
  status: 'backlog',
  dueDate: 'No date',
  comments: 0,
  attachments: 0,
  assignee: 'M',
  ...overrides,
});

const addTask = vi.fn();
const updateTaskStatus = vi.fn();

beforeEach(() => {
  addTask.mockReset();
  updateTaskStatus.mockReset();
  useAppStore.setState({
    tasks: [
      makeTask({ id: 'a', title: 'Book venue', status: 'backlog' }),
      makeTask({ id: 'b', title: 'Write proposal', status: 'in_progress' }),
    ],
    projects: [
      { id: 'p1', name: 'Test Project', status: 'Planning', progress: 0, members: 1, dueDate: 'No date', color: 'bg-blue-500', organizationId: 'default-org-1' }
    ],
    addTask,
    updateTaskStatus,
  });
});

const column = (title: RegExp) => screen.getByRole('heading', { level: 3, name: title }).closest('[class*="w-80"]') as HTMLElement;

describe('KanbanBoard', () => {
  it('renders tasks in their status columns', () => {
    render(<KanbanBoard />);
    expect(within(column(/Backlog/)).getByText('Book venue')).toBeInTheDocument();
    expect(within(column(/In Progress/)).getByText('Write proposal')).toBeInTheDocument();
    expect(within(column(/Completed/)).getByText('Belum ada tugas')).toBeInTheDocument();
  });

  it('creates a task via the modal with the chosen column status', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    await user.click(within(column(/Review/)).getByRole('button', { name: /Add Task/ }));
    await user.type(screen.getByPlaceholderText('e.g., Design homepage mockup'), 'Print banners');
    await user.click(screen.getByRole('button', { name: 'Create Task' }));

    expect(addTask).toHaveBeenCalledTimes(1);
    expect(addTask.mock.calls[0][0]).toMatchObject({ title: 'Print banners', status: 'review', priority: 'Medium' });
    expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
  });

  it('filters tasks using the search bar', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    expect(screen.getByText('Book venue')).toBeInTheDocument();
    expect(screen.getByText('Write proposal')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search tasks...'), 'Book');

    expect(screen.getByText('Book venue')).toBeInTheDocument();
    expect(screen.queryByText('Write proposal')).not.toBeInTheDocument();
  });
});
