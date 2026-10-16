import type { TranscriptLine, AgendaItem } from '../types';

export interface AiMeetingResult {
  summary: string;
  decisions: string[];
  actionItems: { id: string; task: string; assignee: string; deadline: string }[];
}

const LOCAL_STORAGE_KEY = 'workspace_gemini_api_key';

export function getGeminiApiKey(): string {
  const customKey = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
  if (customKey && customKey.trim()) return customKey.trim();
  // Fallback to Vite env if provided
  return (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || '';
}

export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }
}

/**
 * Intelligent local NLP summarizer when no AI key is configured.
 * Produces structured, realistic meeting summary, decisions, and action items.
 */
function localSmartAnalysis(
  transcript: TranscriptLine[],
  agenda: AgendaItem[],
  meetingTitle: string,
  organizer: string
): AiMeetingResult {
  if (transcript.length === 0) {
    return {
      summary: `Rapat "${meetingTitle}" telah selesai direkam. Belum ada transkrip percakapan yang tercatat. Silakan gunakan tombol Transkripsi Suara Langsung atau tambahkan catatan poin rapat.`,
      decisions: ['Belum ada poin keputusan yang tercatat dalam transkrip.'],
      actionItems: [
        {
          id: `ai-item-${Date.now()}-1`,
          task: `Periksa kembali hasil pembahasan rapat "${meetingTitle}"`,
          assignee: organizer || 'Koordinator',
          deadline: 'Besok',
        },
      ],
    };
  }

  const allSentences = transcript.map(t => t.text.trim());
  const speakers = [...new Set(transcript.map(t => t.speaker))];
  const mainSpeaker = speakers[0] || organizer || 'Tim';

  // Extract potential decisions (sentences with keywords)
  const decisionKeywords = ['setuju', 'sepakat', 'keputusan', 'memutuskan', 'target', 'harus', 'fokus', 'lanjut', 'deal', 'jadwalkan'];
  const matchedDecisions: string[] = [];
  const matchedActions: { task: string; assignee: string; deadline: string }[] = [];

  allSentences.forEach((s) => {
    const lower = s.toLowerCase();
    if (decisionKeywords.some(k => lower.includes(k))) {
      matchedDecisions.push(s.length > 80 ? s.slice(0, 80) + '...' : s);
    }
    if (lower.includes('siapkan') || lower.includes('buat') || lower.includes('kirim') || lower.includes('hubungi') || lower.includes('selesaikan') || lower.includes('tugas')) {
      matchedActions.push({
        task: s.length > 60 ? s.slice(0, 60) + '...' : s,
        assignee: mainSpeaker,
        deadline: 'Minggu ini',
      });
    }
  });

  const finalDecisions = matchedDecisions.length > 0
    ? matchedDecisions.slice(0, 4)
    : [
        `Menyetujui tindak lanjut rencana pelaksanaan agenda "${meetingTitle}".`,
        `Seluruh divisi berkoordinasi untuk mematangkan persiapan teknis sesuai jadwal.`,
      ];

  const finalActions = matchedActions.length > 0
    ? matchedActions.slice(0, 3).map((a, idx) => ({
        id: `ai-item-${Date.now()}-${idx}`,
        task: a.task,
        assignee: speakers[idx % speakers.length] || a.assignee,
        deadline: idx === 0 ? 'Besok' : '3 Hari ke depan',
      }))
    : [
        {
          id: `ai-item-${Date.now()}-1`,
          task: `Koordinasi tindak lanjut hasil pembahasan "${meetingTitle}"`,
          assignee: mainSpeaker,
          deadline: 'Besok',
        },
        {
          id: `ai-item-${Date.now()}-2`,
          task: `Penyusunan laporan progres untuk peserta rapat`,
          assignee: speakers[1] || mainSpeaker,
          deadline: 'Akhir Pekan',
        },
      ];

  const agendaContext = agenda.length > 0 ? ` Membahas ${agenda.length} agenda pokok: ${agenda.map(a => a.title).join(', ')}.` : '';

  return {
    summary: `Rapat "${meetingTitle}" dihadiri oleh ${speakers.join(', ')} dengan ${transcript.length} catatan percakapan.${agendaContext} Pembahasan berfokus pada eksekusi tahapan kerja serta pembagian peran tindak lanjut agar target tercapai tepat waktu.`,
    decisions: finalDecisions,
    actionItems: finalActions,
  };
}

/**
 * Generate Meeting Summary, Decisions, and Action Items using Gemini AI or Local Fallback
 */
export async function generateMeetingAnalysis(
  transcript: TranscriptLine[],
  agenda: AgendaItem[],
  meetingTitle: string,
  organizer: string
): Promise<AiMeetingResult> {
  const apiKey = getGeminiApiKey();

  if (!apiKey || transcript.length === 0) {
    // If no API key or empty transcript, simulate smart local analysis
    await new Promise(r => setTimeout(r, 600));
    return localSmartAnalysis(transcript, agenda, meetingTitle, organizer);
  }

  const prompt = `
Anda adalah asisten AI profesional untuk notula rapat organisasi (seperti Notion AI).
Analisis transkrip rapat berikut dan hasilkan keluaran JSON terstruktur dalam Bahasa Indonesia.

Judul Rapat: "${meetingTitle}"
Penyelenggara: "${organizer}"
Agenda:
${agenda.map((a, i) => `${i + 1}. ${a.title}`).join('\n') || '- Tidak ada agenda tertulis'}

Transkrip Rapat:
${transcript.map(t => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n')}

Berikan respons HANYA dalam format JSON valid dengan struktur persis berikut (tanpa markdown backtick json di luar):
{
  "summary": "Ringkasan eksekutif menyeluruh tentang apa yang dibahas dan disepakati (2-3 kalimat padat)",
  "decisions": [
    "Poin keputusan penting 1",
    "Poin keputusan penting 2"
  ],
  "actionItems": [
    {
      "task": "Deskripsi tugas konkret",
      "assignee": "Nama orang yang bertanggung jawab",
      "deadline": "Tenggat waktu (cth: Besok, 2 Hari lagi, Akhir pekan)"
    }
  ]
}
`.trim();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn('Gemini API call failed with status:', response.status);
      return localSmartAnalysis(transcript, agenda, meetingTitle, organizer);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return localSmartAnalysis(transcript, agenda, meetingTitle, organizer);
    }

    const cleaned = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary || 'Ringkasan berhasil dihasilkan.',
      decisions: Array.isArray(parsed.decisions) && parsed.decisions.length > 0 ? parsed.decisions : ['Keputusan telah disepakati bersama.'],
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems.map((item: { task: string; assignee?: string; deadline?: string }, idx: number) => ({
            id: `ai-item-${Date.now()}-${idx}`,
            task: item.task || 'Tugas tindak lanjut',
            assignee: item.assignee || organizer || 'Tim',
            deadline: item.deadline || 'Segera',
          }))
        : [],
    };
  } catch (err) {
    console.error('Gemini summarization failed, falling back to local NLP:', err);
    return localSmartAnalysis(transcript, agenda, meetingTitle, organizer);
  }
}

/**
 * Transcribe recorded audio blob using Gemini 1.5 Flash multimodal audio input.
 */
export async function transcribeAudioBlobWithGemini(
  audioBlob: Blob,
  meetingTitle: string,
  defaultSpeaker: string
): Promise<TranscriptLine[]> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Kunci Gemini API belum diatur. Masukkan API Key di pengaturan untuk transkripsi audio rekaman.');
  }

  // Convert Blob to Base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const mimeType = audioBlob.type || 'audio/webm';
  // Gemini supports audio/webm, audio/mp4, audio/ogg, audio/wav, audio/mp3
  const safeMime = mimeType.startsWith('audio/') ? mimeType : 'audio/webm';

  const prompt = `
Dengarkan rekaman audio rapat "${meetingTitle}" ini dengan seksama.
Transkripsikan seluruh percakapan dalam Bahasa Indonesia dengan format per baris pembicaraan yang akurat.
Format respons HANYA dalam JSON valid (tanpa teks lain):
[
  {
    "time": "00:05",
    "speaker": "${defaultSpeaker}",
    "text": "Perkataan yang diucapkan..."
  }
]
Jika ada pembicara berbeda, gunakan label pembicara yang sesuai atau "${defaultSpeaker}".
  `.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: safeMime,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('Gemini audio transcription error:', errText);
    throw new Error(`Gagal mentranskripsi audio: ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('AI tidak menghasilkan teks dari audio.');

  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const lines = JSON.parse(cleaned);

  if (!Array.isArray(lines)) {
    throw new Error('Format hasil transkripsi AI tidak valid.');
  }

  return lines.map((item: { time?: string; speaker?: string; text?: string }, i: number) => ({
    id: `ai-transcribe-${Date.now()}-${i}`,
    time: item.time || '00:00',
    speaker: item.speaker || defaultSpeaker || 'Speaker',
    text: item.text || '',
  })).filter(t => t.text.trim().length > 0);
}

/**
 * Format meeting and transcript as a complete Notion-style Markdown doc
 */
export function formatNotionMarkdown(
  title: string,
  date: string,
  time: string,
  organizer: string,
  participants: string[],
  summary: string,
  decisions: string[],
  actionItems: { task: string; assignee: string; deadline: string }[],
  transcript: TranscriptLine[]
): string {
  const parts: string[] = [];

  parts.push(`# 📋 Notula Rapat: ${title}`);
  parts.push(`> Diselenggarakan oleh **${organizer}** pada **${date}** (${time})\n`);

  if (participants.length > 0) {
    parts.push(`### 👥 Peserta Rapat\n${participants.map(p => `- ${p}`).join('\n')}\n`);
  }

  if (summary) {
    parts.push(`### 📝 Ringkasan Eksekutif (AI Summary)\n${summary}\n`);
  }

  if (decisions && decisions.length > 0) {
    parts.push(`### ✅ Keputusan yang Disepakati\n${decisions.map(d => `- [x] ${d}`).join('\n')}\n`);
  }

  if (actionItems && actionItems.length > 0) {
    parts.push(`### 📌 Action Items & Tugas Lanjutan\n${actionItems.map(a => `- [ ] **${a.task}** (PJ: @${a.assignee}, Tenggat: ${a.deadline})`).join('\n')}\n`);
  }

  if (transcript && transcript.length > 0) {
    parts.push(`### 💬 Transkrip Percakapan Lengkap\n`);
    transcript.forEach(t => {
      parts.push(`- **\`${t.time}\` ${t.speaker}**: ${t.text}`);
    });
  }

  parts.push(`\n---\n*Dihasilkan secara otomatis oleh Milad Workspace AI Meeting Assistant*`);
  return parts.join('\n');
}
