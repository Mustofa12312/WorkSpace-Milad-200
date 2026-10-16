import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import CommandPalette from '../components/CommandPalette';
import DecisionLog from '../components/DecisionLog';
import AgendaView from '../components/AgendaView';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Users,
  Settings,
  Bell,
  Search,
  Plus,
  FolderKanban,
  Calendar,
  FileText,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Gavel,
  ListTodo,
} from 'lucide-react';

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { tasks, meetings, projects, currentUser, setCurrentUser, team, orgName, events } = useAppStore();
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Close profile/notif dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Dynamic dashboard stats
  const activeTasksCount = tasks.filter(t => t.status !== 'completed' && t.status !== 'backlog').length;
  const overdueTasksCount = tasks.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.dueDate || t.dueDate === 'No date') return false;
    const dateString = t.dueDate.includes('T') ? t.dueDate : `${t.dueDate}T23:59:59`;
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return false;
    return parsed < new Date();
  }).length;
  const upcomingMeetingsCount = meetings.filter(m => m.status === 'scheduled').length;
  const completedTasksPercent = tasks.length > 0
    ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
    : 0;
  const priorityTasks = tasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').slice(0, 3);
  const recentMeetings = meetings.filter(m => m.status === 'completed').slice(0, 2);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  // Unfinished Agendas (Meetings, Events, and Pending Tasks)
  const unfinishedAgendas = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'meeting' | 'task' | 'event';
      title: string;
      dateStr: string;
      dateObj: Date;
      time?: string;
      badge: { text: string; color: string };
      status?: string;
      detail?: string;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Pending / Ongoing Meetings
    meetings.forEach(m => {
      if (m.status === 'completed' || m.status === 'cancelled') return;
      const dateString = m.date.includes('T') ? m.date : `${m.date}T00:00:00`;
      const parsed = new Date(dateString);
      const dateObj = !isNaN(parsed.getTime()) ? parsed : new Date();
      const itemDate = new Date(dateObj);
      itemDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((itemDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let badge = { text: `${diffDays} Hari Lagi`, color: 'bg-indigo-100 text-indigo-700' };
      if (diffDays === 0) badge = { text: 'Hari Ini', color: 'bg-rose-100 text-rose-700' };
      else if (diffDays === 1) badge = { text: 'Besok', color: 'bg-amber-100 text-amber-700' };
      else if (diffDays < 0) badge = { text: 'Terlewat', color: 'bg-red-100 text-red-700' };

      items.push({
        id: `m-${m.id}`,
        type: 'meeting',
        title: m.title,
        dateStr: m.date,
        dateObj,
        time: m.startTime ? `${m.startTime} – ${m.endTime || ''}` : undefined,
        badge,
        status: m.status,
        detail: m.location || m.onlineMeetingUrl || 'Rapat Rencana',
      });
    });

    // 2. Events (from Calendar)
    events.forEach(e => {
      let dateObj = new Date();
      if (typeof e.date === 'string') {
        const parsed = new Date(e.date.includes('T') ? e.date : `${e.date}T00:00:00`);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }
      const itemDate = new Date(dateObj);
      itemDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((itemDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let badge = { text: `${diffDays} Hari Lagi`, color: 'bg-emerald-100 text-emerald-700' };
      if (diffDays === 0) badge = { text: 'Hari Ini', color: 'bg-rose-100 text-rose-700' };
      else if (diffDays === 1) badge = { text: 'Besok', color: 'bg-amber-100 text-amber-700' };
      else if (diffDays < 0) badge = { text: 'Terlewat', color: 'bg-slate-100 text-slate-600' };

      items.push({
        id: `e-${e.id}`,
        type: 'event',
        title: e.title,
        dateStr: typeof e.date === 'string' ? e.date : '',
        dateObj,
        time: e.time,
        badge,
        detail: e.location || e.personInCharge || 'Acara Organisasi',
      });
    });

    // 3. Incomplete Tasks with Due Dates
    tasks.forEach(t => {
      if (t.status === 'completed' || !t.dueDate || t.dueDate === 'No date') return;
      const due = (t.dueDate || '').trim().toLowerCase();
      let dateObj: Date;
      if (due === 'today' || due === 'hari ini') {
        dateObj = new Date();
      } else if (due === 'tomorrow' || due === 'besok') {
        dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + 1);
      } else if (due === 'lusa') {
        dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + 2);
      } else {
        const parsed = new Date(t.dueDate.includes('T') ? t.dueDate : `${t.dueDate}T00:00:00`);
        if (isNaN(parsed.getTime())) return;
        dateObj = parsed;
      }

      const itemDate = new Date(dateObj);
      itemDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((itemDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let badge = { text: `${diffDays} Hari Lagi`, color: 'bg-blue-100 text-blue-700' };
      if (diffDays === 0) badge = { text: 'Hari Ini', color: 'bg-rose-100 text-rose-700' };
      else if (diffDays === 1) badge = { text: 'Besok', color: 'bg-amber-100 text-amber-700' };
      else if (diffDays < 0) badge = { text: 'Terlewat', color: 'bg-red-100 text-red-700' };

      items.push({
        id: `t-${t.id}`,
        type: 'task',
        title: t.title,
        dateStr: t.dueDate,
        dateObj,
        badge,
        status: t.status,
        detail: `Tugas · PJ: ${t.assignee || 'Tim'}`,
      });
    });

    return items.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [meetings, events, tasks]);

  // Subscriptions are already started by App.tsx via setCurrentOrgId.
  // No duplicate setupSubscriptions call needed here.

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCmdOpen}
        onClose={() => setIsCmdOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
      />

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

        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden px-2">
          <NavItem collapsed={isSidebarCollapsed} icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
          <NavItem collapsed={isSidebarCollapsed} icon={<FolderKanban size={20} />} label="Proyek" active={activeTab === 'projects'} onClick={() => { setActiveTab('projects'); setIsSidebarOpen(false); }} />
          <NavItem collapsed={isSidebarCollapsed} icon={<CheckSquare size={20} />} label="Tugas" active={activeTab === 'tasks'} onClick={() => { setActiveTab('tasks'); setIsSidebarOpen(false); }} />
          <NavItem collapsed={isSidebarCollapsed} icon={<CalendarDays size={20} />} label="Rapat" active={activeTab === 'meetings'} onClick={() => { setActiveTab('meetings'); setIsSidebarOpen(false); }} badge={upcomingMeetingsCount > 0 ? upcomingMeetingsCount : undefined} />
          <NavItem collapsed={isSidebarCollapsed} icon={<Gavel size={20} />} label="Keputusan" active={activeTab === 'decisions'} onClick={() => { setActiveTab('decisions'); setIsSidebarOpen(false); }} />
          <NavItem collapsed={isSidebarCollapsed} icon={<Calendar size={20} />} label="Kalender" active={activeTab === 'calendar'} onClick={() => { setActiveTab('calendar'); setIsSidebarOpen(false); }} badge={events.length > 0 ? events.length : undefined} />
          <NavItem collapsed={isSidebarCollapsed} icon={<ListTodo size={20} />} label="Agenda" active={activeTab === 'agenda'} onClick={() => { setActiveTab('agenda'); setIsSidebarOpen(false); }} />
          <NavItem collapsed={isSidebarCollapsed} icon={<FileText size={20} />} label="Dokumen" active={activeTab === 'documents'} onClick={() => { setActiveTab('documents'); setIsSidebarOpen(false); }} />
          <NavItem collapsed={isSidebarCollapsed} icon={<Users size={20} />} label="Tim" active={activeTab === 'team'} onClick={() => { setActiveTab('team'); setIsSidebarOpen(false); }} />
        </nav>

        <div className="p-2 border-t border-slate-200 flex flex-col gap-1">
          <NavItem collapsed={isSidebarCollapsed} icon={<Settings size={20} />} label="Pengaturan" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} />
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mt-1"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            {/* Search bar / Command palette trigger */}
            <button
              onClick={() => setIsCmdOpen(true)}
              className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200 rounded-xl px-4 py-2.5 border border-slate-200 transition-all w-64 md:w-96 text-left focus:ring-2 focus:ring-primary-500/20 outline-none"
            >
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-400 flex-1">Cari atau ketik perintah...</span>
              <kbd className="hidden md:block text-[10px] text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick action */}
            <button
              onClick={() => setIsCmdOpen(true)}
              className="hidden md:flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={15} /> Buat Baru
            </button>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <Bell size={20} />
                {(upcomingMeetingsCount > 0 || overdueTasksCount > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Notifikasi</p>
                  </div>
                  {overdueTasksCount > 0 && (
                    <button onClick={() => { setActiveTab('tasks'); setIsNotifOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                      <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><CheckSquare size={14} className="text-red-600" /></span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{overdueTasksCount} tugas terlambat</p>
                        <p className="text-xs text-slate-500">Perlu segera ditindaklanjuti</p>
                      </div>
                    </button>
                  )}
                  {upcomingMeetingsCount > 0 && (
                    <button onClick={() => { setActiveTab('meetings'); setIsNotifOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                      <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><CalendarDays size={14} className="text-blue-600" /></span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{upcomingMeetingsCount} rapat terjadwal</p>
                        <p className="text-xs text-slate-500">Rapat yang akan datang</p>
                      </div>
                    </button>
                  )}
                  {overdueTasksCount === 0 && upcomingMeetingsCount === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                      <Bell size={24} className="mx-auto mb-2 text-slate-200" />
                      Tidak ada notifikasi baru
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
                className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 rounded-full pr-3 transition-colors border border-transparent hover:border-slate-200 focus:outline-none"
              >
                <img
                  src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=6366f1&color=fff`}
                  alt="User"
                  className="w-8 h-8 rounded-full border border-slate-200"
                />
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-slate-700 leading-tight">{currentUser?.name || 'User'}</div>
                  <div className="text-xs text-slate-500">{myRole}</div>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
                    <p className="text-sm font-semibold text-slate-800">{currentUser?.name || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                  </div>
                  <button onClick={() => { setActiveTab('settings'); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Pengaturan</button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">Keluar</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 pb-24 md:pb-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">

              {/* Greeting */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                    {greeting()}, {currentUser?.name?.split(' ')[0] || 'Selamat Datang'}! 👋
                  </h2>
                  <p className="text-slate-500 mt-1 text-sm md:text-base">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('meetings')}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 self-start md:self-auto"
                >
                  <Plus size={18} /> Rapat Baru
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <StatCard
                  title="Tugas Aktif"
                  value={activeTasksCount}
                  icon={<CheckSquare size={20} className="text-primary-500" />}
                  color="primary"
                  onClick={() => setActiveTab('tasks')}
                />
                <StatCard
                  title="Agenda"
                  value={unfinishedAgendas.length}
                  icon={<ListTodo size={20} className="text-purple-500" />}
                  color="purple"
                  onClick={() => setActiveTab('agenda')}
                />
                <StatCard
                  title="Rapat Terjadwal"
                  value={upcomingMeetingsCount}
                  icon={<CalendarDays size={20} className="text-indigo-500" />}
                  color="indigo"
                  onClick={() => setActiveTab('meetings')}
                />
                <StatCard
                  title="Proyek Aktif"
                  value={projects.filter(p => p.status === 'Active' || p.status === 'Planning').length}
                  icon={<FolderKanban size={20} className="text-emerald-500" />}
                  color="emerald"
                  onClick={() => setActiveTab('projects')}
                />
                <StatCard
                  title="Selesai"
                  value={`${completedTasksPercent}%`}
                  icon={<TrendingUp size={20} className="text-amber-500" />}
                  color="amber"
                  onClick={() => setActiveTab('tasks')}
                  className="col-span-2 sm:col-span-1"
                  horizontalOnMobile
                />
              </div>

              {/* ─── Agenda Belum Selesai (Baru untuk Dashboard) ─── */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-xs">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600 flex-shrink-0">
                      <ListTodo size={17} />
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-bold text-slate-800 leading-tight">
                        Agenda Belum Selesai
                      </h3>
                      <p className="text-[11px] md:text-xs text-slate-500 mt-0.5">
                        Jadwal rapat mendatang, kegiatan acara, dan tugas prioritas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('agenda')}
                    className="text-xs md:text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 group flex-shrink-0"
                  >
                    Lihat Semua <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {unfinishedAgendas.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <Sparkles size={24} className="mx-auto mb-1.5 text-emerald-500" />
                    <p className="font-bold text-slate-700 text-xs md:text-sm">Semua agenda telah selesai! 🎉</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tidak ada agenda atau rapat tertunda saat ini.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3">
                    {unfinishedAgendas.slice(0, 6).map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.type === 'meeting') setActiveTab('meetings');
                          else if (item.type === 'task') setActiveTab('tasks');
                          else setActiveTab('agenda');
                        }}
                        className="p-3 md:p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-primary-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className={cn('text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', item.badge.color)}>
                              {item.badge.text}
                            </span>
                            <span className="text-[10px] md:text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                              {item.type === 'meeting' && <CalendarDays size={11} className="text-rose-500" />}
                              {item.type === 'event' && <Calendar size={11} className="text-emerald-500" />}
                              {item.type === 'task' && <CheckSquare size={11} className="text-indigo-500" />}
                              {item.type === 'meeting' ? 'Rapat' : item.type === 'event' ? 'Acara' : 'Tugas'}
                            </span>
                          </div>
                          <h4 className="font-semibold text-slate-800 text-xs md:text-sm line-clamp-1 group-hover:text-primary-600 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {item.detail}
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] md:text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 truncate max-w-[80%]">
                            <Clock size={11} className="flex-shrink-0" /> {item.time || item.dateStr}
                          </span>
                          <span className="text-primary-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            Buka →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Priority tasks */}
                <div className="lg:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Tugas Prioritas</h3>
                    <button onClick={() => setActiveTab('tasks')} className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                      Lihat Semua <ArrowRight size={14} />
                    </button>
                  </div>
                  {priorityTasks.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                      <CheckSquare size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">Belum ada tugas dengan prioritas tinggi.</p>
                      <button onClick={() => setActiveTab('tasks')} className="mt-3 text-sm text-primary-600 hover:underline font-medium">+ Tambah Tugas</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {priorityTasks.map(task => (
                        <div key={task.id} onClick={() => setActiveTab('tasks')}
                          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex items-center gap-4">
                          <div className={cn('w-2 h-8 rounded-full flex-shrink-0',
                            task.priority === 'Urgent' ? 'bg-red-500' : 'bg-orange-400'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-primary-600 transition-colors">{task.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{task.project} · {task.status.replace('_', ' ')}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock size={12} /> {task.dueDate}
                              </span>
                            )}
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                              task.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            )}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side: meetings + quick actions */}
                <div className="space-y-5">
                  {/* Recent / upcoming meetings */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-base font-bold text-slate-800">Rapat Terbaru</h3>
                      <button onClick={() => setActiveTab('meetings')} className="text-xs font-medium text-primary-600 hover:text-primary-700">Semua →</button>
                    </div>
                    {meetings.length === 0 ? (
                      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-5 text-center">
                        <Calendar size={24} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-500 text-xs">Belum ada rapat dijadwalkan.</p>
                        <button onClick={() => setActiveTab('meetings')} className="mt-2 text-xs text-primary-600 hover:underline font-medium">Buat Rapat →</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {meetings.slice(0, 3).map(m => (
                          <div key={m.id} onClick={() => setActiveTab('meetings')}
                            className="bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">{m.title}</p>
                              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase',
                                m.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              )}>{m.status}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                              <Calendar size={10} />
                              {(() => {
                                const d = m.date ? new Date(m.date.includes('T') ? m.date : `${m.date}T00:00:00`) : null;
                                return d && !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : (m.date || '-');
                              })()} · {m.startTime}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick actions panel */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2"><Sparkles size={14} /> Aksi Cepat</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Buat Tugas Baru', tab: 'tasks', icon: <CheckSquare size={13} /> },
                        { label: 'Buat Rapat', tab: 'meetings', icon: <CalendarDays size={13} /> },
                        { label: 'Unggah Dokumen', tab: 'documents', icon: <FileText size={13} /> },
                      ].map(a => (
                        <button key={a.tab} onClick={() => setActiveTab(a.tab)}
                          className="w-full flex items-center gap-2.5 text-left px-3 py-2 bg-white/70 hover:bg-white rounded-lg text-sm text-indigo-800 font-medium transition-all group">
                          <span className="text-indigo-500">{a.icon}</span>
                          {a.label}
                          <ArrowRight size={12} className="ml-auto text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI Summary reminder */}
                  {recentMeetings.length > 0 && !recentMeetings[0].summary && (
                    <div className="bg-white border border-amber-100 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Ringkasan AI Belum Dibuat</p>
                          <p className="text-xs text-slate-500 mt-0.5">{recentMeetings[0].title}</p>
                          <button onClick={() => setActiveTab('meetings')} className="mt-2 text-xs text-primary-600 font-medium hover:underline">
                            Buat Ringkasan →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'tasks' && <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0"><KanbanBoard /></div>}
        {activeTab === 'meetings' && <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0"><MeetingRoom /></div>}
        {activeTab === 'team' && <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0"><TeamManagement /></div>}
        {activeTab === 'projects' && <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0"><ProjectsView /></div>}
        {activeTab === 'decisions' && <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0"><DecisionLog onNavigate={setActiveTab} /></div>}
        {activeTab === 'calendar' && <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0"><CalendarView /></div>}
        {activeTab === 'agenda' && <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0"><AgendaView /></div>}
        {activeTab === 'documents' && <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0"><DocumentsView /></div>}
        {activeTab === 'settings' && <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0"><SettingsComponent /></div>}

        {/* ─── Mobile Bottom Navigation Bar (md:hidden) ─── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around safe-area-bottom">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
              activeTab === 'dashboard' ? 'text-primary-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            )}
          >
            <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-2'} />
            <span className="text-[10px] mt-0.5">Beranda</span>
            {activeTab === 'dashboard' && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-600" />}
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
              activeTab === 'tasks' ? 'text-primary-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            )}
          >
            <div className="relative">
              <CheckSquare size={20} className={activeTab === 'tasks' ? 'stroke-[2.5]' : 'stroke-2'} />
              {activeTasksCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </div>
            <span className="text-[10px] mt-0.5">Tugas</span>
            {activeTab === 'tasks' && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-600" />}
          </button>

          <button
            onClick={() => setActiveTab('meetings')}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
              activeTab === 'meetings' ? 'text-primary-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            )}
          >
            <div className="relative">
              <CalendarDays size={20} className={activeTab === 'meetings' ? 'stroke-[2.5]' : 'stroke-2'} />
              {upcomingMeetingsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] mt-0.5">Rapat</span>
            {activeTab === 'meetings' && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-600" />}
          </button>

          <button
            onClick={() => setActiveTab('agenda')}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
              activeTab === 'agenda' ? 'text-primary-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            )}
          >
            <div className="relative">
              <ListTodo size={20} className={activeTab === 'agenda' ? 'stroke-[2.5]' : 'stroke-2'} />
              {unfinishedAgendas.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </div>
            <span className="text-[10px] mt-0.5">Agenda</span>
            {activeTab === 'agenda' && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-600" />}
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
              activeTab === 'projects' ? 'text-primary-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            )}
          >
            <FolderKanban size={20} className={activeTab === 'projects' ? 'stroke-[2.5]' : 'stroke-2'} />
            <span className="text-[10px] mt-0.5">Proyek</span>
            {activeTab === 'projects' && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-600" />}
          </button>
        </nav>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, collapsed, onClick, badge }: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'w-full flex items-center rounded-xl text-sm transition-all relative outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5',
        active ? 'bg-indigo-50/80 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
      )}
    >
      {active && !collapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-md" />
      )}
      <div className={active ? 'text-indigo-600' : 'text-slate-400'}>{icon}</div>
      {!collapsed && <span className="truncate flex-1 text-left">{label}</span>}
      {!collapsed && badge && badge > 0 && (
        <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  onClick,
  className,
  horizontalOnMobile,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose';
  onClick: () => void;
  className?: string;
  horizontalOnMobile?: boolean;
}) {
  const bg = {
    primary: 'bg-primary-50 border-primary-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    purple: 'bg-purple-50 border-purple-100',
    rose: 'bg-rose-50 border-rose-100',
  }[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left p-4 md:p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all group cursor-pointer w-full',
        bg,
        className
      )}
    >
      {horizontalOnMobile ? (
        <div className="flex items-center justify-between sm:block">
          <div className="flex items-center gap-3 sm:block">
            <div className="mb-0 sm:mb-3">{icon}</div>
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-600">{title}</p>
              <span className="text-[11px] text-slate-400 sm:hidden">Tingkat penyelesaian tugas</span>
            </div>
          </div>
          <h4 className="text-2xl md:text-3xl font-bold text-slate-800 sm:mt-1">{value}</h4>
        </div>
      ) : (
        <>
          <div className="mb-2.5 md:mb-3">{icon}</div>
          <p className="text-xs md:text-sm font-medium text-slate-600 truncate">{title}</p>
          <h4 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{value}</h4>
        </>
      )}
    </button>
  );
}
