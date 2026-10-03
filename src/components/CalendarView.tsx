import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-8 overflow-hidden">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8 flex-shrink-0">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Calendar</h2>
            <p className="text-slate-500 mt-1">Schedule meetings and track your deadlines.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-4 mr-4 text-slate-700 font-bold text-xl">
              <button className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ChevronLeft size={20} /></button>
              September 2026
              <button className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ChevronRight size={20} /></button>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <Plus size={18} />
              New Event
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
          
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
            {DAYS.map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 grid-rows-5 flex-1 bg-slate-200 gap-px">
            {calendarDays.slice(0, 35).map((d, i) => (
              <div key={i} className={cn("bg-white p-2 flex flex-col overflow-hidden hover:bg-slate-50 transition-colors", !d.current && "bg-slate-50/50 text-slate-400")}>
                <div className="flex justify-between items-start mb-2">
                  <span className={cn("text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full", d.isToday ? "bg-primary-600 text-white shadow-sm" : d.current ? "text-slate-700" : "")}>
                    {d.day}
                  </span>
                </div>
                
                <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {d.events.map((evt: Event, idx) => (
                    <div key={idx} className={cn("px-2 py-1.5 rounded-lg text-xs font-medium border truncate", evt.color || 'bg-slate-100 text-slate-700')}>
                      <div className="font-bold truncate">{evt.title}</div>
                      <div className="text-[10px] mt-0.5 opacity-80 flex items-center gap-1">
                        <Clock size={10} /> {evt.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Add New Event</h3>
              </div>
              <form onSubmit={handleNewEvent} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                  <input type="text" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g., Team Sync" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                    <input type="text" required value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="10:00 AM" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                    <option value="meeting">Meeting</option>
                    <option value="task">Task Deadline</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3 justify-end">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-primary-500/30">Save Event</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
