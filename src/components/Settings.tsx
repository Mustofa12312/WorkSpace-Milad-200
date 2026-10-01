import { useState } from 'react';
import { Settings as SettingsIcon, Building, Bell, Shield, Paintbrush, Globe, Save, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Organization Settings</h2>
          <p className="text-slate-500 mt-1">Manage your workspace preferences, branding, and security.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 flex-shrink-0">
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('general')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'general' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <Building size={18} />
                General
              </button>
              <button 
                onClick={() => setActiveTab('branding')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'branding' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <Paintbrush size={18} />
                Branding
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'notifications' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <Bell size={18} />
                Notifications
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'security' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <Shield size={18} />
                Security & Roles
              </button>
              <button 
                onClick={() => setActiveTab('advanced')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'advanced' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <SettingsIcon size={18} />
                Advanced
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-6">
            
            {activeTab === 'general' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">General Information</h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Workspace Name</label>
                    <input type="text" defaultValue="Milad 200" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Workspace Description</label>
                    <textarea rows={3} defaultValue="Kepanitiaan Milad 200, mengurus segala persiapan acara." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Timezone</label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3 top-3 text-slate-400" />
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none">
                          <option>Asia/Jakarta (WIB)</option>
                          <option>Asia/Makassar (WITA)</option>
                          <option>Asia/Jayapura (WIT)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Language</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                        <option>English</option>
                        <option>Bahasa Indonesia</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:-translate-y-0.5">
                    <Save size={16} /> Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Branding & Identity</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Organization Logo</label>
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md">
                        M
                      </div>
                      <div>
                        <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors mb-2">
                          Upload New Logo
                        </button>
                        <p className="text-xs text-slate-500">Recommended size: 512x512px. PNG or JPG under 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Color</label>
                    <div className="flex gap-3">
                      {['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b'].map((color, i) => (
                        <button key={i} className="h-8 w-8 rounded-full border-2 border-white shadow-sm ring-2 ring-transparent focus:ring-slate-300 hover:scale-110 transition-transform" style={{ backgroundColor: color }}></button>
                      ))}
                      <div className="h-8 w-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                        <Plus size={14} className="text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:-translate-y-0.5">
                    <Save size={16} /> Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Other tabs can be similarly implemented */}
            {(activeTab !== 'general' && activeTab !== 'branding') && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center">
                <SettingsIcon size={48} className="text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-1">Coming Soon</h3>
                <p className="text-slate-500 text-sm">This settings pane is currently under construction for the MVP.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
