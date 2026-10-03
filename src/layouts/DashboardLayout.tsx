import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import KanbanBoard from '../components/KanbanBoard';
import MeetingRoom from '../components/MeetingRoom';
import TeamManagement from '../components/TeamManagement';
import SettingsComponent from '../components/Settings';
import ProjectsView from '../components/ProjectsView';
import CalendarView from '../components/CalendarView';
import DocumentsView from '../components/DocumentsView';
import { 
  LayoutDashboard, 
  CalendarDays, 
  CheckSquare, 
  Users, 
  Settings,
  Bell,
  Search,
  Plus,
  Play,
  FolderKanban,
  Calendar,
  FileText
} from 'lucide-react';

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { tasks, events, setupSubscriptions } = useAppStore();
  
  const activeTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const pendingApprovalsCount = tasks.filter(t => t.status === 'review').length;
  const upcomingMeetingsCount = events.length;
  
  const priorityTasks = tasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').slice(0, 3);

  React.useEffect(() => {
    setupSubscriptions();
  }, [setupSubscriptions]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            Workspace
          </h1>
          <p className="text-sm text-slate-500 mt-1">Milad 200</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<FolderKanban size={20}/>} label="Projects" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
          <NavItem icon={<CheckSquare size={20}/>} label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
          <NavItem icon={<CalendarDays size={20}/>} label="Meetings" active={activeTab === 'meetings'} onClick={() => setActiveTab('meetings')} />
          <NavItem icon={<Calendar size={20}/>} label="Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
          <NavItem icon={<FileText size={20}/>} label="Documents" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
          <NavItem icon={<Users size={20}/>} label="Team" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
        </nav>
        
        <div className="p-4 border-t border-slate-200">
          <NavItem icon={<Settings size={20}/>} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-2 w-96 border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20 transition-shadow">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search projects, tasks, or meetings..." 
              className="bg-transparent border-none outline-none ml-3 w-full text-sm placeholder-slate-400"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full text-white flex items-center justify-center font-semibold text-sm shadow-sm ring-2 ring-white">
              M
            </div>
          </div>
        </header>

        {/* Content Area */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto space-y-8">
              
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Good Morning, Mustofa!</h2>
                  <p className="text-slate-500 mt-1">Here is what's happening in your workspace today.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('meetings')}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <Plus size={18} />
                  New Meeting
                </button>
              </div>

              {/* Dashboard Stats */}
              <div className="grid grid-cols-3 gap-6">
                <StatCard title="Active Tasks" value={activeTasksCount.toString()} trend="In Progress" type="neutral" />
                <StatCard title="Pending Approvals" value={pendingApprovalsCount.toString()} trend="Needs Review" type="warning" />
                <StatCard title="Upcoming Meetings" value={upcomingMeetingsCount.toString()} trend="Scheduled" type="info" />
              </div>

              {/* AI Summary Banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 flex gap-6 items-center">
                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-600 flex-shrink-0">
                  <Play fill="currentColor" size={20} className="ml-1" />
                </div>
                <div>
                  <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                    <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">AI Transcript Ready</span>
                    Weekly Planning Meeting
                  </h3>
                  <p className="text-indigo-700/80 text-sm mt-1">
                    The AI has finished transcribing yesterday's meeting. 4 action items were identified.
                  </p>
                </div>
                <button className="ml-auto bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors shadow-sm">
                  Review Summary
                </button>
              </div>

              {/* Kanban Preview */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Priority Tasks</h3>
                  <button 
                    onClick={() => setActiveTab('tasks')}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    View Board &rarr;
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {priorityTasks.map(task => (
                    <TaskCard key={task.id} title={task.title} project={task.project} dueDate={task.dueDate} priority={task.priority} />
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <KanbanBoard />
        )}

        {activeTab === 'meetings' && (
          <MeetingRoom />
        )}

        {activeTab === 'team' && (
          <TeamManagement />
        )}

        {activeTab === 'projects' && (
          <ProjectsView />
        )}

        {activeTab === 'calendar' && (
          <CalendarView />
        )}

        {activeTab === 'documents' && (
          <DocumentsView />
        )}

        {activeTab === 'settings' && (
          <SettingsComponent />
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active 
          ? 'bg-primary-50 text-primary-700' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className={active ? 'text-primary-600' : 'text-slate-400'}>{icon}</div>
      {label}
    </button>
  );
}

function StatCard({ title, value, trend, type }: { title: string, value: string, trend: string, type: 'neutral' | 'warning' | 'info' }) {
  const colors = {
    neutral: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    warning: 'text-amber-600 bg-amber-50 border-amber-100',
    info: 'text-primary-600 bg-primary-50 border-primary-100'
  }
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h4 className="text-3xl font-bold text-slate-800 mt-2 mb-3">{value}</h4>
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colors[type]}`}>
        {trend}
      </span>
    </div>
  );
}

function TaskCard({ title, project, dueDate, priority }: { title: string, project: string, dueDate: string, priority: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{project}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
          priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
        }`}>
          {priority}
        </span>
      </div>
      <h4 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors mb-4">{title}</h4>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <CalendarDays size={14} />
        {dueDate}
      </div>
    </div>
  )
}


