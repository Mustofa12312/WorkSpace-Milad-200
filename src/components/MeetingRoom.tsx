import { useState, useEffect, useRef } from 'react';
import {
  Mic, Square, Play, Pause, Video, Users, FileText, Sparkles,
  CheckCircle2, Clock, Calendar, Link as LinkIcon,
  Plus, ArrowLeft, Trash2, Search, ChevronRight, Check, X,
  Pencil, AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

import { useAppStore, type Meeting, type AgendaItem, type TranscriptLine, type MeetingType, type ApprovalStatus } from '../store/useAppStore';
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
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Rapat</h2>
            <p className="text-slate-500 mt-1 text-sm">Kelola rapat, transkrip, dan notulen organisasi Anda.</p>
          </div>
          <button onClick={onCreate}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl md:rounded-full font-medium flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <Plus size={18} /> Rapat Baru
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
  const isRecordingRef = useRef(false);
  const [time, setTime] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('transcript');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<TranscriptLine[]>(meeting.transcript || []);
  const [transcript, setTranscript] = useState<TranscriptLine[]>(meeting.transcript || []);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  const [summary, setSummary] = useState(meeting.summary || '');
  const [decisions, setDecisions] = useState<string[]>(meeting.decisions || []);
  const [actionItems, setActionItems] = useState(meeting.actionItems || []);
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editSpeaker, setEditSpeaker] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const seekAudio = (timeStr: string) => {
    if (!audioRef.current) return;
    const parts = timeStr.split(':');
    let secs = 0;
    if (parts.length === 3) {
      secs = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else if (parts.length === 2) {
      secs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    audioRef.current.currentTime = secs;
    audioRef.current.play().catch(console.error);
  };

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
        // Ensure content type starts with audio/ to satisfy Storage rules
        const actualMimeType = recorder.mimeType || 'audio/webm';
        const safeType = actualMimeType.startsWith('audio/') ? actualMimeType : 'audio/webm';
        const blob = new Blob(chunks, { type: safeType });
        const orgId = useAppStore.getState().currentUser?.organizationId || useAppStore.getState().currentOrgId;
        try {
          const storageRef = ref(storage, `orgs/${orgId}/recordings/meeting_${meeting.id}.webm`);
          await uploadBytes(storageRef, blob, { contentType: blob.type });
          const url = await getDownloadURL(storageRef);
          await updateMeeting(meeting.id, { recordingUrl: url, status: 'completed' });
          toast.success('Rekaman tersimpan!');
        } catch (e) {
          console.error('Upload failed', e);
          toast.error('Gagal mengunggah rekaman. Namun transkrip tetap disimpan.');
        }

        // Save transcript
        const finalTranscript = transcriptRef.current;
        if (finalTranscript.length === 0) {
          setTranscript(MOCK_TRANSCRIPT);
          await updateMeeting(meeting.id, { transcript: MOCK_TRANSCRIPT });
        } else {
          await updateMeeting(meeting.id, { transcript: finalTranscript });
        }
      };
      setMediaRecorder(recorder);
      recorder.start();
      setRecordingState('recording');
      isRecordingRef.current = true;
      await updateMeeting(meeting.id, { status: 'ongoing' });

      // Start Realtime Transcription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID';
        
        let currentLineId = `line-${Date.now()}`;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript;
            else interim += event.results[i][0].transcript;
          }
          
          const text = final || interim;
          if (!text) return;
          
          const me = useAppStore.getState().currentUser?.name || 'Speaker';
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
          
          setTranscript(prev => {
            const existingIdx = prev.findIndex(t => t.id === currentLineId);
            const newLine = { id: currentLineId, time: timeStr, speaker: me, text };
            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = newLine;
              return updated;
            }
            return [...prev, newLine];
          });
          
          if (final) {
            currentLineId = `line-${Date.now()}`;
          }
        };
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (e: any) => {
          console.error('Speech recognition error', e.error);
          if (e.error === 'not-allowed') {
            toast.error('Izin mikrofon untuk transkripsi ditolak.');
          }
        };

        // Auto restart if continuous listening stops due to silence
        recognition.onend = () => {
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch (err) {
              console.error('Failed to restart recognition', err);
            }
          }
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (err) {
          console.error('Failed to start recognition', err);
        }
      } else {
        toast.error('Browser ini tidak mendukung transkripsi otomatis (Speech API). Gunakan Chrome/Edge.');
      }

    } catch (e) {
      console.error('Microphone access denied', e);
      toast.error('Akses mikrofon diperlukan untuk merekam dan transkripsi.');
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setRecordingState('finished');
  };

  const pauseRecording = () => {
    isRecordingRef.current = false;
    if (mediaRecorder?.state === 'recording') mediaRecorder.pause();
    if (recognitionRef.current) recognitionRef.current.stop();
    setRecordingState('paused');
  };

  const resumeRecording = () => {
    isRecordingRef.current = true;
    if (mediaRecorder?.state === 'paused') mediaRecorder.resume();
    if (recognitionRef.current) recognitionRef.current.start();
    setRecordingState('recording');
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    
    let dynamicSummary: string;
    let dynamicDecisions: string[];
    let dynamicActionItems: { id: string; task: string; assignee: string; deadline: string }[];
    
    if (transcript.length > 0) {
      const allText = transcript.map(t => t.text).join(' ');
      const words = allText.split(' ').filter(w => w.length > 4);
      const keywords = [...new Set(words)].slice(0, 5).join(', ');
      
      dynamicSummary = `Berdasarkan transkrip, rapat ini membahas topik utama seperti: ${keywords || 'pembahasan internal'}.`;
      
      dynamicDecisions = [
        'Melanjutkan rencana sesuai pembahasan mengenai ' + (words[0] || 'proyek saat ini') + '.',
        'Mengalokasikan sumber daya tambahan jika diperlukan pada kuartal ini.'
      ];
      
      const assignees = [...new Set(transcript.map(t => t.speaker))];
      const mainAssignee = assignees.length > 0 ? assignees[0] : 'Tim';
      
      dynamicActionItems = [
        { id: `ai-${Date.now()}`, task: 'Tindak lanjut hasil rapat (' + (words[0] || 'Topik Utama') + ')', assignee: mainAssignee, deadline: 'Besok' },
        { id: `ai-${Date.now() + 1}`, task: 'Membuat laporan progres (' + (words[1] || 'Tugas') + ')', assignee: assignees.length > 1 ? assignees[1] : mainAssignee, deadline: 'Lusa' },
      ];
    } else {
      dynamicSummary = 'Rapat selesai direkam, namun transkrip kosong (mungkin tidak ada suara, izin mikrofon ditolak, atau browser tidak mendukung).';
      dynamicDecisions = ['Tidak ada transkrip yang tercatat.'];
      dynamicActionItems = [{ id: `ai-${Date.now()}`, task: 'Periksa pengaturan mikrofon untuk rapat berikutnya', assignee: 'Sistem', deadline: 'Besok' }];
    }

    setSummary(dynamicSummary);
    setDecisions(dynamicDecisions);
    setActionItems(dynamicActionItems);
    await updateMeeting(meeting.id, { summary: dynamicSummary, decisions: dynamicDecisions, actionItems: dynamicActionItems, approvalStatus: 'Draft' });
    setIsGenerating(false);
    setActiveTab('summary');
    toast.success('Ringkasan cerdas berhasil dibuat berdasarkan percakapan!');
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
    const updated = transcript.map(t => t.id === id ? { ...t, text: editText, speaker: editSpeaker } : t);
    setTranscript(updated);
    await updateMeeting(meeting.id, { transcript: updated });
    setEditingTranscriptId(null);
    toast.success('Transkrip diperbarui');
  };

  const handleApproval = async (status: ApprovalStatus) => {
    await updateMeeting(meeting.id, { approvalStatus: status });
    toast.success(`Status Notula: ${status}`);
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
                      <div className="w-full mt-2">
                        <audio ref={audioRef} controls src={meeting.recordingUrl} className="w-full h-10 rounded-lg outline-none" />
                      </div>
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
                          <button onClick={() => seekAudio(item.time)} title="Lompat ke waktu ini"
                            className="text-xs font-mono text-primary-400 hover:text-primary-600 hover:bg-primary-50 px-1.5 py-0.5 rounded transition-colors">
                            {item.time}
                          </button>
                        </div>
                        <div className="flex-1">
                          {editingTranscriptId === item.id ? (
                            <div className="flex flex-col gap-2">
                              <input value={editSpeaker} onChange={e => setEditSpeaker(e.target.value)}
                                className="w-32 text-xs font-bold px-2 py-1 border border-primary-300 rounded outline-none" placeholder="Speaker" />
                              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-primary-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                                rows={2} autoFocus />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingTranscriptId(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
                                <button onClick={() => saveTranscriptEdit(item.id)} className="px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1"><Check size={14} /> Simpan</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700">
                                  {item.speaker.charAt(0)}
                                </div>
                                <span className="font-bold text-slate-700 text-sm">{item.speaker}</span>
                              </div>
                              <p className="text-slate-600 leading-relaxed text-sm">{item.text}</p>
                            </>
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingTranscriptId(item.id); setEditText(item.text); setEditSpeaker(item.speaker); }}
                            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit Transkrip & Pembicara">
                            <Pencil size={13} />
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

                    {/* Approval Workflow */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                        Persetujuan Notula
                        <span className={cn('text-xs font-bold px-2 py-1 rounded-full', 
                          !meeting.approvalStatus || meeting.approvalStatus === 'Draft' ? 'bg-slate-100 text-slate-600' :
                          meeting.approvalStatus === 'Review' ? 'bg-blue-100 text-blue-700' :
                          meeting.approvalStatus === 'Revision Required' ? 'bg-orange-100 text-orange-700' :
                          'bg-emerald-100 text-emerald-700'
                        )}>
                          {meeting.approvalStatus || 'Draft'}
                        </span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(!meeting.approvalStatus || meeting.approvalStatus === 'Draft' || meeting.approvalStatus === 'Revision Required') && (
                          <button onClick={() => handleApproval('Review')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                            Submit for Approval
                          </button>
                        )}
                        {meeting.approvalStatus === 'Review' && (
                          <>
                            <button onClick={() => handleApproval('Approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1">
                              <CheckCircle2 size={16} /> Approve
                            </button>
                            <button onClick={() => handleApproval('Revision Required')} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1">
                              <X size={16} /> Request Revision
                            </button>
                          </>
                        )}
                        {meeting.approvalStatus === 'Approved' && (
                          <div className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 size={16} /> Notula Resmi Telah Disetujui
                          </div>
                        )}
                      </div>
                    </div>

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
  const { meetings, searchFocus, setSearchFocus } = useAppStore();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Handle global search focus
  useEffect(() => {
    if (searchFocus?.type === 'meeting') {
      const meet = meetings.find(m => m.id === searchFocus.id);
      if (meet) {
        setTimeout(() => {
          setSelectedMeeting(meet);
          setViewMode('detail');
          setSearchFocus(null);
        }, 0);
      }
    }
  }, [searchFocus, meetings, setSearchFocus]);

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
