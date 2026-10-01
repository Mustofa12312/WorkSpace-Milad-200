import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to generate a mockup calendar month
const generateMockCalendar = () => {
  const days = [];
  // previous month padding
  for (let i = 0; i < 3; i++) {
    days.push({ day: 28 + i, current: false, events: [] });
  }
  // current month
  for (let i = 1; i <= 31; i++) {
    const events = [];
    if (i === 5) events.push({ title: 'Design Review', type: 'meeting', time: '10:00 AM' });
    if (i === 12) events.push({ title: 'Submit Proposal', type: 'task', time: '5:00 PM' });
    if (i === 12) events.push({ title: 'Weekly Sync', type: 'meeting', time: '8:00 PM' });
    if (i === 20) events.push({ title: 'Vendor Meeting', type: 'meeting', time: '1:00 PM' });
    days.push({ day: i, current: true, events, isToday: i === 12 });
  }
  // next month padding
  for (let i = 1; i <= 8; i++) {
    days.push({ day: i, current: false, events: [] });
  }
  return days;
};

export default function CalendarView() {
  const [calendarDays] = useState(generateMockCalendar());

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
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5">
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
                  {d.events.map((evt, idx) => (
                    <div key={idx} className={cn("px-2 py-1.5 rounded-lg text-xs font-medium border truncate", 
                      evt.type === 'meeting' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    )}>
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
