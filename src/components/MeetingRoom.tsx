import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, Square, Play, Pause, Video, Users, FileText, Sparkles,
  CheckCircle2, Clock, Calendar,
  Plus, ArrowLeft, Trash2, Search, ChevronRight, Check, X,
  Pencil, AlertCircle, Copy, Key, Volume2, RefreshCw, Wand2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

import { useAppStore, type Meeting, type AgendaItem, type TranscriptLine, type MeetingType, type ApprovalStatus } from '../store/useAppStore';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  generateMeetingAnalysis,
  transcribeAudioBlobWithGemini,
  formatNotionMarkdown,
  getGeminiApiKey,
  setGeminiApiKey
} from '../lib/aiService';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

type RecordingMode = 'live' | 'audio';
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
    .filter(m => (m.title || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteMeeting(id);
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

// ─── Sound Wave Visualizer ───────────────────────────────────────────────────

function SoundWaveVisualizer({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-1 h-6 px-1" title={active ? 'Mendengarkan suara...' : 'Mikrofon nonaktif'}>
      {[40, 75, 100, 60, 90, 50, 80, 45, 65, 30].map((h, i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full transition-all duration-200',
            active
              ? 'bg-gradient-to-t from-indigo-500 via-primary-500 to-purple-400 animate-pulse'
              : 'bg-slate-300'
          )}
          style={{
            height: active ? `${h}%` : '20%',
            animationDelay: `${(i % 5) * 120}ms`,
            animationDuration: active ? '700ms' : '0ms',
          }}
        />
      ))}
    </div>
  );
}

// ─── Meeting Detail ───────────────────────────────────────────────────────────

function MeetingDetail({ meeting, onBack }: { meeting: Meeting; onBack: () => void }) {
  const { updateMeeting, addTask, projects, currentUser } = useAppStore();
  const idCounterRef = useRef(0);

  // Device check
  const isMobile = typeof navigator !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && /Macintosh/i.test(navigator.userAgent))
  );

  // Mode: Live Speech-to-Text (Notion Real-Time) vs HD Audio Recording
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('live');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const isRecordingRef = useRef(false);
  const [time, setTime] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('transcript');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);

  // Speech Recognition state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [interimText, setInterimText] = useState('');
  const interimTextRef = useRef('');
  useEffect(() => { interimTextRef.current = interimText; }, [interimText]);

  // Language & Speaker
  const [language, setLanguage] = useState<'id-ID' | 'en-US'>('id-ID');
  const defaultSpeaker = currentUser?.name || meeting.organizer || 'miladpanyeppenofficial';
  const [activeSpeaker, setActiveSpeaker] = useState(defaultSpeaker);
  const activeSpeakerRef = useRef(defaultSpeaker);
  useEffect(() => { activeSpeakerRef.current = activeSpeaker; }, [activeSpeaker]);

  // Audio recording
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [localAudioBlob, setLocalAudioBlob] = useState<Blob | null>(null);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(meeting.recordingUrl || null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Manual transcript inputs
  const [manualSpeaker, setManualSpeaker] = useState(defaultSpeaker);
  const [manualText, setManualText] = useState('');

  // Transcripts & AI results
  const transcriptRef = useRef<TranscriptLine[]>(meeting.transcript || []);
  const [transcript, setTranscript] = useState<TranscriptLine[]>(meeting.transcript || []);
  const [summary, setSummary] = useState(meeting.summary || '');
  const [decisions, setDecisions] = useState<string[]>(meeting.decisions || []);
  const [actionItems, setActionItems] = useState(meeting.actionItems || []);

  // Edit transcript line
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editSpeaker, setEditSpeaker] = useState('');

  // AI Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getGeminiApiKey());
  const [hasApiKey, setHasApiKey] = useState(() => Boolean(getGeminiApiKey()));

  // Keep transcriptRef in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Debounced auto-save transcript to Firestore
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSaveTranscript = useCallback((newTranscript: TranscriptLine[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateMeeting(meeting.id, { transcript: newTranscript });
      } catch (err) {
        console.warn('Auto-save transcript failed:', err);
      }
    }, 1500);
  }, [meeting.id, updateMeeting]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach(t => t.stop());
        } catch { /* ignore */ }
      }
    };
  }, [mediaRecorder]);

  // Timer interval
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

  // ─── Speech Engine (Conflict-Free on Mobile) ──────────────────────────────

  const speechEngineRef = useRef<() => void>(() => {});

  useEffect(() => {
    speechEngineRef.current = () => {
      if (!isRecordingRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSpeechSupported(false);
        setIsSpeechActive(false);
        return;
      }

      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch { /* ignore */ }
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let interim = '';
          let finalUtterance = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalUtterance += chunk;
            } else {
              interim += chunk;
            }
          }

          if (interim) {
            setInterimText(interim.trim());
          }

          if (finalUtterance.trim()) {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            const newLine: TranscriptLine = {
              id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              time: timeStr,
              speaker: activeSpeakerRef.current || defaultSpeaker,
              text: finalUtterance.trim(),
            };

            setTranscript(prev => {
              const updated = [...prev, newLine];
              debouncedSaveTranscript(updated);
              return updated;
            });
            setInterimText('');
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (e: any) => {
          if (e.error === 'no-speech' || e.error === 'aborted') {
            return;
          }
          console.warn('Speech recognition warning:', e.error);
          if (e.error === 'not-allowed') {
            setIsSpeechSupported(false);
            setIsSpeechActive(false);
            toast.error('Izin mikrofon diblokir browser. Harap izinkan mikrofon di pengaturan browser HP.');
          } else if (e.error === 'audio-capture') {
            console.warn('Microphone exclusive conflict on mobile, scheduling recovery...');
          }
        };

        recognition.onend = () => {
          // If speaker paused, commit any leftover interim text so words are not lost!
          const pending = interimTextRef.current.trim();
          if (pending) {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            const flushedLine: TranscriptLine = {
              id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              time: timeStr,
              speaker: activeSpeakerRef.current || defaultSpeaker,
              text: pending,
            };
            setTranscript(prev => {
              const updated = [...prev, flushedLine];
              debouncedSaveTranscript(updated);
              return updated;
            });
            setInterimText('');
          }

          if (isRecordingRef.current) {
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            restartTimerRef.current = setTimeout(() => {
              if (isRecordingRef.current) {
                speechEngineRef.current();
              }
            }, 250);
          } else {
            setIsSpeechActive(false);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsSpeechActive(true);
        setIsSpeechSupported(true);
      } catch (err) {
        console.warn('SpeechRecognition startup error, retrying smoothly:', err);
        if (isRecordingRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isRecordingRef.current) speechEngineRef.current();
          }, 600);
        }
      }
    };
  }, [language, defaultSpeaker, debouncedSaveTranscript]);

  // ─── Recording Controls ───────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      isRecordingRef.current = true;
      setRecordingState('recording');
      await updateMeeting(meeting.id, { status: 'ongoing' });

      if (recordingMode === 'live') {
        // Mode 1: Live Voice Transcription (Notion Real-Time)
        // Request mic permission on mobile, then immediately release tracks so hardware mic is 100% free for Web Speech API!
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(t => t.stop());
        } catch (permErr) {
          console.warn('Microphone permission check:', permErr);
        }

        speechEngineRef.current();
        toast.success('Transkripsi suara aktif! Bicaralah ke mikrofon.');
      } else {
        // Mode 2: Audio Recording to Cloud Storage (MediaRecorder)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
        const chosenMime = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
        const recorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : undefined);
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = e => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          const actualMime = recorder.mimeType || 'audio/webm';
          const safeType = actualMime.startsWith('audio/') ? actualMime : 'audio/webm';
          const blob = new Blob(chunks, { type: safeType });
          setLocalAudioBlob(blob);
          const objUrl = URL.createObjectURL(blob);
          setLocalAudioUrl(objUrl);

          const orgId = useAppStore.getState().currentUser?.organizationId || useAppStore.getState().currentOrgId;
          try {
            const ext = safeType.includes('mp4') ? 'mp4' : 'webm';
            const storageRef = ref(storage, `orgs/${orgId}/recordings/meeting_${meeting.id}.${ext}`);
            await uploadBytes(storageRef, blob, { contentType: blob.type });
            const url = await getDownloadURL(storageRef);
            await updateMeeting(meeting.id, { recordingUrl: url, status: 'completed' });
            setLocalAudioUrl(url);
            toast.success('Rekaman tersimpan di cloud!');
          } catch (e) {
            console.error('Upload failed', e);
            toast.error('Gagal mengunggah ke cloud, tetapi rekaman tersimpan lokal di sesi ini.');
          }

          // Persist final transcript
          await updateMeeting(meeting.id, { transcript: transcriptRef.current });
        };

        setMediaRecorder(recorder);
        recorder.start(1000); // 1-second timeslices for reliability
        toast.success('Merekam audio HD...');
      }
    } catch (e) {
      console.error('Recording initialization error', e);
      isRecordingRef.current = false;
      setRecordingState('idle');
      toast.error('Gagal mengakses mikrofon. Pastikan izin mikrofon telah diberikan.');
    }
  };

  const pauseRecording = () => {
    isRecordingRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

    if (recordingMode === 'live') {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      setIsSpeechActive(false);
    } else {
      if (mediaRecorder?.state === 'recording') mediaRecorder.pause();
    }
    setRecordingState('paused');
  };

  const resumeRecording = () => {
    isRecordingRef.current = true;
    if (recordingMode === 'live') {
      speechEngineRef.current();
    } else {
      if (mediaRecorder?.state === 'paused') mediaRecorder.resume();
    }
    setRecordingState('recording');
  };

  const stopRecording = async () => {
    isRecordingRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

    if (recordingMode === 'live') {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      setIsSpeechActive(false);
      // Flush pending interim
      if (interimTextRef.current.trim()) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        const flushedLine: TranscriptLine = {
          id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          time: timeStr,
          speaker: activeSpeakerRef.current || defaultSpeaker,
          text: interimTextRef.current.trim(),
        };
        const finalUpdated = [...transcriptRef.current, flushedLine];
        setTranscript(finalUpdated);
        await updateMeeting(meeting.id, { transcript: finalUpdated, status: 'completed' });
        setInterimText('');
      } else {
        await updateMeeting(meeting.id, { transcript: transcriptRef.current, status: 'completed' });
      }
      toast.success('Transkripsi selesai dan tersimpan!');
    } else {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach(t => t.stop());
        } catch { /* ignore */ }
      }
    }

    setRecordingState('finished');
  };

  // ─── AI Audio Transcription (Gemini) ──────────────────────────────────────

  const handleTranscribeAudioWithAI = async () => {
    const key = getGeminiApiKey();
    if (!key) {
      setShowAiModal(true);
      return;
    }

    setIsTranscribingAudio(true);
    try {
      let blobToUse = localAudioBlob;
      if (!blobToUse && (localAudioUrl || meeting.recordingUrl)) {
        const targetUrl = localAudioUrl || meeting.recordingUrl!;
        const res = await fetch(targetUrl);
        blobToUse = await res.blob();
      }

      if (!blobToUse) {
        toast.error('Tidak ada rekaman audio yang ditemukan untuk ditranskripsikan.');
        setIsTranscribingAudio(false);
        return;
      }

      toast.loading('AI Gemini sedang mentranskripsi audio rekaman...', { id: 'ai-stt' });
      const newLines = await transcribeAudioBlobWithGemini(blobToUse, meeting.title, defaultSpeaker);

      const merged = [...transcript, ...newLines];
      setTranscript(merged);
      await updateMeeting(meeting.id, { transcript: merged });
      toast.success(`Berhasil mentranskripsi ${newLines.length} baris percakapan!`, { id: 'ai-stt' });

      // Automatically trigger AI Summary if none exists
      if (!summary) {
        handleGenerateSummary(merged);
      }
    } catch (err) {
      console.error('AI Audio Transcription failed:', err);
      const msg = err instanceof Error ? err.message : 'Gagal mentranskripsi audio dengan AI.';
      toast.error(msg, { id: 'ai-stt' });
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  // ─── Manual & Agenda Transcripts ──────────────────────────────────────────

  const handleAddManualTranscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const newLine: TranscriptLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: timeStr,
      speaker: manualSpeaker.trim() || defaultSpeaker,
      text: manualText.trim(),
    };

    const updated = [...transcript, newLine];
    setTranscript(updated);
    await updateMeeting(meeting.id, { transcript: updated });
    setManualText('');
    toast.success('Catatan ditambahkan ke transkrip');
  };

  const handleGenerateFromAgenda = async () => {
    const me = defaultSpeaker;
    const newLines: TranscriptLine[] = [];
    const baseTime = new Date();

    if (meeting.agenda && meeting.agenda.length > 0) {
      meeting.agenda.forEach((ag, idx) => {
        const lineTime = new Date(baseTime.getTime() + idx * 5 * 60000);
        const timeStr = `${lineTime.getHours().toString().padStart(2, '0')}:${lineTime.getMinutes().toString().padStart(2, '0')}:00`;
        newLines.push({
          id: `line-agenda-${idx}-${Date.now()}`,
          time: timeStr,
          speaker: meeting.participants[idx % Math.max(1, meeting.participants.length)] || me,
          text: `Membahas agenda "${ag.title}": ${ag.description || 'Penyampaian pokok bahasan dan kesepakatan langkah bersama.'}`,
        });
      });
    } else {
      newLines.push(
        {
          id: `line-draft-1-${Date.now()}`,
          time: '09:05:00',
          speaker: meeting.organizer || me,
          text: `Pembukaan rapat "${meeting.title}" dan pemaparan latar belakang kebutuhan.`,
        },
        {
          id: `line-draft-2-${Date.now()}`,
          time: '09:20:00',
          speaker: me,
          text: 'Penyampaian rencana pelaksanaan, evaluasi hambatan, dan alokasi tugas tindak lanjut.',
        }
      );
    }

    const updated = [...transcript, ...newLines];
    setTranscript(updated);
    await updateMeeting(meeting.id, { transcript: updated });
    toast.success('Draf transkrip dari agenda berhasil dibuat!');
  };

  // ─── AI Summary Generation (Notion AI Style) ──────────────────────────────

  const handleGenerateSummary = async (customTranscript?: TranscriptLine[]) => {
    setIsGenerating(true);
    const targetTranscript = customTranscript || transcript;

    try {
      const result = await generateMeetingAnalysis(
        targetTranscript,
        meeting.agenda || [],
        meeting.title,
        meeting.organizer || defaultSpeaker
      );

      setSummary(result.summary);
      setDecisions(result.decisions);
      setActionItems(result.actionItems);

      await updateMeeting(meeting.id, {
        summary: result.summary,
        decisions: result.decisions,
        actionItems: result.actionItems,
        approvalStatus: meeting.approvalStatus || 'Draft',
      });

      setActiveTab('summary');
      toast.success('Ringkasan cerdas & action items berhasil dibuat!');
    } catch (err) {
      console.error('Summary error:', err);
      toast.error('Gagal menghasilkan ringkasan AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Notion Format Copy ───────────────────────────────────────────────────

  const handleCopyNotionMarkdown = () => {
    const md = formatNotionMarkdown(
      meeting.title,
      meeting.date,
      `${meeting.startTime} - ${meeting.endTime}`,
      meeting.organizer || defaultSpeaker,
      meeting.participants || [],
      summary,
      decisions,
      actionItems,
      transcript
    );
    navigator.clipboard.writeText(md).then(() => {
      toast.success('Notula format Notion (Markdown) berhasil disalin!');
    }).catch(() => {
      toast.error('Gagal menyalin ke papan klip');
    });
  };

  // ─── Kanban & Approval ────────────────────────────────────────────────────

  const handleAddToKanban = async (item: { id: string; task: string; assignee: string; deadline: string }) => {
    idCounterRef.current += 1;
    await addTask({
      id: `task-ai-${idCounterRef.current}-${item.id}`,
      title: item.task,
      project: meeting.title,
      priority: 'High',
      status: 'backlog',
      dueDate: item.deadline,
      comments: 0,
      attachments: 0,
      assignee: item.assignee,
      meetingId: meeting.id,
    });
    toast.success(`"${item.task}" ditambahkan ke Kanban!`);
  };

  const saveTranscriptEdit = async (id: string) => {
    const updated = transcript.map(t => (t.id === id ? { ...t, text: editText, speaker: editSpeaker } : t));
    setTranscript(updated);
    await updateMeeting(meeting.id, { transcript: updated });
    setEditingTranscriptId(null);
    toast.success('Transkrip diperbarui');
  };

  const deleteTranscriptLine = async (id: string) => {
    const updated = transcript.filter(t => t.id !== id);
    setTranscript(updated);
    await updateMeeting(meeting.id, { transcript: updated });
    toast.success('Baris transkrip dihapus');
  };

  const handleApproval = async (status: ApprovalStatus) => {
    await updateMeeting(meeting.id, { approvalStatus: status });
    toast.success(`Status Notula: ${status}`);
  };

  const saveGeminiKey = () => {
    setGeminiApiKey(apiKeyInput);
    setHasApiKey(Boolean(apiKeyInput.trim()));
    setShowAiModal(false);
    toast.success(apiKeyInput.trim() ? 'Kunci Gemini AI berhasil disimpan!' : 'Kunci Gemini AI dihapus.');
  };

  const project = projects.find(p => p.id === meeting.projectId);
  const displayAudioUrl = localAudioUrl || meeting.recordingUrl;
  const participantOptions = Array.from(new Set([defaultSpeaker, ...(meeting.participants || [])])).filter(Boolean);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/50">

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <button onClick={onBack} className="mt-1 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" title="Kembali">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-lg', TYPE_COLORS[meeting.type])}>
                  {meeting.type.toUpperCase()}
                </span>
                <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1', STATUS_COLORS[meeting.status])}>
                  {recordingState === 'recording' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                  {recordingState === 'recording' ? 'LIVE' : meeting.status}
                </span>
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(meeting.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  <Clock size={12} />
                  {meeting.startTime} – {meeting.endTime}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                {meeting.title}
                {project && <span className="text-xs font-normal text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">📁 {project.name}</span>}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
            {/* Notion Copy Button */}
            <button
              onClick={handleCopyNotionMarkdown}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl transition-all shadow-xs"
              title="Salin notulen dalam format Markdown Notion"
            >
              <Copy size={13} className="text-indigo-600" /> Salin Notion
            </button>

            {/* AI Config Key */}
            <button
              onClick={() => setShowAiModal(true)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all shadow-xs',
                hasApiKey
                  ? 'bg-indigo-50/80 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
              title="Pengaturan Google Gemini AI Key"
            >
              <Key size={13} className={hasApiKey ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{hasApiKey ? 'AI Aktif' : 'Atur AI Key'}</span>
            </button>

            {meeting.onlineMeetingUrl && (
              <a
                href={meeting.onlineMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-xl transition-colors shadow-xs"
              >
                <Video size={13} /> Join Call
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Body: 2-column on desktop, responsive stack on mobile */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Left Sidebar: Controls & Info */}
        <div className="w-full md:w-80 md:min-w-[320px] border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col overflow-y-auto md:max-h-full max-h-[38vh] custom-scrollbar">

          {/* Audio & Live Recording Control Card */}
          <div className="p-4 md:p-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 size={13} className="text-primary-500" /> Transkripsi & Audio
              </h3>

              {/* Language Selector */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setLanguage('id-ID')}
                  className={cn('px-2 py-0.5 rounded-md transition-colors', language === 'id-ID' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800')}
                >
                  🇮🇩 ID
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en-US')}
                  className={cn('px-2 py-0.5 rounded-md transition-colors', language === 'en-US' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800')}
                >
                  🇬🇧 EN
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            {recordingState === 'idle' && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-xl mb-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRecordingMode('live')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all',
                    recordingMode === 'live'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Sparkles size={13} className={recordingMode === 'live' ? 'text-indigo-600' : 'text-slate-400'} />
                  {isMobile ? 'Live (HP)' : 'Transkrip Live'}
                </button>
                <button
                  type="button"
                  onClick={() => setRecordingMode('audio')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all',
                    recordingMode === 'audio'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Mic size={13} className={recordingMode === 'audio' ? 'text-indigo-600' : 'text-slate-400'} />
                  Rekam Berkas
                </button>
              </div>
            )}

            {/* Active Card */}
            <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              {/* Timer & Wave */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', recordingState === 'recording' ? 'bg-red-500 animate-ping' : 'bg-slate-300')} />
                  <span className={cn('font-mono text-lg font-bold tracking-tight', recordingState === 'recording' ? 'text-slate-800' : 'text-slate-400')}>
                    {formatTime(time)}
                  </span>
                  {recordingState === 'recording' && (
                    <span className="text-[10px] font-extrabold text-red-600 bg-red-100/80 px-2 py-0.5 rounded-full tracking-wide animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>

                {/* Sound wave visualizer */}
                <SoundWaveVisualizer active={recordingState === 'recording'} />
              </div>

              {/* Active Speaker Chip */}
              <div className="mb-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Pembicara Aktif:</span>
                <select
                  value={activeSpeaker}
                  onChange={e => setActiveSpeaker(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none max-w-[150px] truncate"
                >
                  {participantOptions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Primary Buttons */}
              <div className="flex gap-2">
                {recordingState === 'idle' && (
                  <button
                    onClick={startRecording}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-700 hover:from-primary-700 hover:to-indigo-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
                  >
                    <Mic size={15} />
                    {recordingMode === 'live' ? 'Mulai Transkripsi Live' : 'Mulai Rekam Berkas'}
                  </button>
                )}

                {recordingState === 'recording' && (
                  <>
                    <button
                      onClick={pauseRecording}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 py-2.5 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Pause size={14} fill="currentColor" /> Jeda
                    </button>
                    <button
                      onClick={stopRecording}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <Square size={14} fill="currentColor" /> Selesai
                    </button>
                  </>
                )}

                {recordingState === 'paused' && (
                  <>
                    <button
                      onClick={resumeRecording}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <Play size={14} fill="currentColor" /> Lanjut
                    </button>
                    <button
                      onClick={stopRecording}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <Square size={14} fill="currentColor" /> Selesai
                    </button>
                  </>
                )}

                {recordingState === 'finished' && (
                  <div className="w-full space-y-2.5">
                    <div className="w-full flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200/70 rounded-xl text-xs text-emerald-800 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600" /> Selesai Direkam
                      </span>
                      <button
                        onClick={startRecording}
                        className="text-[11px] underline font-bold text-emerald-700 hover:text-emerald-900"
                      >
                        Rekam Lagi
                      </button>
                    </div>

                    {/* Audio Player if available */}
                    {displayAudioUrl && (
                      <div className="w-full bg-slate-100 p-2 rounded-xl">
                        <audio ref={audioRef} controls src={displayAudioUrl} className="w-full h-8 outline-none" />
                      </div>
                    )}

                    {/* One-click AI Audio Transcription Button */}
                    {(displayAudioUrl || localAudioBlob) && (
                      <button
                        onClick={handleTranscribeAudioWithAI}
                        disabled={isTranscribingAudio}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                      >
                        {isTranscribingAudio ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" /> Sedang Mentranskripsi...
                          </>
                        ) : (
                          <>
                            <Wand2 size={13} /> Transkripsi Rekaman dengan AI
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agenda section */}
          {meeting.agenda && meeting.agenda.length > 0 && (
            <div className="p-4 md:p-5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                Agenda Rapat ({meeting.agenda.length})
              </h3>
              <div className="space-y-2">
                {meeting.agenda.map((item, i) => (
                  <div key={item.id} className="flex gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="w-4 h-4 rounded bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-slate-800">{item.title}</h4>
                      {item.description && <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants */}
          {meeting.participants && meeting.participants.length > 0 && (
            <div className="p-4 md:p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Users size={12} /> Peserta ({meeting.participants.length})
              </h3>
              <div className="space-y-1.5">
                {meeting.participants.map(name => (
                  <div key={name} className="flex items-center gap-2 text-xs text-slate-700 py-1 px-1.5 rounded-lg hover:bg-slate-50">
                    <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-700">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium flex-1 truncate">{name}</span>
                    {name === meeting.organizer && (
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">Host</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!meeting.participants || meeting.participants.length === 0) && (!meeting.agenda || meeting.agenda.length === 0) && (
            <div className="p-4 text-center text-slate-400 text-xs">
              <AlertCircle size={20} className="mx-auto mb-1 text-slate-300" />
              Belum ada peserta atau agenda tertulis.
            </div>
          )}
        </div>

        {/* Right Area: Transcripts & Summary */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">

          {/* Tabs */}
          <div className="flex items-center border-b border-slate-200 px-4 flex-shrink-0 bg-white">
            <button
              onClick={() => setActiveTab('transcript')}
              className={cn(
                'px-4 py-3 border-b-2 font-bold text-xs md:text-sm flex items-center gap-2 transition-colors',
                activeTab === 'transcript' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <FileText size={15} /> Transkrip Percakapan ({transcript.length})
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={cn(
                'px-4 py-3 border-b-2 font-bold text-xs md:text-sm flex items-center gap-2 transition-colors',
                activeTab === 'summary' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Sparkles size={15} className="text-indigo-600" /> Ringkasan AI
              {summary && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">

            {/* ─── TRANSCRIPT TAB ─── */}
            {activeTab === 'transcript' && (
              <div>
                {/* AI Summary Banner Promo */}
                {transcript.length > 0 && !summary && !isGenerating && (
                  <div className="mb-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-primary-600 rounded-2xl p-4 md:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div>
                      <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                        <Sparkles size={18} /> Buat Ringkasan AI Notion-Style
                      </h3>
                      <p className="text-indigo-100 text-xs mt-0.5">
                        Ekstrak poin penting, keputusan rapat, dan action items otomatis ke Kanban.
                      </p>
                    </div>
                    <button
                      onClick={() => handleGenerateSummary()}
                      className="bg-white text-indigo-700 px-4 py-2 rounded-xl font-bold text-xs hover:shadow-md transition-all active:scale-95 flex-shrink-0 self-start sm:self-auto"
                    >
                      Generate Sekarang
                    </button>
                  </div>
                )}

                {/* AI Generating Skeleton */}
                {isGenerating && (
                  <div className="mb-5 bg-indigo-50/50 border border-indigo-200 rounded-2xl p-6 flex flex-col items-center shadow-xs">
                    <Sparkles className="text-indigo-600 animate-spin mb-2" size={26} />
                    <h3 className="font-bold text-slate-800 text-sm">AI sedang menganalisis transkrip...</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Menyusun ringkasan eksekutif dan tugas lanjutan.</p>
                  </div>
                )}

                {/* ─── LIVE SPEECH BUBBLE (Notion AI Real-Time Streaming) ─── */}
                {isSpeechActive && (
                  <div className="mb-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/90 rounded-2xl p-4 shadow-sm animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <Mic size={13} className="text-emerald-600" />
                          {activeSpeaker} <span className="font-normal text-slate-500 text-[11px]">(Sedang Berbicara...)</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono bg-white border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold shadow-2xs">
                        LIVE AI
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 leading-relaxed min-h-[24px]">
                      {interimText ? (
                        <>
                          <span>{interimText}</span>
                          <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-600 animate-pulse align-middle" />
                        </>
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          Mendengarkan suara Anda... Silakan berbicara ke mikrofon, kata-kata akan otomatis muncul di sini.
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Status Notice if Speech API not supported */}
                {!isSpeechSupported && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Browser ini membatasi Speech Recognition langsung.</p>
                      <p className="text-[11px] mt-0.5 text-amber-700">
                        Untuk transkripsi live otomatis, disarankan membuka via <strong>Google Chrome</strong> di HP. Anda juga dapat menggunakan mode <strong>Rekam Berkas</strong> lalu klik <em>Transkripsi Rekaman dengan AI</em>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {transcript.length === 0 && !isSpeechActive ? (
                  <div className="text-center py-10 md:py-14 text-slate-400 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 p-6 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <Mic size={26} className="text-indigo-400" />
                    </div>
                    <p className="font-bold text-slate-800 text-base">Belum Ada Transkrip Percakapan</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                      Tekan tombol <strong className="text-indigo-600 font-semibold">Mulai Transkripsi Live</strong> di sebelah kiri dan bicaralah, gunakan draf dari agenda, atau catat manual di bawah.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5 justify-center">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                      >
                        <Mic size={14} /> Mulai Berbicara Sekarang
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateFromAgenda}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-700 text-xs font-bold rounded-xl transition-all shadow-xs"
                      >
                        <Sparkles size={14} className="text-indigo-500" /> Buat Draf dari Agenda
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Transcript Lines Feed */
                  <div className="space-y-3.5 mb-6">
                    {transcript.map(item => (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 rounded-xl hover:bg-slate-50/80 border border-transparent hover:border-slate-100 transition-colors group"
                      >
                        <div className="w-12 pt-0.5 flex-shrink-0">
                          <button
                            onClick={() => seekAudio(item.time)}
                            title="Lompat ke waktu ini"
                            className="text-[11px] font-mono text-primary-600 bg-primary-50 hover:bg-primary-100 px-1.5 py-0.5 rounded transition-colors"
                          >
                            {item.time}
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          {editingTranscriptId === item.id ? (
                            <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-primary-200 shadow-xs">
                              <input
                                value={editSpeaker}
                                onChange={e => setEditSpeaker(e.target.value)}
                                className="w-full sm:w-44 text-xs font-bold px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-primary-500"
                                placeholder="Nama Pembicara"
                              />
                              <textarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary-500 resize-none"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingTranscriptId(null)}
                                  className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={() => saveTranscriptEdit(item.id)}
                                  className="px-3 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold flex items-center gap-1"
                                >
                                  <Check size={13} /> Simpan
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                                  {item.speaker.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-800 text-xs md:text-sm">{item.speaker}</span>
                              </div>
                              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{item.text}</p>
                            </>
                          )}
                        </div>

                        {/* Line Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0 self-start">
                          <button
                            onClick={() => {
                              setEditingTranscriptId(item.id);
                              setEditText(item.text);
                              setEditSpeaker(item.speaker);
                            }}
                            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteTranscriptLine(item.id)}
                            className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual Input Form */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus size={13} className="text-primary-500" /> Tambah Catatan Manual
                    </label>
                    {transcript.length > 0 && (
                      <button
                        type="button"
                        onClick={handleGenerateFromAgenda}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Sparkles size={12} /> Tambah Draf dari Agenda
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleAddManualTranscript} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={manualSpeaker}
                      onChange={e => setManualSpeaker(e.target.value)}
                      placeholder="Nama Pembicara"
                      className="w-full sm:w-40 text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-800"
                    />
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={manualText}
                        onChange={e => setManualText(e.target.value)}
                        placeholder="Ketik catatan atau poin pembicaraan..."
                        className="flex-1 text-xs md:text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-800"
                      />
                      <button
                        type="submit"
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 flex-shrink-0"
                      >
                        <Plus size={14} /> Tambah
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ─── SUMMARY TAB ─── */}
            {activeTab === 'summary' && (
              <div>
                {!summary && !isGenerating && (
                  <div className="text-center py-12 md:py-16 text-slate-400">
                    <Sparkles size={36} className="mx-auto mb-3 text-indigo-300" />
                    <p className="font-bold text-slate-700 text-base">Belum Ada Ringkasan AI</p>
                    <p className="text-xs text-slate-500 mt-1 mb-5 max-w-sm mx-auto">
                      AI akan menyusun ringkasan eksekutif, mengekstrak keputusan penting, serta menghasilkan action items untuk papan Kanban.
                    </p>
                    {transcript.length > 0 ? (
                      <button
                        onClick={() => handleGenerateSummary()}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
                      >
                        <Sparkles size={14} /> Generate Ringkasan AI Sekarang
                      </button>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Mulai transkrip atau rekam rapat terlebih dahulu.</p>
                    )}
                  </div>
                )}

                {isGenerating && (
                  <div className="flex flex-col items-center py-16">
                    <Sparkles className="text-indigo-600 animate-spin mb-3" size={28} />
                    <h3 className="font-bold text-slate-800 text-sm">AI sedang menganalisis rapat...</h3>
                    <p className="text-slate-500 text-xs mt-1">Menyusun ringkasan, keputusan, dan penugasan tim.</p>
                  </div>
                )}

                {summary && (
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white rounded-2xl p-5 border border-indigo-100 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={14} className="text-indigo-600" /> Ringkasan Eksekutif
                        </h4>
                        <button
                          onClick={() => handleGenerateSummary()}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          title="Generate ulang ringkasan"
                        >
                          <RefreshCw size={11} /> Refresh AI
                        </button>
                      </div>
                      <p className="text-slate-700 text-xs md:text-sm leading-relaxed">{summary}</p>
                    </div>

                    {/* Decisions */}
                    {decisions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                          Keputusan yang Disepakati
                        </h4>
                        <div className="space-y-2">
                          {decisions.map((d, i) => (
                            <div key={i} className="flex gap-2.5 items-start p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs md:text-sm">
                              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                              <p className="text-slate-800 leading-snug">{d}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Items */}
                    {actionItems.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Action Items → Kanban
                          </h4>
                          <span className="text-[11px] text-slate-400">Siap diekspor ke tugas proyek</span>
                        </div>
                        <div className="space-y-2.5">
                          {actionItems.map(item => (
                            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">HIGH</span>
                                  <p className="font-semibold text-slate-800 text-xs md:text-sm">{item.task}</p>
                                </div>
                                <div className="flex gap-4 text-[11px] text-slate-500">
                                  <span className="flex items-center gap-1"><Users size={11} /> {item.assignee}</span>
                                  <span className="flex items-center gap-1 text-red-500"><Calendar size={11} /> {item.deadline}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddToKanban(item)}
                                className="bg-primary-50 border border-primary-200 text-primary-700 hover:bg-primary-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 self-start sm:self-auto"
                              >
                                + Papan Kanban
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approval Workflow */}
                    <div className="pt-5 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Status Persetujuan Notula
                        </h4>
                        <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full',
                          !meeting.approvalStatus || meeting.approvalStatus === 'Draft' ? 'bg-slate-100 text-slate-600' :
                          meeting.approvalStatus === 'Review' ? 'bg-blue-100 text-blue-700' :
                          meeting.approvalStatus === 'Revision Required' ? 'bg-orange-100 text-orange-700' :
                          'bg-emerald-100 text-emerald-700'
                        )}>
                          {meeting.approvalStatus || 'Draft'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(!meeting.approvalStatus || meeting.approvalStatus === 'Draft' || meeting.approvalStatus === 'Revision Required') && (
                          <button
                            onClick={() => handleApproval('Review')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
                          >
                            Submit for Approval
                          </button>
                        )}
                        {meeting.approvalStatus === 'Review' && (
                          <>
                            <button
                              onClick={() => handleApproval('Approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleApproval('Revision Required')}
                              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                            >
                              <X size={14} /> Request Revision
                            </button>
                          </>
                        )}
                        {meeting.approvalStatus === 'Approved' && (
                          <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                            <CheckCircle2 size={15} /> Notula Resmi Telah Disetujui
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

      {/* ─── MODAL GEMINI AI API KEY ─── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                Konfigurasi Google Gemini AI
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Google Gemini Flash memberikan transkripsi rekaman audio berkas HD, ringkasan eksekutif, dan penugasan tim otomatis tingkat enterprise (seperti Notion AI).
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full text-xs font-mono px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900">
                <p className="font-semibold mb-0.5">💡 Belum punya API Key?</p>
                <p>
                  Dapatkan kunci gratis tanpa kartu kredit di{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-indigo-700 hover:text-indigo-900"
                  >
                    Google AI Studio (aistudio.google.com)
                  </a>.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={saveGeminiKey}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Simpan Kunci
              </button>
            </div>
          </div>
        </div>
      )}
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
