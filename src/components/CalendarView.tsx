import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

import { useAppStore } from '../store/useAppStore';

export default function CalendarView() {
  const { events, addEvent } = useAppStore();

  const handleNewEvent = () => {
    const title = window.prompt("Enter new event title:");
    if (!title || title.trim() === '') return;
    
    // Pick a random day in the current month for the demo
    const randomDay = Math.floor(Math.random() * 28) + 1;
    
    addEvent({
      id: `evt-${Date.now()}`,
      title,
      date: randomDay,
      time: '10:00 AM',
      color: 'bg-blue-100 text-blue-700'
    });
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
              onClick={handleNewEvent}
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
                  {d.events.map((evt: any, idx) => (
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

      </div>
    </div>
  );
}
