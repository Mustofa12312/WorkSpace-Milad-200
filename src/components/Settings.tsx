import { useState, useRef, useEffect } from 'react';
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
  UserCheck,
  User,
  Lock,
  Phone,
  History,
  UserPlus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';
import { auth, db } from '../lib/firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toAuthMessage } from '../lib/authErrors';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAppStore } from '../store/useAppStore';

export default function Settings() {
  const { orgName, setOrgName, currentUser, setCurrentUser, currentOrgId, tasks, projects, meetings, team, documents } = useAppStore();
  const [activeTab, setActiveTab] = useState('profile');
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

  // User Profile state
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profilePhone, setProfilePhone] = useState(() => localStorage.getItem('user_phone') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Notification toggles
  const [notifyTasks, setNotifyTasks] = useState(true);
  const [notifyMeetings, setNotifyMeetings] = useState(true);
  const [notifyDecisions, setNotifyDecisions] = useState(true);
  const [notifyTeam, setNotifyTeam] = useState(false);

  // Join Workspace state
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Audit Log state
  interface AuditLogItem {
    id: string;
    userName: string;
    action: string;
    entityType: string;
    details: string;
    createdAt: string;
  }
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (activeTab === 'activity') {
      const q = query(
        collection(db, 'auditLogs'),
        where('organizationId', '==', currentOrgId)
      );
      getDocs(q).then(snap => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogItem));
        logs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setAuditLogs(logs.slice(0, 50));
        setIsLoadingLogs(false);
      }).catch(err => {
        console.warn('Could not fetch audit logs:', err);
        setIsLoadingLogs(false);
      });
    }
  }, [activeTab, currentOrgId]);

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !currentUser) return;
    setIsJoining(true);
    try {
      const code = joinCode.trim();
      let targetOrgId = code;
      let targetRole = 'Member';

      // Check if it's an invite document
      const inviteRef = doc(db, 'invitations', code);
      const inviteSnap = await getDoc(inviteRef);
      if (inviteSnap.exists()) {
        const data = inviteSnap.data();
        targetOrgId = data.organizationId;
        targetRole = data.role || 'Member';
      }

      await updateDoc(doc(db, 'team', currentUser.id), {
        organizationId: targetOrgId,
        role: targetRole,
        status: 'Active',
        lastActive: new Date().toISOString()
      });

      useAppStore.getState().setCurrentOrgId(targetOrgId);
      setCurrentUser({
        ...currentUser,
        organizationId: targetOrgId,
        role: targetRole
      });

      toast.success(`Berhasil bergabung ke Workspace (${targetOrgId})!`);
      setJoinCode('');
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || 'Gagal bergabung ke ruang kerja');
    } finally {
      setIsJoining(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: profileName.trim() });
      }
      if (currentUser?.id) {
        await updateDoc(doc(db, 'team', currentUser.id), {
          name: profileName.trim(),
          phone: profilePhone.trim()
        });
      }
      localStorage.setItem('user_phone', profilePhone.trim());
      if (currentUser) {
        setCurrentUser({ ...currentUser, name: profileName.trim() });
      }
      toast.success('Profil berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal memperbarui profil');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Kata sandi minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      if (!auth.currentUser) throw new Error('Pengguna belum login');
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Kata sandi berhasil diperbarui!');
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        toast.error('Demi keamanan, silakan keluar dan masuk kembali sebelum mengubah kata sandi.');
      } else {
        toast.error(toAuthMessage(code, 'Gagal mengubah kata sandi'));
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSave = async () => {
    setOrgName(tempName);
    localStorage.setItem('workspace_description', description);
    localStorage.setItem('workspace_timezone', timezone);
    localStorage.setItem('workspace_language', language);

    const orgId = currentUser?.organizationId || currentOrgId;
    if (orgId) {
      try {
        await setDoc(doc(db, 'organizations', orgId), {
          id: orgId,
          name: tempName,
          description,
          timezone,
          language,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Could not sync org doc to Firestore:', e);
      }
    }

    toast.success('Pengaturan berhasil disimpan!');
  };

  const handleSaveBranding = async () => {
    localStorage.setItem('workspace_color', selectedColor);
    if (logoPreview) {
      localStorage.setItem('workspace_logo', logoPreview);
    }

    const orgId = currentUser?.organizationId || currentOrgId;
    if (orgId) {
      try {
        await setDoc(doc(db, 'organizations', orgId), {
          color: selectedColor,
          logo: logoPreview,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Could not sync branding doc to Firestore:', e);
      }
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
                onClick={() => setActiveTab('profile')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'profile' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <User size={18} />
                Profil Saya
              </button>
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
              <button 
                onClick={() => { setActiveTab('activity'); setIsLoadingLogs(true); }}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", activeTab === 'activity' ? "bg-white border border-slate-200 text-primary-600 shadow-sm" : "text-slate-600 hover:bg-slate-100")}
              >
                <History size={18} />
                Log Aktivitas
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-6">

            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Profile Information */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-5">
                    <img 
                      src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=6366f1&color=fff`} 
                      alt="Avatar" 
                      className="w-16 h-16 rounded-full border-2 border-indigo-100 shadow-sm"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{currentUser?.name || 'User'}</h3>
                      <p className="text-xs text-slate-500">{currentUser?.email} · <span className="font-semibold text-primary-600">{currentUser?.role || 'Member'}</span></p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                      <input 
                        type="text" 
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                        placeholder="Nama tampilan Anda"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nomor WhatsApp / HP</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
                        <Phone size={15} className="text-slate-400 mr-2 flex-shrink-0" />
                        <input 
                          type="text" 
                          value={profilePhone}
                          onChange={e => setProfilePhone(e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-sm placeholder-slate-400" 
                          placeholder="e.g., 081234567890 (untuk koordinasi panitia)"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button 
                        type="submit"
                        disabled={isUpdatingProfile}
                        className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all cursor-pointer"
                      >
                        <Save size={16} /> {isUpdatingProfile ? 'Menyimpan...' : 'Perbarui Profil'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Change Password Form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
                    <Lock size={18} className="text-primary-600" />
                    <h3 className="text-base font-bold text-slate-800">Ubah Kata Sandi</h3>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kata Sandi Baru</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Konfirmasi Kata Sandi Baru</label>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button 
                        type="submit"
                        disabled={isUpdatingPassword || !newPassword}
                        className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Lock size={15} /> {isUpdatingPassword ? 'Mengubah...' : 'Simpan Kata Sandi'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Gabung Ruang Kerja dengan Kode Undangan */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
                    <UserPlus size={18} className="text-emerald-600" />
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Gabung Ruang Kerja Panitia</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ID Ruang Kerja aktif Anda saat ini: <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px]">{currentOrgId}</code>
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleJoinWorkspace} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Kode Undangan / ID Workspace Panitia
                      </label>
                      <input 
                        type="text" 
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                        placeholder="Contoh: inv-173234567 atau ID Organisasi Milad 200"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Masukkan kode undangan dari koordinator panitia untuk bergabung langsung ke database tugas dan rapat Milad 200.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button 
                        type="submit"
                        disabled={isJoining || !joinCode.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all cursor-pointer text-sm"
                      >
                        <UserPlus size={16} /> {isJoining ? 'Menghubungkan...' : 'Gabung Workspace'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
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
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    Bersihkan Cache & Reset Sesi Lokal
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <History className="text-primary-600" size={20} />
                      Log Riwayat Aktivitas Panitia
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Audit trail otomatis untuk setiap perubahan tugas, rapat, proyek, dan dokumen panitia.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 self-start sm:self-auto">
                    {auditLogs.length} aktivitas terakhir
                  </span>
                </div>

                {isLoadingLogs ? (
                  <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                    Memuat catatan aktivitas...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <History size={36} className="mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">Belum Ada Catatan Riwayat</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Aktivitas pembuatan, pengeditan, atau penghapusan tugas dan data akan tercatat secara otomatis di sini.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {auditLogs.map(log => {
                      let actionColor = 'bg-slate-100 text-slate-700';
                      let actionText = log.action;
                      if (log.action === 'CREATE') {
                        actionColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        actionText = 'Dibuat';
                      } else if (log.action === 'UPDATE') {
                        actionColor = 'bg-blue-100 text-blue-800 border-blue-200';
                        actionText = 'Diubah';
                      } else if (log.action === 'DELETE') {
                        actionColor = 'bg-rose-100 text-rose-800 border-rose-200';
                        actionText = 'Dihapus';
                      }

                      const dateDisplay = log.createdAt 
                        ? new Date(log.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '-';

                      return (
                        <div key={log.id} className="py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition-colors px-2 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {(log.userName || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-800">{log.userName || 'Panitia'}</span>
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", actionColor)}>
                                  {actionText}
                                </span>
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {log.entityType}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{log.details}</p>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">{dateDisplay}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
