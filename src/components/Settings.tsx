import { useState, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Building, 
  Bell, 
  Shield, 
  Paintbrush, 
  Globe, 
  Save, 
  Check, 
  Copy, 
  Download, 
  AlertTriangle, 
  UserCheck 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAppStore } from '../store/useAppStore';

export default function Settings() {
  const { orgName, setOrgName, currentUser, currentOrgId, tasks, projects, meetings, team, documents } = useAppStore();
  const [activeTab, setActiveTab] = useState('general');
  const [tempName, setTempName] = useState(orgName);
  const [description, setDescription] = useState(
    () => localStorage.getItem('workspace_description') || 'Kepanitiaan Milad 200, mengurus segala persiapan acara.'
  );
  const [timezone, setTimezone] = useState('Asia/Jakarta (WIB)');
  const [language, setLanguage] = useState('Bahasa Indonesia');
  const [selectedColor, setSelectedColor] = useState('#0ea5e9');
  const [logoPreview, setLogoPreview] = useState<string | null>(
    () => localStorage.getItem('workspace_logo') || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification toggles
  const [notifyTasks, setNotifyTasks] = useState(true);
  const [notifyMeetings, setNotifyMeetings] = useState(true);
  const [notifyDecisions, setNotifyDecisions] = useState(true);
  const [notifyTeam, setNotifyTeam] = useState(false);

  const handleSave = () => {
    setOrgName(tempName);
    localStorage.setItem('workspace_description', description);
    localStorage.setItem('workspace_timezone', timezone);
    localStorage.setItem('workspace_language', language);
    toast.success('Pengaturan berhasil disimpan!');
  };

  const handleSaveBranding = () => {
    localStorage.setItem('workspace_color', selectedColor);
    if (logoPreview) {
      localStorage.setItem('workspace_logo', logoPreview);
    }
    toast.success('Merek berhasil diperbarui!');
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('workspace_notif_prefs', JSON.stringify({
      notifyTasks, notifyMeetings, notifyDecisions, notifyTeam
    }));
    toast.success('Preferensi notifikasi disimpan!');
  };

  const handleCopyOrgId = () => {
    const id = currentUser?.organizationId || currentOrgId || 'org-main';
    navigator.clipboard.writeText(id);
    toast.success('ID Organisasi disalin ke papan klip!');
  };

  const handleExportData = () => {
    const data = {
      organization: {
        id: currentUser?.organizationId || currentOrgId,
        name: orgName,
        exportedAt: new Date().toISOString()
      },
      tasks,
      projects,
      meetings,
      team,
      documents: documents.map(d => ({ id: d.id, name: d.name, type: d.type, size: d.size, date: d.date, owner: d.owner }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-milad-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data workspace berhasil diekspor!');
  };

  const handleClearCache = () => {
    if (window.confirm('Bersihkan data cache dan preferensi lokal? Halaman akan dimuat ulang.')) {
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Cache berhasil dibersihkan.');
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
      toast.success('Logo berhasil dipilih');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Pengaturan Organisasi</h2>
          <p className="text-slate-500 mt-1">Kelola preferensi ruang kerja, merek, dan keamanan Anda.</p>
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
                Umum
              </button>
              <button 
                onClick={() => setActiveTab('branding')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'branding' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <Paintbrush size={18} />
                Merek
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'notifications' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <Bell size={18} />
                Notifikasi
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'security' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <Shield size={18} />
                Keamanan & Peran
              </button>
              <button 
                onClick={() => setActiveTab('advanced')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'advanced' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <SettingsIcon size={18} />
                Lanjutan
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-6">
            
            {activeTab === 'general' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Informasi Umum</h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Ruang Kerja</label>
                    <input 
                      type="text" 
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi Ruang Kerja</label>
                    <textarea 
                      rows={3} 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Zona Waktu</label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3 top-3 text-slate-400" />
                        <select 
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none"
                        >
                          <option>Asia/Jakarta (WIB)</option>
                          <option>Asia/Makassar (WITA)</option>
                          <option>Asia/Jayapura (WIT)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bahasa</label>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option>English</option>
                        <option>Bahasa Indonesia</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button onClick={handleSave} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:-translate-y-0.5">
                    <Save size={16} /> Simpan Perubahan
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Merek & Identitas</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Logo Organisasi</label>
                    <div className="flex items-center gap-6">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLogoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Logo" 
                          className="h-20 w-20 rounded-2xl object-cover shadow-md border border-slate-200" 
                        />
                      ) : (
                        <div 
                          className="h-20 w-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
                          style={{ backgroundColor: selectedColor }}
                        >
                          {tempName ? tempName.charAt(0).toUpperCase() : 'M'}
                        </div>
                      )}
                      <div>
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors mb-2"
                        >
                          Unggah Logo Baru
                        </button>
                        <p className="text-xs text-slate-500">Rekomendasi ukuran: 512x512px. PNG atau JPG di bawah 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Warna Utama</label>
                    <div className="flex gap-3">
                      {['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b'].map((color) => (
                        <button 
                          key={color} 
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={cn(
                            "h-8 w-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center hover:scale-110 transition-transform",
                            selectedColor === color ? "ring-2 ring-primary-500 scale-105" : "ring-transparent"
                          )} 
                          style={{ backgroundColor: color }}
                        >
                          {selectedColor === color && <Check size={14} className="text-white drop-shadow" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={handleSaveBranding}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:-translate-y-0.5"
                  >
                    <Save size={16} /> Simpan Perubahan
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Preferensi Notifikasi</h3>
                
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Notifikasi Tugas</p>
                      <p className="text-xs text-slate-500 mt-0.5">Dapatkan pemberitahuan saat Anda ditugaskan ke tugas baru.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifyTasks} 
                      onChange={e => setNotifyTasks(e.target.checked)} 
                      className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Pengingat Rapat</p>
                      <p className="text-xs text-slate-500 mt-0.5">Terima pengingat 15 menit sebelum rapat terjadwal dimulai.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifyMeetings} 
                      onChange={e => setNotifyMeetings(e.target.checked)} 
                      className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Keputusan & Notulen Rapat</p>
                      <p className="text-xs text-slate-500 mt-0.5">Beritahu saat ada keputusan rapat baru yang disetujui.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifyDecisions} 
                      onChange={e => setNotifyDecisions(e.target.checked)} 
                      className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Aktivitas Tim</p>
                      <p className="text-xs text-slate-500 mt-0.5">Dapatkan notifikasi saat anggota baru menerima undangan workspace.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifyTeam} 
                      onChange={e => setNotifyTeam(e.target.checked)} 
                      className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={handleSaveNotifications}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:-translate-y-0.5"
                  >
                    <Save size={16} /> Simpan Preferensi
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Keamanan & Peran</h3>
                  <p className="text-slate-500 text-xs">Informasi identitas, peran pengguna, dan izin akses ruang kerja.</p>
                </div>

                {/* Identity & Org Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3">
                    <UserCheck className="text-primary-600 mt-0.5 flex-shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Peran Anda Saat Ini</p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">
                        {currentUser?.role || 'Owner'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Akun: {currentUser?.email || 'User'}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">ID Organisasi</p>
                      <p className="text-sm font-mono font-bold text-slate-800 mt-0.5 truncate max-w-[180px]">
                        {currentUser?.organizationId || currentOrgId || 'org-main'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Gunakan ID ini untuk keperluan integrasi.</p>
                    </div>
                    <button 
                      onClick={handleCopyOrgId}
                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-xs flex items-center gap-1 shadow-sm transition-colors"
                      title="Salin ID Organisasi"
                    >
                      <Copy size={14} /> Salin
                    </button>
                  </div>
                </div>

                {/* Permissions Matrix */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Matriks Hak Akses Peran</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="p-3">Hak Akses</th>
                          <th className="p-3 text-center">Owner</th>
                          <th className="p-3 text-center">Admin</th>
                          <th className="p-3 text-center">Manager</th>
                          <th className="p-3 text-center">Member</th>
                          <th className="p-3 text-center">Viewer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="p-3 font-medium">Kelola Organisasi & Pengaturan</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-slate-300">-</td>
                          <td className="p-3 text-center text-slate-300">-</td>
                          <td className="p-3 text-center text-slate-300">-</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">Undang & Kelola Anggota Tim</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-slate-300">-</td>
                          <td className="p-3 text-center text-slate-300">-</td>
                          <td className="p-3 text-center text-slate-300">-</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">Buat & Edit Tugas, Proyek, Rapat</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-slate-300">-</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">Unggah & Unduh Dokumen</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-emerald-600">✓</td>
                          <td className="p-3 text-center text-slate-300">Hanya Unduh</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Pengaturan Lanjutan</h3>
                  <p className="text-slate-500 text-xs">Ekspor cadangan data workspace dan manajemen cache lokal.</p>
                </div>

                {/* Export Data */}
                <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                      <Download size={16} className="text-primary-600" />
                      Ekspor Data Workspace
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      Unduh seluruh data tugas, proyek, jadwal rapat, dan daftar tim ke dalam format file JSON untuk arsip atau cadangan offline.
                    </p>
                  </div>
                  <button 
                    onClick={handleExportData}
                    className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-colors self-start md:self-auto"
                  >
                    <Download size={14} /> Unduh Data (.JSON)
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="border border-red-200 rounded-2xl p-5 bg-red-50/30">
                  <h4 className="font-bold text-red-700 text-sm flex items-center gap-2 mb-1">
                    <AlertTriangle size={16} /> Zona Berbahaya
                  </h4>
                  <p className="text-xs text-slate-600 mb-4">
                    Tindakan berikut membersihkan data penyimpanan lokal browser yang disimpan pada perangkat ini.
                  </p>
                  <button 
                    onClick={handleClearCache}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    Bersihkan Cache & Reset Sesi Lokal
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
