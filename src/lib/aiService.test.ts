import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatNotionMarkdown,
  generateMeetingAnalysis,
  getGeminiApiKey,
  setGeminiApiKey,
} from './aiService';
import type { TranscriptLine, AgendaItem } from '../types';

describe('aiService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('API Key storage', () => {
    it('sets and retrieves custom Gemini API key from localStorage', () => {
      expect(getGeminiApiKey()).toBe('');
      setGeminiApiKey('AIzaSyTestKey123');
      expect(getGeminiApiKey()).toBe('AIzaSyTestKey123');
      setGeminiApiKey('');
      expect(getGeminiApiKey()).toBe('');
    });
  });

  describe('formatNotionMarkdown', () => {
    it('formats meeting details into clean Notion-style Markdown', () => {
      const transcript: TranscriptLine[] = [
        { id: '1', time: '09:01:00', speaker: 'Ahmad', text: 'Halo selamat pagi rekan-rekan.' },
        { id: '2', time: '09:05:00', speaker: 'Budi', text: 'Kita sepakat menyelesaikan modul rapat.' },
      ];
      const md = formatNotionMarkdown(
        'Rapat Koordinasi',
        '2026-10-16',
        '09:00 - 10:00',
        'Ahmad',
        ['Ahmad', 'Budi'],
        'Rapat koordinasi mingguan tim.',
        ['Menyetujui penyelesaian modul rapat.'],
        [{ task: 'Selesaikan deploy Vercel', assignee: 'Budi', deadline: 'Besok' }],
        transcript
      );

      expect(md).toContain('# 📋 Notula Rapat: Rapat Koordinasi');
      expect(md).toContain('Ahmad');
      expect(md).toContain('Budi');
      expect(md).toContain('### 📝 Ringkasan Eksekutif (AI Summary)');
      expect(md).toContain('### ✅ Keputusan yang Disepakati');
      expect(md).toContain('### 📌 Action Items & Tugas Lanjutan');
      expect(md).toContain('### 💬 Transkrip Percakapan Lengkap');
      expect(md).toContain('09:01:00');
    });
  });

  describe('generateMeetingAnalysis', () => {
    it('generates structured smart local analysis when transcript is present and no API key is set', async () => {
      const transcript: TranscriptLine[] = [
        { id: '1', time: '09:00', speaker: 'Budi', text: 'Kita harus siapkan laporan akhir pekan ini.' },
        { id: '2', time: '09:05', speaker: 'Budi', text: 'Saya setuju dengan target peluncuran aplikasi.' },
      ];
      const agenda: AgendaItem[] = [
        { id: 'ag-1', title: 'Evaluasi mingguan' },
      ];

      const result = await generateMeetingAnalysis(transcript, agenda, 'Rapat Evaluasi', 'Budi');

      expect(result.summary).toContain('Rapat Evaluasi');
      expect(result.decisions.length).toBeGreaterThan(0);
      expect(result.actionItems.length).toBeGreaterThan(0);
      expect(result.actionItems[0]).toHaveProperty('task');
      expect(result.actionItems[0]).toHaveProperty('assignee');
      expect(result.actionItems[0]).toHaveProperty('deadline');
    });

    it('returns friendly default when transcript is empty', async () => {
      const result = await generateMeetingAnalysis([], [], 'Rapat Kosong', 'Budi');
      expect(result.summary).toContain('Belum ada transkrip');
      expect(result.decisions).toContain('Belum ada poin keputusan yang tercatat dalam transkrip.');
    });
  });
});
