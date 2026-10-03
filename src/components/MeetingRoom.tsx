import { useState, useEffect, useRef } from 'react';
import {
  Mic, Square, Play, Pause, Video, Users, FileText, Sparkles,
  CheckCircle2, Clock, MoreVertical, Calendar, Link as LinkIcon,
  Plus, ArrowLeft, Trash2, Search, ChevronRight, Check, X,
  Pencil, ExternalLink, AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

import { useAppStore, type Meeting, type AgendaItem, type TranscriptLine, type MeetingType } from '../store/useAppStore';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

type RecordingState = 'idle' | 'recording' | 'paused' | 'finished';
type ActiveTab = 'transcript' | 'summary';
type ViewMode = 'list' | 'detail' | 'create';

const MEETING_TYPES: MeetingType[] = ['Regular', 'Planning', 'Emergency', 'Evaluation', 'Project', 'Internal', 'External'];

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const TYPE_COLORS: Record<string, string> = {
  Regular: 'bg-slate-100 text-slate-700',
  Planning: 'bg-primary-100 text-primary-700',
  Emergency: 'bg-red-100 text-red-700',
  Evaluation: 'bg-purple-100 text-purple-700',
  Project: 'bg-indigo-100 text-indigo-700',
  Internal: 'bg-amber-100 text-amber-700',
  External: 'bg-emerald-100 text-emerald-700',
};

const MOCK_TRANSCRIPT: TranscriptLine[] = [
  { id: '1', time: '19:12', speaker: 'Ahmad', text: 'Untuk kegiatan seminar bulan depan, bagaimana progres persiapan tempatnya?' },
  { id: '2', time: '19:14', speaker: 'Mustofa', text: 'Saya sudah menghubungi pihak gedung, mereka meminta DP 50% minggu ini agar jadwal bisa dikunci.' },
  { id: '3', time: '19:18', speaker: 'Hasan', text: 'Bagaimana dengan anggarannya? Apakah kita masih punya cukup dana dari kas organisasi?' },
  { id: '4', time: '19:20', speaker: 'Mustofa', text: 'Kas masih cukup. Nanti saya akan buatkan pengajuannya, tapi Ahmad tolong buat proposal singkatnya paling lambat Jumat ya.' },
  { id: '5', time: '19:22', speaker: 'Ahmad', text: 'Baik, proposal akan saya siapkan.' },
];

// ─── Create Meeting Form ───────────────────────────────────────────────────────

function CreateMeetingForm({ onBack, onCreated }: { onBack: () => void; onCreated: (m: Meeting) => void }) {
  const { addMeeting, currentUser, projects, orgName } = useAppStore();
  const [form, setForm] = useState({
    title: '',
    type: 'Regular' as MeetingType,
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    onlineMeetingUrl: '',
    projectId: '',
    participants: '',
  });
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [newAgendaTitle, setNewAgendaTitle] = useState('');

  const addAgendaItem = () => {
    if (!newAgendaTitle.trim()) return;
    setAgenda(prev => [...prev, { id: `ag-${Date.now()}`, title: newAgendaTitle.trim() }]);
    setNewAgendaTitle('');
  };

  const removeAgendaItem = (id: string) => setAgenda(prev => prev.filter(a => a.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Judul rapat wajib diisi'); return; }
    const meeting: Meeting = {
      id: `meeting-${Date.now()}`,
      title: form.title.trim(),
      type: form.type,
      status: 'scheduled',
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location,
      onlineMeetingUrl: form.onlineMeetingUrl,
      organizer: currentUser?.name || orgName,
      participants: form.participants.split(',').map(p => p.trim()).filter(Boolean),
      agenda,
      projectId: form.projectId,
      transcript: [],
    };
    await addMeeting(meeting);
    toast.success('Rapat berhasil dibuat!');
    onCreated(meeting);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Kembali ke daftar rapat
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Buat Rapat Baru</h2>
          <p className="text-slate-500 text-sm mb-8">Isi detail rapat untuk menambahkannya ke jadwal.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Judul Rapat <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="cth. Rapat Pengurus: Persiapan Seminar"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                required
              />
            </div>

            {/* Type & Project */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jenis Rapat</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as MeetingType })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white transition-all"
                >
                  {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Proyek Terkait</label>
                <select
                  value={form.projectId}
                  onChange={e => setForm({ ...form, projectId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white transition-all"
                >
                  <option value="">— Tanpa proyek —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mulai</label>
                <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Selesai</label>
                <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lokasi (opsional)</label>
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="cth. Ruang Rapat Lantai 3"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Link Online (opsional)</label>
                <input type="url" value={form.onlineMeetingUrl} onChange={e => setForm({ ...form, onlineMeetingUrl: e.target.value })}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Peserta (pisahkan dengan koma)</label>
              <input type="text" value={form.participants} onChange={e => setForm({ ...form, participants: e.target.value })}
                placeholder="cth. Ahmad, Mustofa, Hasan"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
            </div>

            {/* Agenda */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Agenda</label>
              <div className="space-y-2 mb-3">
                {agenda.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="w-6 h-6 rounded bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm text-slate-700">{item.title}</span>
                    <button type="button" onClick={() => removeAgendaItem(item.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newAgendaTitle} onChange={e => setNewAgendaTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAgendaItem())}
                  placeholder="Tambahkan item agenda..."
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm" />
                <button type="button" onClick={addAgendaItem}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors flex items-center gap-1">
                  <Plus size={15} /> Tambah
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onBack}
                className="flex-1 px-5 py-2.5 border border-slate-300 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button type="submit"
                className="flex-1 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm">
                Buat Rapat
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Meeting List ─────────────────────────────────────────────────────────────

function MeetingList({ meetings, onSelect, onCreate }: {
  meetings: Meeting[];
  onSelect: (m: Meeting) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');
  const { deleteMeeting } = useAppStore();

  const filtered = meetings
    .filter(m => filter === 'all' ? true : m.status === filter)
    .filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteMeeting(id);
    toast.success('Rapat dihapus');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Meetings</h2>
            <p className="text-slate-500 mt-1 text-sm">Kelola rapat, transkrip, dan notulen organisasi Anda.</p>
          </div>
          <button onClick={onCreate}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl md:rounded-full font-medium flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <Plus size={18} /> New Meeting
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex-1 max-w-sm focus-within:ring-2 focus-within:ring-primary-500/20 transition-shadow">
            <Search size={16} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari rapat..."
              className="bg-transparent outline-none text-sm flex-1 placeholder-slate-400" />
          </div>
          <div className="flex gap-2">
            {(['all', 'scheduled', 'completed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize',
                  filter === f ? 'bg-primary-100 text-primary-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                )}>
                {f === 'all' ? 'Semua' : f === 'scheduled' ? 'Terjadwal' : 'Selesai'}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Calendar size={36} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Belum ada rapat</h3>
            <p className="text-slate-500 text-sm mb-6">Mulai dengan membuat rapat pertama Anda.</p>
            <button onClick={onCreate}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-sm">
              <Plus size={16} /> Buat Rapat
            </button>
          </div>
        )}

        {/* Meeting Cards */}
        <div className="space-y-3">
          {filtered.map(meeting => (
            <div key={meeting.id}
              onClick={() => onSelect(meeting)}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex items-center gap-4">
              {/* Left: Type badge */}
              <div className="flex-shrink-0">
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg', TYPE_COLORS[meeting.type] || 'bg-slate-100 text-slate-700')}>
                  {meeting.type}
                </span>
              </div>

              {/* Middle: Title & meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800 truncate group-hover:text-primary-600 transition-colors">{meeting.title}</h3>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0', STATUS_COLORS[meeting.status] || 'bg-slate-100 text-slate-500')}>
                    {meeting.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar size={12} />
                    {new Date(meeting.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {meeting.startTime} – {meeting.endTime}</span>
                  {meeting.participants.length > 0 && (
                    <span className="flex items-center gap-1"><Users size={12} /> {meeting.participants.length} peserta</span>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {meeting.transcript && meeting.transcript.length > 0 && (
                  <span className="hidden md:flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    <FileText size={10} /> Transkip
                  </span>
                )}
                {meeting.summary && (
                  <span className="hidden md:flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    <Sparkles size={10} /> Ringkasan
                  </span>
                )}
                <button onClick={e => handleDelete(e, meeting.id)}
                  className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={15} />
                </button>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-primary-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Detail ───────────────────────────────────────────────────────────

function MeetingDetail({ meeting, onBack }: { meeting: Meeting; onBack: () => void }) {
  const { updateMeeting, addTask, projects } = useAppStore();
  const idCounterRef = useRef(0);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [time, setTime] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('transcript');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>(meeting.transcript || []);
  const [summary, setSummary] = useState(meeting.summary || '');
  const [decisions, setDecisions] = useState<string[]>(meeting.decisions || []);
  const [actionItems, setActionItems] = useState(meeting.actionItems || []);
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (recordingState === 'recording') {
      interval = setInterval(() => setTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const orgId = useAppStore.getState().currentOrgId;
        try {
          const storageRef = ref(storage, `orgs/${orgId}/recordings/meeting_${meeting.id}.webm`);
          await uploadBytes(storageRef, blob, { contentType: blob.type });
          const url = await getDownloadURL(storageRef);
          await updateMeeting(meeting.id, { recordingUrl: url, status: 'completed' });
          toast.success('Rekaman tersimpan!');
          // Load mock transcript after recording
          const newTranscript = MOCK_TRANSCRIPT;
          setTranscript(newTranscript);
          await updateMeeting(meeting.id, { transcript: newTranscript });
        } catch (e) {
          console.error('Upload failed', e);
          toast.error('Gagal mengunggah rekaman.');
        }
      };
      setMediaRecorder(recorder);
      recorder.start();
      setRecordingState('recording');
      await updateMeeting(meeting.id, { status: 'ongoing' });
    } catch (e) {
      console.error('Microphone access denied', e);
      toast.error('Akses mikrofon diperlukan.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    setRecordingState('finished');
  };

  const pauseRecording = () => {
    if (mediaRecorder?.state === 'recording') mediaRecorder.pause();
    setRecordingState('paused');
  };

  const resumeRecording = () => {
    if (mediaRecorder?.state === 'paused') mediaRecorder.resume();
    setRecordingState('recording');
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    const mockSummary = 'Rapat membahas persiapan seminar bulan depan. Gedung dikonfirmasi dengan DP 50% minggu ini. Anggaran masih mencukupi dari kas organisasi.';
    const mockDecisions = [
      'Membayar DP gedung 50% minggu ini.',
      'Menggunakan kas organisasi untuk anggaran seminar.',
    ];
    const mockActionItems = [
      { id: `ai-${Date.now()}`, task: 'Membuat proposal singkat kegiatan seminar', assignee: 'Ahmad', deadline: 'Jumat' },
      { id: `ai-${Date.now() + 1}`, task: 'Membuat pengajuan anggaran DP gedung', assignee: 'Mustofa', deadline: 'Kamis' },
    ];
    setSummary(mockSummary);
    setDecisions(mockDecisions);
    setActionItems(mockActionItems);
    await updateMeeting(meeting.id, { summary: mockSummary, decisions: mockDecisions, actionItems: mockActionItems });
    setIsGenerating(false);
    setActiveTab('summary');
    toast.success('Ringkasan AI berhasil dibuat!');
  };

  const handleAddToKanban = async (item: { id: string; task: string; assignee: string; deadline: string }) => {
    idCounterRef.current += 1;
    await addTask({
      id: `task-ai-${idCounterRef.current}-${item.id}`,
      title: item.task,
      project: meeting.title,
      priority: 'High',
      status: 'backlog',
      dueDate: item.deadline,
      comments: 0, attachments: 0,
      assignee: item.assignee,
      meetingId: meeting.id,
    });
    toast.success(`"${item.task}" ditambahkan ke Kanban!`);
  };

  const saveTranscriptEdit = async (id: string) => {
    const updated = transcript.map(t => t.id === id ? { ...t, text: editText } : t);
    setTranscript(updated);
    await updateMeeting(meeting.id, { transcript: updated });
    setEditingTranscriptId(null);
    toast.success('Transkrip diperbarui');
  };

  const project = projects.find(p => p.id === meeting.projectId);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/50">

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={onBack} className="mt-1 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={cn('text-xs font-bold px-2 py-1 rounded-lg', TYPE_COLORS[meeting.type])}>
                  {meeting.type.toUpperCase()}
                </span>
                <span className={cn('text-xs font-bold px-2 py-1 rounded-full uppercase', STATUS_COLORS[meeting.status])}>
                  {meeting.status}
                </span>
                <span className="text-slate-500 text-xs flex items-center gap-1"><Calendar size={12} />
                  {new Date(meeting.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="text-slate-500 text-xs flex items-center gap-1"><Clock size={12} />
                  {meeting.startTime} – {meeting.endTime}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{meeting.title}</h2>
              {project && <p className="text-xs text-primary-600 mt-0.5">📁 {project.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {meeting.onlineMeetingUrl && (
              <button onClick={() => navigator.clipboard.writeText(meeting.onlineMeetingUrl!).then(() => toast.success('Link disalin!'))}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                <LinkIcon size={14} /> Copy Link
              </button>
            )}
            {meeting.onlineMeetingUrl && (
              <a href={meeting.onlineMeetingUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-xl transition-colors shadow-sm">
                <Video size={14} /> Join Call
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Body: 2-column */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Left sidebar */}
        <div className="w-full md:w-80 md:min-w-[320px] border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col overflow-y-auto md:max-h-full max-h-[45vh] custom-scrollbar">

          {/* Recording Controls */}
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Audio Rapat</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', recordingState === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-slate-300')} />
                <span className={cn('font-mono text-lg font-medium', recordingState === 'recording' ? 'text-slate-800' : 'text-slate-400')}>
                  {formatTime(time)}
                </span>
                {recordingState === 'recording' && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">LIVE</span>}
              </div>

              <div className="flex gap-2">
                {recordingState === 'idle' && (
                  <button onClick={startRecording}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                    <Mic size={14} /> Mulai Rekam
                  </button>
                )}
                {recordingState === 'recording' && (<>
                  <button onClick={pauseRecording} className="flex-1 flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Pause size={14} fill="currentColor" /> Jeda
                  </button>
                  <button onClick={stopRecording} className="flex-1 flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Square size={14} fill="currentColor" /> Stop
                  </button>
                </>)}
                {recordingState === 'paused' && (<>
                  <button onClick={resumeRecording} className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Play size={14} fill="currentColor" /> Lanjut
                  </button>
                  <button onClick={stopRecording} className="flex-1 flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Square size={14} fill="currentColor" /> Stop
                  </button>
                </>)}
                {recordingState === 'finished' && (
                  <div className="w-full space-y-2">
                    <div className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-500 py-2 rounded-lg text-sm">
                      <CheckCircle2 size={14} /> Rekaman Tersimpan
                    </div>
                    {meeting.recordingUrl && (
                      <a href={meeting.recordingUrl} target="_blank" rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 text-xs text-indigo-600 font-bold hover:underline">
                        <ExternalLink size={12} /> Putar Rekaman
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agenda */}
          {meeting.agenda.length > 0 && (
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Agenda</h3>
              <div className="space-y-3">
                {meeting.agenda.map((item, i) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded bg-primary-50 text-primary-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</div>
                    <div>
                      <h4 className="font-semibold text-slate-700 text-sm">{item.title}</h4>
                      {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants */}
          {meeting.participants.length > 0 && (
            <div className="p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Peserta ({meeting.participants.length})
              </h3>
              <div className="space-y-2">
                {meeting.participants.map(name => (
                  <div key={name} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-700">{name}</span>
                    {name === meeting.organizer && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">Organizer</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {meeting.participants.length === 0 && meeting.agenda.length === 0 && (
            <div className="p-5 text-center text-slate-400 text-sm">
              <AlertCircle size={24} className="mx-auto mb-2 text-slate-300" />
              Belum ada peserta atau agenda.
            </div>
          )}
        </div>

        {/* Right: Transcript & Summary */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">

          {/* Tabs */}
          <div className="flex items-center border-b border-slate-200 px-2 flex-shrink-0">
            <button
              onClick={() => setActiveTab('transcript')}
              className={cn('px-5 py-3.5 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
                activeTab === 'transcript' ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              )}>
              <FileText size={15} /> Transkrip
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={cn('px-5 py-3.5 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
                activeTab === 'summary' ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              )}>
              <Sparkles size={15} /> Ringkasan AI
              {summary && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

            {/* ─── TRANSCRIPT TAB ─── */}
            {activeTab === 'transcript' && (
              <div>
                {/* Generate banner */}
                {(recordingState === 'finished' || (transcript.length > 0 && !summary)) && !isGenerating && !summary && (
                  <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white flex justify-between items-center">
                    <div>
                      <h3 className="font-bold flex items-center gap-2"><Sparkles /> Buat Ringkasan AI</h3>
                      <p className="text-indigo-100 text-sm mt-1">AI akan mengekstrak keputusan dan action items dari transkrip ini.</p>
                    </div>
                    <button onClick={handleGenerateSummary}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-95 flex-shrink-0">
                      Generate Sekarang
                    </button>
                  </div>
                )}

                {isGenerating && (
                  <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center shadow-sm">
                    <Sparkles className="text-indigo-500 animate-spin mb-3" size={28} />
                    <h3 className="font-bold text-slate-800">AI sedang menganalisis transkrip...</h3>
                    <p className="text-slate-500 text-sm mt-1">Mengekstrak action items dan keputusan.</p>
                  </div>
                )}

                {/* Transcript lines */}
                {transcript.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Mic size={36} className="mx-auto mb-3 text-slate-200" />
                    <p className="font-medium text-slate-600">Belum ada transkrip</p>
                    <p className="text-sm mt-1">Mulai rekaman untuk menghasilkan transkrip secara otomatis.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {transcript.map(item => (
                      <div key={item.id} className="flex gap-4 group">
                        <div className="w-12 pt-1 flex-shrink-0">
                          <button className="text-xs font-mono text-primary-400 hover:text-primary-600 hover:bg-primary-50 px-1.5 py-0.5 rounded transition-colors">
                            {item.time}
                          </button>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700">
                              {item.speaker.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-700 text-sm">{item.speaker}</span>
                          </div>
                          {editingTranscriptId === item.id ? (
                            <div className="flex gap-2">
                              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                                className="flex-1 text-sm px-3 py-2 border border-primary-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                                rows={2} autoFocus />
                              <div className="flex flex-col gap-1">
                                <button onClick={() => saveTranscriptEdit(item.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                  <Check size={14} />
                                </button>
                                <button onClick={() => setEditingTranscriptId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-600 leading-relaxed text-sm">{item.text}</p>
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingTranscriptId(item.id); setEditText(item.text); }}
                            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                            <MoreVertical size={13} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {(recordingState === 'recording' || recordingState === 'paused') && (
                      <div className="flex gap-4 opacity-50 animate-pulse">
                        <div className="w-12 pt-1 text-xs font-mono text-slate-400">{formatTime(time).substring(3)}</div>
                        <div className="flex-1">
                          <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
                          <div className="h-3 w-3/4 bg-slate-200 rounded mb-1" />
                          <div className="h-3 w-1/2 bg-slate-200 rounded" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── SUMMARY TAB ─── */}
            {activeTab === 'summary' && (
              <div>
                {!summary && !isGenerating && (
                  <div className="text-center py-16 text-slate-400">
                    <Sparkles size={36} className="mx-auto mb-3 text-slate-200" />
                    <p className="font-medium text-slate-600">Belum ada ringkasan</p>
                    <p className="text-sm mt-1 mb-6">Rekam rapat dan hasilkan transkrip terlebih dahulu.</p>
                    {transcript.length > 0 && (
                      <button onClick={handleGenerateSummary}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-medium transition-colors shadow-sm">
                        <Sparkles size={15} /> Generate Ringkasan AI
                      </button>
                    )}
                  </div>
                )}

                {isGenerating && (
                  <div className="flex flex-col items-center py-16">
                    <Sparkles className="text-indigo-500 animate-spin mb-3" size={28} />
                    <h3 className="font-bold text-slate-800">AI sedang menganalisis...</h3>
                    <p className="text-slate-500 text-sm mt-1">Tunggu sebentar.</p>
                  </div>
                )}

                {summary && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                      <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Sparkles size={14} /> Ringkasan
                      </h4>
                      <p className="text-slate-700 text-sm leading-relaxed">{summary}</p>
                    </div>

                    {/* Decisions */}
                    {decisions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Keputusan Rapat</h4>
                        <div className="space-y-2">
                          {decisions.map((d, i) => (
                            <div key={i} className="flex gap-3 items-start p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                              <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-slate-700">{d}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Items */}
                    {actionItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Action Items → Kanban
                        </h4>
                        <div className="space-y-3">
                          {actionItems.map(item => (
                            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-semibold text-slate-800 text-sm">{item.task}</p>
                                <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded flex-shrink-0 ml-2">HIGH</span>
                              </div>
                              <div className="flex gap-4 text-xs text-slate-500 mb-3">
                                <span className="flex items-center gap-1"><Users size={11} /> {item.assignee}</span>
                                <span className="flex items-center gap-1 text-red-500"><Calendar size={11} /> {item.deadline}</span>
                              </div>
                              <button onClick={() => handleAddToKanban(item)}
                                className="w-full text-center text-xs bg-primary-50 border border-primary-200 text-primary-700 hover:bg-primary-100 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                                + Tambahkan ke Papan Kanban
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function MeetingRoom() {
  const { meetings } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Keep selected meeting in sync with Firestore updates
  const liveSelectedMeeting = selectedMeeting
    ? meetings.find(m => m.id === selectedMeeting.id) ?? selectedMeeting
    : null;

  if (viewMode === 'create') {
    return <CreateMeetingForm
      onBack={() => setViewMode('list')}
      onCreated={m => { setSelectedMeeting(m); setViewMode('detail'); }}
    />;
  }

  if (viewMode === 'detail' && liveSelectedMeeting) {
    return <MeetingDetail meeting={liveSelectedMeeting} onBack={() => { setViewMode('list'); setSelectedMeeting(null); }} />;
  }

  return <MeetingList meetings={meetings} onSelect={m => { setSelectedMeeting(m); setViewMode('detail'); }} onCreate={() => setViewMode('create')} />;
}
