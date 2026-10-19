import { useState, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Clock, LayoutGrid, List, MapPin, User, Tag, 
  Pencil, Calendar as CalendarIcon, Trash2, X, CalendarDays, CheckSquare, ArrowRight, FolderKanban
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, isSameMonth, isSameDay, addWeeks, subWeeks
} from 'date-fns';
import { id } from 'date-fns/locale';
import { useAppStore, type Event, type Meeting, type Task } from '../store/useAppStore';
import { parseAnyDate, parseDueDateParts } from '../lib/dateUtils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export type CalendarSourceType = 'event' | 'meeting' | 'task';

export interface UnifiedCalendarItem {
  id: string;
  sourceType: CalendarSourceType;
  title: string;
  dateStr: string;
  dateObj: Date;
  timeStr: string;
  type: string;
  person?: string;
  location?: string;
  color: string;
  rawEvent?: Event;
  rawMeeting?: Meeting;
  rawTask?: Task;
}

interface CalendarViewProps {
  onNavigate?: (tab: string) => void;
}

export default function CalendarView({ onNavigate }: CalendarViewProps) {
  const { events, addEvent, updateEvent, deleteEvent, meetings, tasks } = useAppStore();

  const formatTimeTo24H = (timeStr?: string) => {
    if (!timeStr) return '10:00';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = match[3]?.toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return timeStr.slice(0, 5);
  };

  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit' | 'view'>('closed');
  const [selectedItem, setSelectedItem] = useState<UnifiedCalendarItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'event' | 'meeting' | 'task'>('all');
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '10:00', type: 'Rapat', personInCharge: '', location: '' });
  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const parseEventDate = useCallback((dateVal: string | number) => {
    if (typeof dateVal === 'number') {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), dateVal);
    }
    return new Date(dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`);
  }, [currentDate]);

  // Build unified calendar items combining Events, Meetings, and Tasks
  const allCalendarItems: UnifiedCalendarItem[] = useMemo(() => {
    const list: UnifiedCalendarItem[] = [];

    // 1. Events
    events.forEach(evt => {
      const dObj = parseEventDate(evt.date);
      if (isNaN(dObj.getTime())) return;
      list.push({
        id: `evt-${evt.id}`,
        sourceType: 'event',
        title: evt.title,
        dateStr: typeof evt.date === 'string' ? evt.date : format(dObj, 'yyyy-MM-dd'),
        dateObj: dObj,
        timeStr: evt.time || '10:00',
        type: evt.type || 'Acara',
        person: evt.personInCharge,
        location: evt.location,
        color: evt.color || 'bg-emerald-50 text-emerald-700 border-emerald-200',
        rawEvent: evt
      });
    });

    // 2. Meetings
    meetings.forEach(m => {
      if (m.status === 'cancelled') return;
      const dateString = m.date.includes('T') ? m.date : `${m.date}T00:00:00`;
      const parsed = new Date(dateString);
      const dObj = !isNaN(parsed.getTime()) ? parsed : new Date();
      list.push({
        id: `mtg-${m.id}`,
        sourceType: 'meeting',
        title: m.title,
        dateStr: m.date,
        dateObj: dObj,
        timeStr: m.startTime || '10:00',
        type: m.type ? `Rapat ${m.type}` : 'Rapat',
        person: m.organizer,
        location: m.location || m.onlineMeetingUrl,
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        rawMeeting: m
      });
    });

    // 3. Tasks with Due Date
    tasks.forEach(t => {
      if (t.status === 'completed' || !t.dueDate || t.dueDate === 'No date') return;
      const dObj = parseAnyDate(t.dueDate);
      if (!dObj || isNaN(dObj.getTime())) return;

      const { time } = parseDueDateParts(t.dueDate);
      list.push({
        id: `tsk-${t.id}`,
        sourceType: 'task',
        title: t.title,
        dateStr: t.dueDate,
        dateObj: dObj,
        timeStr: time || '23:59',
        type: t.priority ? `Tugas (${t.priority})` : 'Tugas',
        person: t.assignee,
        location: t.project,
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        rawTask: t
      });
    });

    return list;
  }, [events, meetings, tasks, parseEventDate]);

  const filteredCalendarItems = useMemo(() => {
    if (categoryFilter === 'all') return allCalendarItems;
    return allCalendarItems.filter(item => item.sourceType === categoryFilter);
  }, [allCalendarItems, categoryFilter]);

  const openNewEventModal = () => {
    setSelectedItem(null);
    setNewEvent({ title: '', date: format(currentDate, 'yyyy-MM-dd'), time: '10:00', type: 'Rapat', personInCharge: '', location: '' });
    setModalMode('create');
  };

  const handleItemClick = (item: UnifiedCalendarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setModalMode('view');
  };

  const handleEditClick = () => {
    if (!selectedItem || selectedItem.sourceType !== 'event' || !selectedItem.rawEvent) return;
    const evt = selectedItem.rawEvent;
    const dateStr = typeof evt.date === 'string' 
      ? evt.date 
      : format(new Date(currentDate.getFullYear(), currentDate.getMonth(), evt.date), 'yyyy-MM-dd');
    setNewEvent({
      title: evt.title,
      date: dateStr,
      time: formatTimeTo24H(evt.time),
      type: evt.type || 'Rapat',
      personInCharge: evt.personInCharge || '',
      location: evt.location || ''
    });
    setModalMode('edit');
  };

  const getFormattedDate = (dateObj: Date) => {
    if (isNaN(dateObj.getTime())) return '';
    return format(dateObj, 'dd MMMM yyyy', { locale: id });
  };

  const handleNewEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || newEvent.title.trim() === '') return;
    
    const evtColor = (newEvent.type.toLowerCase().includes('rapat') || newEvent.type.toLowerCase().includes('meeting')) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

    if (modalMode === 'edit' && selectedItem?.rawEvent && updateEvent) {
      updateEvent(selectedItem.rawEvent.id, {
        title: newEvent.title,
        date: newEvent.date,
        time: newEvent.time,
        type: newEvent.type,
        personInCharge: newEvent.personInCharge,
        location: newEvent.location,
        color: evtColor
      });
    } else {
      addEvent({
        id: `evt-${Date.now()}`,
        title: newEvent.title,
        date: newEvent.date,
        time: newEvent.time,
        type: newEvent.type,
        personInCharge: newEvent.personInCharge,
        location: newEvent.location,
        color: evtColor
      });
    }
    
    setModalMode('closed');
    setSelectedItem(null);
    setNewEvent({ title: '', date: '', time: '10:00', type: 'Rapat', personInCharge: '', location: '' });
  };

  const prevPeriod = () => {
    setCurrentDate(viewType === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const nextPeriod = () => {
    setCurrentDate(viewType === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const generateCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      const formattedDate = format(day, dateFormat);
      const dayItems = filteredCalendarItems.filter(item => isSameDay(item.dateObj, day));

      days.push({
        date: day,
        day: formattedDate,
        current: isSameMonth(day, monthStart),
        isToday: isSameDay(day, new Date()),
        items: dayItems
      });
      day = addDays(day, 1);
    }
    
    while (days.length < 35) {
      const formattedDate = format(day, dateFormat);
      days.push({
        date: day,
        day: formattedDate,
        current: isSameMonth(day, monthStart),
        isToday: isSameDay(day, new Date()),
        items: []
      });
      day = addDays(day, 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendar();
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i);
    const dayItems = filteredCalendarItems.filter(item => isSameDay(item.dateObj, day));
    return {
      date: day,
      day: format(day, 'd'),
      isToday: isSameDay(day, new Date()),
      items: dayItems
    };
  });

  const renderItemIcon = (sourceType: CalendarSourceType) => {
    switch (sourceType) {
      case 'meeting':
        return <CalendarDays size={11} className="shrink-0 text-rose-600" />;
      case 'task':
        return <CheckSquare size={11} className="shrink-0 text-indigo-600" />;
      case 'event':
      default:
        return <CalendarIcon size={11} className="shrink-0 text-emerald-600" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-4 md:p-8 overflow-hidden">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 md:mb-8 flex-shrink-0 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Kalender</h2>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Jadwal acara, rapat tim, dan tenggat tugas terpadu.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-3 mr-0 md:mr-4 text-slate-700 font-bold md:text-xl w-full md:w-auto justify-between md:justify-start bg-white md:bg-transparent p-2 md:p-0 rounded-xl border border-slate-200 md:border-none">
              <button onClick={prevPeriod} className="p-2 hover:bg-slate-100 md:hover:bg-slate-200 rounded-lg md:rounded-full transition-colors"><ChevronLeft size={20} /></button>
              <span className="text-sm md:text-xl">{format(currentDate, viewType === 'month' ? 'MMMM yyyy' : "'Minggu 'w', 'yyyy", { locale: id })}</span>
              <button onClick={nextPeriod} className="p-2 hover:bg-slate-100 md:hover:bg-slate-200 rounded-lg md:rounded-full transition-colors"><ChevronRight size={20} /></button>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="flex bg-slate-200/50 p-1 rounded-xl">
                <button 
                  onClick={() => setViewType('month')}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all", viewType === 'month' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                  <LayoutGrid size={16} /> <span className="hidden md:inline">Bulan</span>
                </button>
                <button 
                  onClick={() => setViewType('week')}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all", viewType === 'week' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                  <List size={16} /> <span className="hidden md:inline">Minggu</span>
                </button>
              </div>

              <button 
                onClick={openNewEventModal}
                className="flex-1 md:flex-none bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl md:rounded-full font-medium flex items-center justify-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <Plus size={18} />
                <span className="hidden md:inline">Acara Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 flex-shrink-0 custom-scrollbar">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Tampilkan:</span>
          {(['all', 'event', 'meeting', 'task'] as const).map(cat => {
            const count = cat === 'all' 
              ? allCalendarItems.length 
              : allCalendarItems.filter(i => i.sourceType === cat).length;
            const labels = { all: 'Semua', event: 'Acara', meeting: 'Rapat', task: 'Tugas' };
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 border",
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                {cat === 'event' && <CalendarIcon size={12} className={isActive ? "text-emerald-300" : "text-emerald-600"} />}
                {cat === 'meeting' && <CalendarDays size={12} className={isActive ? "text-rose-300" : "text-rose-600"} />}
                {cat === 'task' && <CheckSquare size={12} className={isActive ? "text-indigo-300" : "text-indigo-600"} />}
                <span>{labels[cat]}</span>
                <span className={cn("px-1.5 py-0.2 rounded-full text-[10px]", isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Calendar Content */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
          
          {viewType === 'month' ? (
            <>
              {/* Days Header */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
                {DAYS.map(day => (
                  <div key={day} className="py-2 md:py-3 text-center text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                    <span className="hidden md:inline">{day}</span>
                    <span className="md:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 grid-rows-5 flex-1 bg-slate-200 gap-px">
                {calendarDays.slice(0, 35).map((d, i) => (
                  <div key={i} className={cn("bg-white p-1 md:p-2 flex flex-col overflow-hidden hover:bg-slate-50 transition-colors cursor-pointer", !d.current && "bg-slate-50/50 text-slate-400")}>
                    <div className="flex justify-between items-start md:mb-2">
                      <span className={cn("text-xs md:text-sm font-bold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full", d.isToday ? "bg-primary-600 text-white shadow-sm" : d.current ? "text-slate-700" : "")}>
                        {d.day}
                      </span>
                    </div>
                    
                    <div className="flex-1 space-y-1 md:space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                      {d.items.map((item, idx) => (
                        <div key={idx} onClick={(e) => handleItemClick(item, e)} className={cn("px-1.5 md:px-2 py-1 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-medium border truncate cursor-pointer hover:shadow-sm hover:brightness-95 transition-all flex flex-col gap-0.5", item.color)}>
                          <div className="font-bold truncate flex items-center gap-1">
                            {renderItemIcon(item.sourceType)}
                            <span className="truncate">{item.title}</span>
                          </div>
                          <div className="hidden md:flex text-[10px] opacity-80 items-center gap-1">
                            <Clock size={10} /> {item.timeStr}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            // Weekly View
            <div className="flex-1 flex overflow-hidden">
              <div className="flex flex-col flex-1">
                {/* Week Days Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
                  {weekDays.map((d, i) => (
                    <div key={i} className="py-3 px-2 border-r border-slate-200 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{DAYS[i]}</div>
                      <div className={cn("text-xl font-bold w-8 h-8 mx-auto flex items-center justify-center rounded-full", d.isToday ? "bg-primary-600 text-white" : "text-slate-700")}>
                        {d.day}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Week Grid (Scrollable) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                    {weekDays.map((_, i) => (
                      <div key={i} className="border-r border-slate-200/50 h-[800px]"></div>
                    ))}
                  </div>
                  {/* Real Items */}
                  <div className="grid grid-cols-7 h-[800px] relative">
                    {weekDays.map((d, colIndex) => (
                      <div key={colIndex} className="relative p-2 h-full z-10">
                        {d.items.map((item, idx) => (
                          <div key={idx} onClick={(e) => handleItemClick(item, e)} className={cn("absolute w-[calc(100%-16px)] p-2 rounded-xl border shadow-sm cursor-pointer hover:shadow-md hover:brightness-95 transition-all", item.color)} style={{ top: `${(idx + 1) * 75}px`, minHeight: '60px' }}>
                            <div className="font-bold text-xs truncate flex items-center gap-1.5">
                              {renderItemIcon(item.sourceType)}
                              <span className="truncate">{item.title}</span>
                            </div>
                            <div className="text-[11px] mt-1 opacity-80 flex items-center gap-1">
                              <Clock size={11} /> {item.timeStr}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {modalMode !== 'closed' && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              
              {modalMode === 'view' && selectedItem ? (
                <div>
                  <div className={cn("p-6 relative", 
                    selectedItem.sourceType === 'meeting' ? "bg-rose-600 text-white" :
                    selectedItem.sourceType === 'task' ? "bg-indigo-600 text-white" :
                    selectedItem.color || 'bg-slate-700 text-white'
                  )}>
                    <button onClick={() => setModalMode('closed')} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors backdrop-blur-md text-white">
                      <X size={20} />
                    </button>
                    <div className="mb-3 inline-flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md text-white">
                      {selectedItem.sourceType === 'meeting' && <CalendarDays size={13} />}
                      {selectedItem.sourceType === 'task' && <CheckSquare size={13} />}
                      {selectedItem.sourceType === 'event' && <Tag size={13} />}
                      <span>{selectedItem.type || (selectedItem.sourceType === 'meeting' ? 'Rapat' : selectedItem.sourceType === 'task' ? 'Tugas' : 'Acara')}</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 leading-tight text-white">{selectedItem.title}</h3>
                    <div className="flex flex-col gap-2 text-white/90 text-sm mt-4">
                      <div className="flex items-center gap-2"><CalendarIcon size={16} className="opacity-75" /> {getFormattedDate(selectedItem.dateObj)}</div>
                      <div className="flex items-center gap-2"><Clock size={16} className="opacity-75" /> {selectedItem.timeStr}</div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {selectedItem.person && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><User size={20} /></div>
                        <div>
                          <div className="text-xs text-slate-400 font-medium mb-0.5">
                            {selectedItem.sourceType === 'meeting' ? 'Penyelenggara' : selectedItem.sourceType === 'task' ? 'Penanggung Jawab' : 'Penyelenggara / PIC'}
                          </div>
                          <div className="font-semibold text-slate-800">{selectedItem.person}</div>
                        </div>
                      </div>
                    )}
                    {selectedItem.location && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          {selectedItem.sourceType === 'task' ? <FolderKanban size={20} /> : <MapPin size={20} />}
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 font-medium mb-0.5">
                            {selectedItem.sourceType === 'task' ? 'Proyek' : 'Lokasi / Link'}
                          </div>
                          <div className="font-semibold text-slate-800">{selectedItem.location}</div>
                        </div>
                      </div>
                    )}
                    {(!selectedItem.person && !selectedItem.location) && (
                      <div className="text-center text-slate-500 py-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-sm">Tidak ada detail tambahan.</div>
                    )}
                  </div>
                  
                  <div className="p-5 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center gap-3">
                    {selectedItem.sourceType === 'event' ? (
                      <>
                        <button onClick={() => { if (selectedItem.rawEvent && deleteEvent) { deleteEvent(selectedItem.rawEvent.id); setModalMode('closed'); } }} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-400" title="Hapus Acara">
                          <Trash2 size={20} />
                        </button>
                        <button onClick={handleEditClick} className="px-5 py-2.5 bg-white border border-slate-200 hover:border-primary-500 hover:text-primary-600 text-slate-700 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm">
                          <Pencil size={16} /> Edit Acara
                        </button>
                      </>
                    ) : selectedItem.sourceType === 'meeting' ? (
                      <>
                        <button type="button" onClick={() => setModalMode('closed')} className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-200/60 rounded-xl transition-colors text-sm">Tutup</button>
                        <button 
                          onClick={() => {
                            setModalMode('closed');
                            onNavigate?.('meetings');
                          }} 
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-rose-500/30 flex items-center gap-2 text-sm"
                        >
                          Buka di Menu Rapat <ArrowRight size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setModalMode('closed')} className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-200/60 rounded-xl transition-colors text-sm">Tutup</button>
                        <button 
                          onClick={() => {
                            setModalMode('closed');
                            onNavigate?.('tasks');
                          }} 
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-indigo-500/30 flex items-center gap-2 text-sm"
                        >
                          Buka di Papan Tugas <ArrowRight size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">{modalMode === 'edit' ? 'Edit Acara' : 'Tambah Acara Baru'}</h3>
                    <button onClick={() => setModalMode('closed')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleNewEvent} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Judul Acara</label>
                      <input type="text" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm" placeholder="e.g., Team Sync" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                        <input type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Waktu</label>
                        <input type="time" required value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Penanggung Jawab</label>
                      <input type="text" value={newEvent.personInCharge} onChange={e => setNewEvent({...newEvent, personInCharge: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm" placeholder="e.g., Budi Santoso" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                      <input type="text" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm" placeholder="e.g., Ruang Rapat Lt. 2 atau Link Zoom" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                      <input list="type-options" type="text" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white transition-all text-sm" placeholder="Pilih atau ketik tipe acara" />
                      <datalist id="type-options">
                        <option value="Rapat" />
                        <option value="Tenggat Tugas" />
                        <option value="Evaluasi" />
                      </datalist>
                    </div>
                    <div className="pt-4 flex gap-3 justify-end items-center">
                      <button type="button" onClick={() => setModalMode('closed')} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-400 text-sm">Batal</button>
                      <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-primary-500/30 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-sm">{modalMode === 'edit' ? 'Simpan Perubahan' : 'Simpan Acara'}</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

