import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
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
  FileText,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { tasks, events, setupSubscriptions, currentUser, setCurrentUser, team, orgName } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      navigate('/auth');
    } catch (e) {
      console.error(e);
    }
  };

  const myRole = team.find(t => t.id === currentUser?.id)?.role || 'Member';
  
  const activeTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const pendingApprovalsCount = tasks.filter(t => t.status === 'review').length;
  const upcomingMeetingsCount = events.length;
  
  const priorityTasks = tasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').slice(0, 3);

  React.useEffect(() => {
    setupSubscriptions();
  }, [setupSubscriptions]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 flex flex-col absolute inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
        isSidebarCollapsed ? "md:w-20" : "md:w-64"
      )}>
        <div className={cn("p-6 border-b border-slate-200 flex items-center h-20 transition-all", isSidebarCollapsed ? "justify-center px-2" : "justify-between")}>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                Workspace
              </h1>
              <p className="text-sm text-slate-500 mt-1 truncate">{orgName}</p>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
              W
            </div>
          )}
          <button className="md:hidden p-1 text-slate-400 hover:text-slate-600" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          <NavItem collapsed={isSidebarCollapsed} icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false)}} />
          <NavItem collapsed={isSidebarCollapsed} icon={<FolderKanban size={20}/>} label="Projects" active={activeTab === 'projects'} onClick={() => {setActiveTab('projects'); setIsSidebarOpen(false)}} />
          <NavItem collapsed={isSidebarCollapsed} icon={<CheckSquare size={20}/>} label="Tasks" active={activeTab === 'tasks'} onClick={() => {setActiveTab('tasks'); setIsSidebarOpen(false)}} />
          <NavItem collapsed={isSidebarCollapsed} icon={<CalendarDays size={20}/>} label="Meetings" active={activeTab === 'meetings'} onClick={() => {setActiveTab('meetings'); setIsSidebarOpen(false)}} />
          <NavItem collapsed={isSidebarCollapsed} icon={<Calendar size={20}/>} label="Calendar" active={activeTab === 'calendar'} onClick={() => {setActiveTab('calendar'); setIsSidebarOpen(false)}} />
          <NavItem collapsed={isSidebarCollapsed} icon={<FileText size={20}/>} label="Documents" active={activeTab === 'documents'} onClick={() => {setActiveTab('documents'); setIsSidebarOpen(false)}} />
          <NavItem collapsed={isSidebarCollapsed} icon={<Users size={20}/>} label="Team" active={activeTab === 'team'} onClick={() => {setActiveTab('team'); setIsSidebarOpen(false)}} />
        </nav>
        
        <div className="p-4 border-t border-slate-200 flex flex-col gap-2">
          <NavItem collapsed={isSidebarCollapsed} icon={<Settings size={20}/>} label="Settings" active={activeTab === 'settings'} onClick={() => {setActiveTab('settings'); setIsSidebarOpen(false)}} />
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mt-2"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2 w-96 border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20 transition-shadow">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search projects, tasks, or meetings..." 
                className="bg-transparent border-none outline-none ml-3 w-full text-sm placeholder-slate-400"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-full pr-4 transition-colors border border-transparent hover:border-slate-200 focus:outline-none"
              >
                <img 
                  src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name || 'User'}&background=0ea5e9&color=fff`} 
                  alt="User" 
                  className="w-8 h-8 rounded-full border border-slate-200"
                />
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-slate-700">{currentUser?.name || 'User'}</div>
                  <div className="text-xs text-slate-500">{myRole}</div>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <p className="text-sm font-semibold text-slate-800">{currentUser?.name || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                  </div>
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">My Profile</button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">Log out</button>
                </div>
              )}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

function NavItem({ icon, label, active, collapsed, onClick }: { icon: React.ReactNode, label: string, active?: boolean, collapsed?: boolean, onClick: () => void }) {
  return (
    <div className="px-3">
      <button 
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl text-sm transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          active 
            ? 'bg-indigo-50/80 text-indigo-700 font-bold' 
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
        }`}
      >
        {active && !collapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-md"></div>
        )}
        <div className={active ? 'text-indigo-600' : 'text-slate-400'}>{icon}</div>
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    </div>
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


