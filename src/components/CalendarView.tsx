import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, LayoutGrid, List, MapPin, User, Tag, Pencil, Calendar as CalendarIcon, Trash2, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, isSameMonth, isSameDay, addWeeks, subWeeks
} from 'date-fns';
import { id } from 'date-fns/locale';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

import { useAppStore, type Event } from '../store/useAppStore';

export default function CalendarView() {
  const { events, addEvent, updateEvent, deleteEvent } = useAppStore();

  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit' | 'view'>('closed');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '10:00 AM', type: 'Rapat', personInCharge: '', location: '' });
  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const openNewEventModal = () => {
    setSelectedEvent(null);
    setNewEvent({ title: '', date: '', time: '10:00 AM', type: 'Rapat', personInCharge: '', location: '' });
    setModalMode('create');
  };

  const handleEventClick = (evt: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(evt);
    setModalMode('view');
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;
    const dateStr = typeof selectedEvent.date === 'string' 
      ? selectedEvent.date 
      : format(new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedEvent.date), 'yyyy-MM-dd');
    setNewEvent({
      title: selectedEvent.title,
      date: dateStr,
      time: selectedEvent.time,
      type: selectedEvent.type || 'Rapat',
      personInCharge: selectedEvent.personInCharge || '',
      location: selectedEvent.location || ''
    });
    setModalMode('edit');
  };

  const handleNewEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || newEvent.title.trim() === '') return;
    
    const evtColor = (newEvent.type.toLowerCase().includes('rapat') || newEvent.type.toLowerCase().includes('meeting')) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

    if (modalMode === 'edit' && selectedEvent && updateEvent) {
      updateEvent(selectedEvent.id, {
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
    setSelectedEvent(null);
    setNewEvent({ title: '', date: '', time: '10:00 AM', type: 'Rapat', personInCharge: '', location: '' });
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
    let formattedDate = "";

    while (day <= endDate) {
      formattedDate = format(day, dateFormat);
      // find events for this day
      // events date can be either number (day) or string (YYYY-MM-DD)
      const dayEvents = events.filter(e => {
        if (typeof e.date === 'number') {
           // mock data used day of month
           return e.date === parseInt(formattedDate) && isSameMonth(day, currentDate);
        } else if (typeof e.date === 'string') {
           return isSameDay(new Date(e.date), day);
        }
        return false;
      });

      days.push({
        date: day,
        day: formattedDate,
        current: isSameMonth(day, monthStart),
        isToday: isSameDay(day, new Date()),
        events: dayEvents
      });
      day = addDays(day, 1);
    }
    
    // Ensure 35 days (5 weeks) minimum for UI consistency
    while (days.length < 35) {
      formattedDate = format(day, dateFormat);
      days.push({
        date: day,
        day: formattedDate,
        current: isSameMonth(day, monthStart),
        isToday: isSameDay(day, new Date()),
        events: []
      });
      day = addDays(day, 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendar();
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i);
    const dayEvents = events.filter(e => {
        if (typeof e.date === 'number') {
           return e.date === day.getDate() && isSameMonth(day, currentDate);
        } else if (typeof e.date === 'string') {
           return isSameDay(new Date(e.date), day);
        }
        return false;
      });
    return {
      date: day,
      day: format(day, 'd'),
      isToday: isSameDay(day, new Date()),
      events: dayEvents
    };
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-4 md:p-8 overflow-hidden">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 md:mb-8 flex-shrink-0 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Kalender</h2>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Jadwalkan rapat dan pantau tenggat waktu Anda.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-3 mr-0 md:mr-4 text-slate-700 font-bold md:text-xl w-full md:w-auto justify-between md:justify-start bg-white md:bg-transparent p-2 md:p-0 rounded-xl border border-slate-200 md:border-none">
              <button onClick={prevPeriod} className="p-2 hover:bg-slate-100 md:hover:bg-slate-200 rounded-lg md:rounded-full transition-colors"><ChevronLeft size={20} /></button>
              <span className="text-sm md:text-xl">{format(currentDate, viewType === 'month' ? 'MMMM yyyy' : "'Minggu 'w', 'yyyy", { locale: id })}</span>
              <button onClick={nextPeriod} className="p-2 hover:bg-slate-100 md:hover:bg-slate-200 rounded-lg md:rounded-full transition-colors"><ChevronRight size={20} /></button>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
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
                      {d.events.map((evt: Event, idx) => (
                        <div key={idx} onClick={(e) => handleEventClick(evt, e)} className={cn("px-1 md:px-2 py-1 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-medium border truncate cursor-pointer hover:shadow-sm hover:brightness-95 transition-all", evt.color || 'bg-slate-100 text-slate-700')}>
                          <div className="font-bold truncate">{evt.title}</div>
                          <div className="hidden md:flex text-[10px] mt-0.5 opacity-80 items-center gap-1">
                            <Clock size={10} /> {evt.time}
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
                  {/* Mock Time Grid Background */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                    {weekDays.map((_, i) => (
                      <div key={i} className="border-r border-slate-200/50 h-[800px]"></div>
                    ))}
                  </div>
                  {/* Real Events */}
                  <div className="grid grid-cols-7 h-[800px] relative">
                    {weekDays.map((d, colIndex) => (
                      <div key={colIndex} className="relative p-2 h-full z-10">
                        {d.events.map((evt: Event, idx) => (
                          <div key={idx} onClick={(e) => handleEventClick(evt, e)} className={cn("absolute w-[calc(100%-16px)] p-2 rounded-xl border shadow-sm cursor-pointer hover:shadow-md hover:brightness-95 transition-all", evt.color || 'bg-slate-100 text-slate-700')} style={{ top: `${(idx + 2) * 80}px`, minHeight: '60px' }}>
                            <div className="font-bold text-sm truncate">{evt.title}</div>
                            <div className="text-xs mt-1 opacity-80 flex items-center gap-1">
                              <Clock size={12} /> {evt.time}
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
        {/* Modal */}
        {modalMode !== 'closed' && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              
              {modalMode === 'view' && selectedEvent ? (
                <div>
                  <div className={cn("p-6 text-white relative", selectedEvent.color || 'bg-slate-700')}>
                    <button onClick={() => setModalMode('closed')} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors backdrop-blur-md">
                      <X size={20} />
                    </button>
                    <div className="mb-4 inline-flex items-center gap-1.5 bg-black/15 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-md">
                      <Tag size={14} /> {selectedEvent.type || 'Acara'}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{selectedEvent.title}</h3>
                    <div className="flex flex-col gap-2 text-white/90 text-sm mt-4">
                      <div className="flex items-center gap-2"><CalendarIcon size={16} className="opacity-75" /> {format(new Date(selectedEvent.date), 'dd MMMM yyyy', { locale: id })}</div>
                      <div className="flex items-center gap-2"><Clock size={16} className="opacity-75" /> {selectedEvent.time}</div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    {selectedEvent.personInCharge && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><User size={20} /></div>
                        <div>
                          <div className="text-sm text-slate-500 mb-0.5">Penanggung Jawab</div>
                          <div className="font-semibold text-slate-800">{selectedEvent.personInCharge}</div>
                        </div>
                      </div>
                    )}
                    {selectedEvent.location && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><MapPin size={20} /></div>
                        <div>
                          <div className="text-sm text-slate-500 mb-0.5">Lokasi</div>
                          <div className="font-semibold text-slate-800">{selectedEvent.location}</div>
                        </div>
                      </div>
                    )}
                    {(!selectedEvent.personInCharge && !selectedEvent.location) && (
                      <div className="text-center text-slate-500 py-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">Tidak ada detail tambahan.</div>
                    )}
                  </div>
                  
                  <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
                    <button onClick={() => { if (deleteEvent) { deleteEvent(selectedEvent.id); setModalMode('closed'); } }} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-400" title="Hapus">
                      <Trash2 size={20} />
                    </button>
                    <button onClick={handleEditClick} className="px-6 py-2.5 bg-white border border-slate-200 hover:border-primary-500 hover:text-primary-600 text-slate-700 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2">
                      <Pencil size={18} /> Edit Acara
                    </button>
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
                      <input type="text" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="e.g., Team Sync" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                        <input type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Waktu</label>
                        <input type="text" required value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="10:00 AM" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Penanggung Jawab</label>
                      <input type="text" value={newEvent.personInCharge} onChange={e => setNewEvent({...newEvent, personInCharge: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="e.g., Budi Santoso" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                      <input type="text" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="e.g., Ruang Rapat Lt. 2 atau Link Zoom" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                      <input list="type-options" type="text" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white transition-all" placeholder="Pilih atau ketik tipe acara" />
                      <datalist id="type-options">
                        <option value="Rapat" />
                        <option value="Tenggat Tugas" />
                        <option value="Evaluasi" />
                      </datalist>
                    </div>
                    <div className="pt-4 flex gap-3 justify-end items-center">
                      <button type="button" onClick={() => setModalMode('closed')} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Batal</button>
                      <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-primary-500/30 outline-none focus-visible:ring-2 focus-visible:ring-primary-500">{modalMode === 'edit' ? 'Simpan Perubahan' : 'Simpan Acara'}</button>
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
