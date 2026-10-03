import { useState, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause,
  Video, 
  Users, 
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  MoreVertical,
  Calendar,
  Link as LinkIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'finished';

import { useAppStore } from '../store/useAppStore';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const TRANSCRIPT_MOCK = [
  { id: 1, time: '19:12', speaker: 'Ahmad', text: 'Untuk kegiatan seminar bulan depan, bagaimana progres persiapan tempatnya?' },
  { id: 2, time: '19:14', speaker: 'Mustofa', text: 'Saya sudah menghubungi pihak gedung, mereka meminta DP 50% minggu ini agar jadwal bisa dikunci.' },
  { id: 3, time: '19:18', speaker: 'Hasan', text: 'Bagaimana dengan anggarannya? Apakah kita masih punya cukup dana dari kas organisasi?' },
  { id: 4, time: '19:20', speaker: 'Mustofa', text: 'Kas masih cukup. Nanti saya akan buatkan pengajuannya, tapi Ahmad tolong buat proposal singkatnya paling lambat Jumat ya.' },
  { id: 5, time: '19:22', speaker: 'Ahmad', text: 'Baik, proposal akan saya siapkan.' },
];

export default function MeetingRoom() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [time, setTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  // Timer logic for recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateSummary = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowSummary(true);
    }, 2000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks(prev => [...prev, e.data]);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        try {
          const storageRef = ref(storage, `recordings/meeting_${Date.now()}.webm`);
          await uploadBytes(storageRef, audioBlob);
          const url = await getDownloadURL(storageRef);
          setRecordingUrl(url);
          console.log("Uploaded recording to:", url);
        } catch (e) {
          console.error("Upload failed", e);
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
      setRecordingState('recording');
    } catch (e) {
      console.error("Microphone access denied", e);
      alert("Microphone access required to record meetings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setRecordingState('finished');
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
    }
    setRecordingState('paused');
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
    }
    setRecordingState('recording');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/50">
      
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 p-6 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Planning</span>
            <span className="flex items-center gap-1 text-slate-500 text-sm font-medium">
              <Calendar size={14} /> Sep 30, 2026
            </span>
            <span className="flex items-center gap-1 text-slate-500 text-sm font-medium">
              <Clock size={14} /> 19:00 - 20:30
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Rapat Pengurus: Persiapan Seminar</h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
            <LinkIcon size={16} />
            Copy Link
          </button>
          <button className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors shadow-sm shadow-indigo-200">
            <Video size={16} />
            Join Call
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column - Details & Recording */}
        <div className="w-1/3 min-w-[350px] border-r border-slate-200 bg-white flex flex-col overflow-y-auto custom-scrollbar">
          
          {/* Recording Controls */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Meeting Audio</h3>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    recordingState === 'recording' ? "bg-red-500 animate-pulse" : "bg-slate-300"
                  )}></div>
                  <span className={cn(
                    "font-mono text-xl font-medium tracking-tight",
                    recordingState === 'recording' ? "text-slate-800" : "text-slate-400"
                  )}>
                    {formatTime(time)}
                  </span>
                </div>
                {recordingState === 'recording' && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">LIVE</span>
                )}
              </div>

              <div className="flex gap-2 justify-center">
                {recordingState === 'idle' && (
                  <button 
                    onClick={startRecording}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Mic size={16} /> Start Recording
                  </button>
                )}
                
                {recordingState === 'recording' && (
                  <>
                    <button 
                      onClick={pauseRecording}
                      className="flex-1 flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Pause size={16} fill="currentColor" /> Pause
                    </button>
                    <button 
                      onClick={stopRecording}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Square size={16} fill="currentColor" /> Stop
                    </button>
                  </>
                )}

                {recordingState === 'paused' && (
                  <>
                    <button 
                      onClick={resumeRecording}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Play size={16} fill="currentColor" /> Resume
                    </button>
                    <button 
                      onClick={stopRecording}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Square size={16} fill="currentColor" /> Stop
                    </button>
                  </>
                )}

                {recordingState === 'finished' && (
                  <div className="flex flex-col gap-2 w-full">
                    <button 
                      disabled
                      className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-400 py-2.5 rounded-xl text-sm font-medium"
                    >
                      <CheckCircle2 size={16} /> Recording Saved
                    </button>
                    {recordingUrl && (
                      <a 
                        href={recordingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full text-center text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Download / Play Recording
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Agenda</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-0.5 w-6 h-6 rounded bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-slate-700">Pembahasan Kegiatan</h4>
                  <p className="text-sm text-slate-500 mt-1">Review konsep acara dan pembicara.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-0.5 w-6 h-6 rounded bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-slate-700">Anggaran (Budgeting)</h4>
                  <p className="text-sm text-slate-500 mt-1">Estimasi biaya dan sumber dana.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-0.5 w-6 h-6 rounded bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-slate-700">Pembagian Tugas</h4>
                  <p className="text-sm text-slate-500 mt-1">Assign PIC untuk masing-masing divisi.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="p-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Participants (4)</h3>
            <div className="space-y-3">
              {['Mustofa (Organizer)', 'Ahmad', 'Hasan', 'Fatimah'].map((name) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                    {name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column - Transcript & Summary */}
        <div className="flex-1 flex flex-col bg-white">
          
          {/* Tabs */}
          <div className="flex items-center border-b border-slate-200 px-2">
            <button className="px-6 py-4 border-b-2 border-primary-500 text-primary-700 font-medium text-sm flex items-center gap-2">
              <FileText size={16} /> Transcript
            </button>
            <button className="px-6 py-4 border-b-2 border-transparent text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-2">
              <Sparkles size={16} /> AI Summary
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar relative">
            
            {/* Action Area for Summary */}
            {(recordingState === 'finished' && !showSummary && !isGenerating) && (
              <div className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-md flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="text-indigo-200" /> Generate Meeting Minutes
                  </h3>
                  <p className="text-indigo-100 text-sm mt-1">Let AI extract decisions, action items, and summarize this meeting.</p>
                </div>
                <button 
                  onClick={handleGenerateSummary}
                  className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-95"
                >
                  Generate Now
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="mb-8 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-sm">
                <Sparkles className="text-indigo-500 animate-spin mb-4" size={32} />
                <h3 className="text-lg font-bold text-slate-800">AI is analyzing the transcript...</h3>
                <p className="text-slate-500 text-sm mt-1">Extracting action items and decisions.</p>
              </div>
            )}

            {showSummary && (
              <div className="mb-8 bg-white border border-indigo-100 rounded-2xl p-8 shadow-sm ring-1 ring-indigo-50">
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-6 pb-4 border-b border-indigo-50">
                  <Sparkles size={20} />
                  AI Meeting Minutes
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Decisions Made</h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
                      <li>Diputuskan untuk membayar DP gedung 50% minggu ini.</li>
                      <li>Dana akan menggunakan kas organisasi saat ini.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Action Items (Auto-generated Tasks)</h4>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-slate-800 text-sm">Membuat proposal singkat kegiatan seminar</div>
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">HIGH</span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Users size={12}/> Assignee: Ahmad</span>
                        <span className="flex items-center gap-1 text-red-500"><Calendar size={12}/> Deadline: Jumat</span>
                      </div>
                      <div className="mt-3">
                        <button 
                          onClick={() => {
                            useAppStore.getState().addTask({
                              id: `task-${Date.now()}`,
                              title: 'Membuat proposal singkat kegiatan seminar',
                              project: 'Seminar',
                              priority: 'High',
                              status: 'backlog',
                              dueDate: 'Jumat',
                              comments: 0,
                              attachments: 0,
                              assignee: 'Ahmad'
                            });
                            alert('Task added to Kanban Board!');
                          }}
                          className="text-xs bg-white border border-slate-200 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors px-3 py-1.5 rounded-lg font-medium"
                        >
                          + Add to Kanban Board
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript Flow */}
            <div className="space-y-6">
              {TRANSCRIPT_MOCK.map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="w-12 pt-1">
                    <button className="text-xs font-mono text-primary-500 hover:text-primary-700 hover:bg-primary-50 px-1.5 py-0.5 rounded transition-colors opacity-70 group-hover:opacity-100">
                      {item.time}
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-700 text-sm">{item.speaker}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      {item.text}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button className="text-slate-400 hover:text-slate-600 p-1"><MoreVertical size={16}/></button>
                  </div>
                </div>
              ))}
              
              {(recordingState === 'recording' || recordingState === 'paused') && (
                <div className="flex gap-4 opacity-50 animate-pulse">
                  <div className="w-12 pt-1 text-xs font-mono text-slate-400">{formatTime(time).substring(3)}</div>
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                    <div className="h-3 w-3/4 bg-slate-200 rounded mb-1"></div>
                    <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
