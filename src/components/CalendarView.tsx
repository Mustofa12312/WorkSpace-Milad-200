import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, LayoutGrid, List } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

import { useAppStore, type Event } from '../store/useAppStore';

export default function CalendarView() {
  const { events, addEvent } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '10:00 AM', type: 'meeting' });
  const [viewType, setViewType] = useState<'month' | 'week'>('month');

  const handleNewEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || newEvent.title.trim() === '') return;
    
    // parse day from date string YYYY-MM-DD
    const day = newEvent.date ? new Date(newEvent.date).getDate() : 1;
    
    addEvent({
      id: `evt-${Date.now()}`,
      title: newEvent.title,
      date: day,
      time: newEvent.time,
      color: newEvent.type === 'meeting' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    });
    
    setIsModalOpen(false);
    setNewEvent({ title: '', date: '', time: '10:00 AM', type: 'meeting' });
  };

  const generateCalendar = () => {
    const days = [];
    // previous month padding
    for (let i = 0; i < 3; i++) {
      days.push({ day: 28 + i, current: false, events: [] });
    }
    // current month
    for (let i = 1; i <= 31; i++) {
      const dayEvents = events.filter(e => e.date === i);
      days.push({ day: i, current: true, events: dayEvents, isToday: i === 12 });
    }
    // next month padding
    for (let i = 1; i <= 8; i++) {
      days.push({ day: i, current: false, events: [] });
    }
    return days;
  };

  const calendarDays = generateCalendar();
  const weekDays = calendarDays.slice(7, 14); // Mock current week for the weekly view

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-4 md:p-8 overflow-hidden">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 md:mb-8 flex-shrink-0 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Calendar</h2>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Schedule meetings and track your deadlines.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-3 mr-0 md:mr-4 text-slate-700 font-bold md:text-xl w-full md:w-auto justify-between md:justify-start bg-white md:bg-transparent p-2 md:p-0 rounded-xl border border-slate-200 md:border-none">
              <button className="p-2 hover:bg-slate-100 md:hover:bg-slate-200 rounded-lg md:rounded-full transition-colors"><ChevronLeft size={20} /></button>
              <span className="text-sm md:text-xl">September 2026</span>
              <button className="p-2 hover:bg-slate-100 md:hover:bg-slate-200 rounded-lg md:rounded-full transition-colors"><ChevronRight size={20} /></button>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <div className="flex bg-slate-200/50 p-1 rounded-xl">
                <button 
                  onClick={() => setViewType('month')}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all", viewType === 'month' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                  <LayoutGrid size={16} /> <span className="hidden md:inline">Month</span>
                </button>
                <button 
                  onClick={() => setViewType('week')}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all", viewType === 'week' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                  <List size={16} /> <span className="hidden md:inline">Week</span>
                </button>
              </div>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex-1 md:flex-none bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl md:rounded-full font-medium flex items-center justify-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <Plus size={18} />
                <span className="hidden md:inline">New Event</span>
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
                        <div key={idx} className={cn("px-1 md:px-2 py-1 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-medium border truncate", evt.color || 'bg-slate-100 text-slate-700')}>
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
                          <div key={idx} className={cn("absolute w-[calc(100%-16px)] p-2 rounded-xl border shadow-sm", evt.color || 'bg-slate-100 text-slate-700')} style={{ top: `${(idx + 2) * 80}px`, minHeight: '60px' }}>
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
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Add New Event</h3>
              </div>
              <form onSubmit={handleNewEvent} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                  <input type="text" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="e.g., Team Sync" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                    <input type="text" required value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="10:00 AM" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white transition-all">
                    <option value="meeting">Meeting</option>
                    <option value="task">Task Deadline</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3 justify-end">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-primary-500/30 outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Save Event</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
