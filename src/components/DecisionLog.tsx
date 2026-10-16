import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Search,
  Gavel,
  Calendar,
  Filter,
  AlertCircle,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';
import type { ApprovalStatus, Meeting } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DecisionItem {
  id: string;
  index: number;
  text: string;
  meetingId: string;
  meetingTitle: string;
  date: string;
  projectId?: string;
  status: ApprovalStatus;
}

export default function DecisionLog({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { meetings, projects, currentUser, updateMeeting, addMeeting } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<DecisionItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [decisionText, setDecisionText] = useState('');
  const [meetingMode, setMeetingMode] = useState<'existing' | 'new'>('existing');
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [status, setStatus] = useState<ApprovalStatus>('Approved');

  const parseSafeDate = (d?: string) => {
    if (!d) return new Date(0);
    const parsed = new Date(d.includes('T') ? d : `${d}T00:00:00`);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parsed = parseSafeDate(dateStr);
    if (parsed.getTime() === 0) return dateStr;
    return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Extract all decisions from all meetings
  const allDecisions: DecisionItem[] = useMemo(() => {
    const decs: DecisionItem[] = [];
    meetings.forEach(m => {
      if (m.decisions && m.decisions.length > 0) {
        m.decisions.forEach((d, index) => {
          decs.push({
            id: `${m.id}-${index}`,
            index,
            text: d,
            meetingId: m.id,
            meetingTitle: m.title || 'Rapat',
            date: m.date || '',
            projectId: m.projectId,
            status: m.approvalStatus || 'Draft',
          });
        });
      }
    });
    return decs.sort((a, b) => parseSafeDate(b.date).getTime() - parseSafeDate(a.date).getTime());
  }, [meetings]);

  const filteredDecisions = allDecisions.filter(d => {
    const query = search.toLowerCase();
    const matchesSearch =
      (d.text || '').toLowerCase().includes(query) || (d.meetingTitle || '').toLowerCase().includes(query);
    const matchesProject = filterProject === 'All' || d.projectId === filterProject;
    return matchesSearch && matchesProject;
  });

  const projectsWithDecisions = Array.from(new Set(allDecisions.map(d => d.projectId).filter(Boolean)));

  const handleOpenCreate = () => {
    setEditingDecision(null);
    setDecisionText('');
    setMeetingMode(meetings.length > 0 ? 'existing' : 'new');
    setSelectedMeetingId(meetings[0]?.id || '');
    setNewMeetingTitle('');
    setNewMeetingDate(new Date().toISOString().split('T')[0]);
    setSelectedProjectId('');
    setStatus('Approved');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: DecisionItem) => {
    setEditingDecision(item);
    setDecisionText(item.text);
    setSelectedMeetingId(item.meetingId);
    setSelectedProjectId(item.projectId || '');
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionText.trim()) {
      toast.error('Teks keputusan tidak boleh kosong');
      return;
    }

    setIsSaving(true);
    try {
      if (editingDecision) {
        // Edit existing decision in its meeting
        const targetMeeting = meetings.find(m => m.id === editingDecision.meetingId);
        if (!targetMeeting) {
          toast.error('Rapat sumber tidak ditemukan');
          return;
        }

        const updatedDecisions = [...(targetMeeting.decisions || [])];
        updatedDecisions[editingDecision.index] = decisionText.trim();

        await updateMeeting(editingDecision.meetingId, {
          decisions: updatedDecisions,
          approvalStatus: status,
        });

        toast.success('Keputusan berhasil diperbarui');
      } else {
        // Create new decision
        if (meetingMode === 'existing') {
          if (!selectedMeetingId) {
            toast.error('Pilih rapat sumber keputusan');
            return;
          }
          const targetMeeting = meetings.find(m => m.id === selectedMeetingId);
          if (!targetMeeting) {
            toast.error('Rapat tidak ditemukan');
            return;
          }

          const updatedDecisions = [...(targetMeeting.decisions || []), decisionText.trim()];
          await updateMeeting(selectedMeetingId, {
            decisions: updatedDecisions,
          });

          toast.success('Keputusan berhasil ditambahkan ke rapat');
        } else {
          // Create a new meeting/forum record for this decision
          const newMeetingId = 'm-' + Date.now();
          const newMeeting: Meeting = {
            id: newMeetingId,
            title: newMeetingTitle.trim() || 'Rapat Keputusan',
            type: 'Internal',
            status: 'completed',
            date: newMeetingDate || new Date().toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '10:00',
            organizer: currentUser?.name || 'Admin',
            participants: [currentUser?.name || 'Admin'],
            agenda: [{ id: '1', title: 'Pembahasan Keputusan', duration: 30 }],
            decisions: [decisionText.trim()],
            projectId: selectedProjectId || undefined,
            approvalStatus: status,
          };

          await addMeeting(newMeeting);
          toast.success('Keputusan dan rapat baru berhasil dicatat');
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menyimpan keputusan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDecision = async (item: DecisionItem) => {
    if (!window.confirm(`Hapus keputusan: "${item.text.slice(0, 45)}..."?`)) {
      return;
    }

    try {
      const targetMeeting = meetings.find(m => m.id === item.meetingId);
      if (!targetMeeting) {
        toast.error('Rapat tidak ditemukan');
        return;
      }

      const updatedDecisions = (targetMeeting.decisions || []).filter((_, idx) => idx !== item.index);
      await updateMeeting(item.meetingId, { decisions: updatedDecisions });
      toast.success('Keputusan berhasil dihapus');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus keputusan');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Gavel className="text-indigo-600" /> Log Keputusan
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Catatan pusat untuk semua keputusan dari setiap rapat dan musyawarah organisasi.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} /> Tambah Keputusan
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-2 rounded-xl shadow-xs border border-slate-200">
          <div className="flex-1 flex items-center gap-2 px-3 border-b sm:border-b-0 sm:border-r border-slate-100">
            <Search size={16} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari keputusan atau nama rapat..."
              className="w-full bg-transparent border-none outline-none text-sm py-2 text-slate-700"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-3">
            <Filter size={16} className="text-slate-400 flex-shrink-0" />
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer py-2 w-full sm:w-auto"
            >
              <option value="All">Semua Proyek</option>
              {projectsWithDecisions.map(pid => {
                const p = projects.find(x => x.id === pid);
                return p ? <option key={pid} value={pid}>{p.name}</option> : null;
              })}
            </select>
          </div>
        </div>

        {/* Results */}
        {filteredDecisions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <AlertCircle size={44} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Tidak Ada Keputusan</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              Belum ada keputusan yang tercatat atau tidak ada hasil yang cocok dengan pencarian Anda.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-xl hover:bg-primary-100 transition-colors cursor-pointer"
            >
              <Plus size={16} /> Buat Keputusan Baru
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3 w-1/2">Keputusan</th>
                    <th className="px-5 py-3">Sumber Rapat</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredDecisions.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-4 align-top">
                        <p className="font-medium text-slate-800 leading-relaxed">{d.text}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => onNavigate('meetings')}
                            className="text-left font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 w-fit group-hover:text-primary-600 transition-colors cursor-pointer"
                          >
                            {d.meetingTitle}
                            <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDateDisplay(d.date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide',
                            d.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : d.status === 'Review'
                              ? 'bg-blue-100 text-blue-700'
                              : d.status === 'Revision Required'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(d)}
                            title="Edit keputusan"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteDecision(d)}
                            title="Hapus keputusan"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Modal Tambah / Edit Keputusan ─── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Gavel size={17} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingDecision ? 'Edit Keputusan' : 'Tambah Keputusan Baru'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveDecision} className="p-6 space-y-4 overflow-y-auto">
                {/* Teks Keputusan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Isi / Hasil Keputusan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={decisionText}
                    onChange={e => setDecisionText(e.target.value)}
                    placeholder="Contoh: Menyetujui pengadaan merchandise Milad ke-20 dengan vendor terpilih senilai Rp 3.500.000..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all resize-none"
                  />
                </div>

                {/* Sumber Rapat */}
                {!editingDecision ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Sumber Rapat / Forum
                    </label>

                    {meetings.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMeetingMode('existing')}
                          className={cn(
                            'flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer',
                            meetingMode === 'existing'
                              ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          Pilih Rapat Terdaftar
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeetingMode('new')}
                          className={cn(
                            'flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer',
                            meetingMode === 'new'
                              ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          + Forum / Rapat Baru
                        </button>
                      </div>
                    )}

                    {meetingMode === 'existing' && meetings.length > 0 ? (
                      <div>
                        <select
                          value={selectedMeetingId}
                          onChange={e => setSelectedMeetingId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none cursor-pointer"
                        >
                          {meetings.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.title} ({m.date || 'Tanpa Tanggal'})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Nama Forum / Rapat
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Rapat Pleno Panitia / Musyawarah Pimpinan"
                            value={newMeetingTitle}
                            onChange={e => setNewMeetingTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Tanggal
                            </label>
                            <input
                              type="date"
                              required
                              value={newMeetingDate}
                              onChange={e => setNewMeetingDate(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Proyek Terkait
                            </label>
                            <select
                              value={selectedProjectId}
                              onChange={e => setSelectedProjectId(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none cursor-pointer"
                            >
                              <option value="">(Umum / Tidak Ada)</option>
                              {projects.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Sumber Rapat
                    </label>
                    <p className="text-sm font-semibold text-slate-800 bg-slate-100/70 px-3.5 py-2 rounded-xl border border-slate-200">
                      {editingDecision.meetingTitle} ({formatDateDisplay(editingDecision.date)})
                    </p>
                  </div>
                )}

                {/* Status Persetujuan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status Persetujuan
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as ApprovalStatus)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none cursor-pointer font-medium"
                  >
                    <option value="Approved">Approved (Disetujui / Berlaku)</option>
                    <option value="Draft">Draft (Rancangan)</option>
                    <option value="Review">Review (Dalam Peninjauan)</option>
                    <option value="Revision Required">Revision Required (Perlu Revisi)</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check size={16} />
                    {isSaving ? 'Menyimpan...' : editingDecision ? 'Simpan Perubahan' : 'Tambah Keputusan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
