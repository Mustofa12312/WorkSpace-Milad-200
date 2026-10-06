import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Task, Meeting, Event } from '../types';
import { format, differenceInDays, isTomorrow, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarClock, CheckSquare, CalendarDays, Calendar as CalendarIcon, Clock, MapPin, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type UnifiedAgendaItem = {
  id: string;
  sourceType: 'task' | 'meeting' | 'event';
  title: string;
  dateStr: string;
  dateObj: Date;
  timeStr?: string;
  status?: string;
  location?: string;
  person?: string;
  raw: Task | Meeting | Event;
};

export default function AgendaView() {
  const { tasks, meetings, events } = useAppStore();
  const [filterType, setFilterType] = useState<'all' | 'task' | 'meeting' | 'event'>('all');

  const unifiedItems: UnifiedAgendaItem[] = useMemo(() => {
    const items: UnifiedAgendaItem[] = [];

    // Process Tasks
    tasks.forEach(t => {
      if (t.status === 'completed' || !t.dueDate) return;
      // Some dates might be "Today", "Oct 15", or YYYY-MM-DD. Let's try to parse YYYY-MM-DD
      // Mock data uses string like "2023-10-15" or simple formats.
      let dateObj = new Date();
      if (t.dueDate === 'Today') {
         dateObj = new Date();
      } else if (t.dueDate === 'Tomorrow') {
         dateObj = new Date();
         dateObj.setDate(dateObj.getDate() + 1);
      } else {
         const parsed = new Date(t.dueDate);
         if (!isNaN(parsed.getTime())) dateObj = parsed;
      }
      
      items.push({
        id: `task-${t.id}`,
        sourceType: 'task',
        title: t.title,
        dateStr: t.dueDate,
        dateObj,
        status: t.status,
        person: t.assignee,
        raw: t
      });
    });

    // Process Meetings
    meetings.forEach(m => {
      if (m.status === 'completed' || m.status === 'cancelled') return;
      const parsed = new Date(m.date);
      items.push({
        id: `meeting-${m.id}`,
        sourceType: 'meeting',
        title: m.title,
        dateStr: m.date,
        dateObj: !isNaN(parsed.getTime()) ? parsed : new Date(),
        timeStr: m.startTime,
        location: m.location || m.onlineMeetingUrl,
        person: m.organizer,
        status: m.status,
        raw: m
      });
    });

    // Process Events
    events.forEach(e => {
      let dateObj = new Date();
      if (typeof e.date === 'string') {
        const parsed = new Date(e.date);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      } else {
        dateObj.setDate(e.date as number);
      }

      items.push({
        id: `event-${e.id}`,
        sourceType: 'event',
        title: e.title,
        dateStr: typeof e.date === 'string' ? e.date : format(dateObj, 'yyyy-MM-dd'),
        dateObj,
        timeStr: e.time,
        location: e.location,
        person: e.personInCharge,
        raw: e
      });
    });

    return items.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [tasks, meetings, events]);

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return unifiedItems;
    return unifiedItems.filter(item => item.sourceType === filterType);
  }, [unifiedItems, filterType]);

  const getDaysBadge = (dateObj: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(dateObj);
    itemDate.setHours(0, 0, 0, 0);

    if (isSameDay(itemDate, today)) {
      return <span className="px-3 py-1 bg-amber-100 text-amber-700 font-bold rounded-full text-xs">Hari Ini</span>;
    }
    
    if (isTomorrow(itemDate)) {
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-full text-xs">Besok</span>;
    }

    if (itemDate < today) {
      return <span className="px-3 py-1 bg-slate-100 text-slate-500 font-bold rounded-full text-xs">Terlewat</span>;
    }

    const diff = differenceInDays(itemDate, today);
    return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-full text-xs">{diff} Hari Lagi</span>;
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare size={16} className="text-indigo-600" />;
      case 'meeting': return <CalendarDays size={16} className="text-rose-600" />;
      case 'event': return <CalendarIcon size={16} className="text-emerald-600" />;
      default: return <Clock size={16} />;
    }
  };

  const getSourceLabel = (type: string) => {
    switch (type) {
      case 'task': return 'Tugas';
      case 'meeting': return 'Rapat';
      case 'event': return 'Acara';
      default: return 'Lainnya';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-50/50 p-4 md:p-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 md:mb-8 flex-shrink-0 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Agenda & Jadwal</h2>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Pantau semua tugas, rapat, dan acara Anda dari satu tempat.</p>
          </div>
          <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl overflow-x-auto custom-scrollbar">
            {(['all', 'task', 'meeting', 'event'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  filterType === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {f === 'all' ? 'Semua' : getSourceLabel(f)}
              </button>
            ))}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 border-dashed rounded-2xl">
              <CalendarClock size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Belum Ada Jadwal</h3>
              <p className="text-slate-500">Tidak ada tugas, rapat, atau acara mendatang.</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("p-1.5 rounded-lg flex items-center justify-center", 
                      item.sourceType === 'task' ? "bg-indigo-50" : 
                      item.sourceType === 'meeting' ? "bg-rose-50" : "bg-emerald-50"
                    )}>
                      {getSourceIcon(item.sourceType)}
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{getSourceLabel(item.sourceType)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">{item.title}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5"><CalendarIcon size={14} className="text-slate-400" /> {format(item.dateObj, 'dd MMM yyyy', { locale: id })}</div>
                    {item.timeStr && (
                      <div className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" /> {item.timeStr}</div>
                    )}
                    {item.person && (
                      <div className="flex items-center gap-1.5"><User size={14} className="text-slate-400" /> <span className="truncate max-w-[120px]">{item.person}</span></div>
                    )}
                    {item.location && (
                      <div className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> <span className="truncate max-w-[120px]">{item.location}</span></div>
                    )}
                  </div>
                </div>
                <div className="flex items-center md:items-start justify-between md:flex-col shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                  <div className="flex items-center h-full">
                    {getDaysBadge(item.dateObj)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
