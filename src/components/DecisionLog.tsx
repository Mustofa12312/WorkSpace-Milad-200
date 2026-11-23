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
  Share2,
  Printer,
  FileCheck2,
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
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
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
    const matchesStatus = filterStatus === 'All' || d.status === filterStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  const projectsWithDecisions = Array.from(new Set(allDecisions.map(d => d.projectId).filter(Boolean)));

  const handleShareDecisionWhatsApp = (d: DecisionItem) => {
    const text = 
      `⚖️ *KEPUTUSAN RAPAT - MILAD 200*\n\n` +
      `📜 *Keputusan*: ${d.text}\n` +
      `🏛️ *Forum/Rapat*: ${d.meetingTitle}\n` +
      `📅 *Tanggal*: ${formatDateDisplay(d.date)}\n` +
      `✅ *Status*: ${d.status}\n\n` +
      `_Dokumentasi resmi panitia Milad 200._`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Cetak atau buat rekapitulasi keputusan resmi"
            >
              <Printer size={16} className="text-slate-600" /> Cetak Rekap
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus size={16} /> Tambah Keputusan
            </button>
          </div>
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
          <div className="flex items-center gap-2 px-3 border-b sm:border-b-0 sm:border-r border-slate-100">
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
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs font-semibold text-slate-400">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer py-2 w-full sm:w-auto"
            >
              <option value="All">Semua Status</option>
              <option value="Approved">Approved</option>
              <option value="Review">Review</option>
              <option value="Revision Required">Revision Required</option>
              <option value="Draft">Draft</option>
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
                            onClick={() => handleShareDecisionWhatsApp(d)}
                            title="Bagikan keputusan ke WhatsApp"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Share2 size={15} />
                          </button>
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

        {/* ─── Modal Cetak Rekapitulasi Keputusan Resmi ─── */}
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header Toolbar (screen only) */}
              <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="text-primary-600" size={18} />
                  <h3 className="text-sm font-bold text-slate-800">
                    Pratinjau Dokumen Rekapitulasi Keputusan
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <Printer size={14} /> Cetak / Unduh PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet */}
              <div className="p-6 md:p-10 overflow-y-auto bg-slate-100/50 print:p-0 print:bg-white">
                <div className="bg-white p-8 md:p-12 rounded-xl shadow-xs border border-slate-200 max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
                  {/* Kop Surat Organisasi */}
                  <div className="text-center pb-4 border-b-2 border-slate-900">
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
                      PANITIA PERINGATAN MILAD 200 TAHUN
                    </p>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-wide uppercase">
                      REKAPITULASI RESMI KEPUTUSAN ORGANISASI
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Sekretariat Bersama Milad 200 • Dokumen Kontrol Mutu & Keputusan Musyawarah
                    </p>
                  </div>
                  <div className="h-[2px] bg-slate-900 mt-1 mb-6" />

                  {/* Metadata Dokumen */}
                  <div className="grid grid-cols-2 text-xs text-slate-600 mb-6 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <p><span className="font-semibold text-slate-800">Nomor Arsip:</span> KEP/MILAD-200/XI/{new Date().getFullYear()}</p>
                      <p><span className="font-semibold text-slate-800">Tanggal Cetak:</span> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <p><span className="font-semibold text-slate-800">Total Keputusan:</span> {filteredDecisions.length} butir</p>
                      <p><span className="font-semibold text-slate-800">Status Filter:</span> {filterStatus === 'All' ? 'Semua Status' : filterStatus}</p>
                    </div>
                  </div>

                  {/* Tabel Keputusan */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden mb-8">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                          <th className="py-2.5 px-3 w-8 text-center border-r border-slate-300">No.</th>
                          <th className="py-2.5 px-3 border-r border-slate-300">Butir Keputusan</th>
                          <th className="py-2.5 px-3 w-36 border-r border-slate-300">Forum / Rapat</th>
                          <th className="py-2.5 px-3 w-28 border-r border-slate-300">Tanggal</th>
                          <th className="py-2.5 px-3 w-24 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredDecisions.map((item, idx) => (
                          <tr key={item.id} className="align-top">
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-semibold text-slate-600">{idx + 1}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-medium text-slate-900 leading-relaxed">{item.text}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700">{item.meetingTitle}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600 whitespace-nowrap">{formatDateDisplay(item.date)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-bold text-[10px] px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-800">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pengesahan Tanda Tangan */}
                  <div className="grid grid-cols-2 gap-8 text-xs text-center mt-10 pt-4">
                    <div>
                      <p className="text-slate-500 mb-16">Sekretaris Pelaksana,</p>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[160px]">
                        Sekretariat Panitia
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-16">Ketua Panitia Milad 200,</p>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[160px]">
                        {currentUser?.name || 'Ketua Panitia'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
