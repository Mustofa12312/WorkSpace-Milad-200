# Workspace Milad 200

Workspace Milad 200 adalah aplikasi kolaborasi tim dan manajemen proyek modern yang mendukung multi-tenant. Dibangun menggunakan teknologi terdepan: React, Vite, TypeScript, Tailwind CSS, Zustand, dan Firebase.

## Fitur Utama
- **Kanban Board Interaktif**: Dilengkapi dengan drag-and-drop yang ramah perangkat sentuh (menggunakan `@dnd-kit`).
- **Manajemen Dokumen**: Unggah dokumen dengan fitur dropzone dan pratinjau dokumen langsung di dalam aplikasi.
- **Kalender Tim**: Tampilan bulanan dan mingguan untuk manajemen jadwal.
- **Rapat & Notulensi**: Simulator perekaman rapat dengan ringkasan otomatis (AI Mockup).
- **Responsif**: Desain yang beradaptasi dengan baik di perangkat seluler maupun desktop.

## Persyaratan Sistem
- [Node.js](https://nodejs.org/) (Versi 20 atau lebih baru)
- npm atau yarn

## Panduan Instalasi Lokal

1. **Kloning repositori ini** (jika belum):
   ```bash
   git clone <repo-url>
   cd "workpase milad"
   ```

2. **Instal dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables**:
   Salin file `.env.example` menjadi `.env` lalu isikan konfigurasi Firebase Anda.
   ```bash
   cp .env.example .env
   ```
   > Pastikan Firebase Firestore dan Storage Rules telah disiapkan (terdapat di `firestore.rules` dan `storage.rules`).

4. **Jalankan aplikasi di mode pengembangan**:
   ```bash
   npm run dev
   ```

## Panduan Deployment ke Vercel

Aplikasi ini siap di-deploy ke Vercel. Kami telah menyertakan konfigurasi `vercel.json` untuk menangani *routing* SPA (Single Page Application).

1. Pastikan Anda memiliki akun [Vercel](https://vercel.com/) dan Vercel CLI (atau hubungkan langsung melalui repositori GitHub Anda).
2. Jika menggunakan Vercel CLI, jalankan:
   ```bash
   vercel
   ```
3. Saat Vercel meminta Anda mengonfigurasi proyek, ikuti instruksi.
4. **Penting**: Tambahkan semua *Environment Variables* (berkaitan dengan Firebase) yang ada di `.env` Anda ke halaman pengaturan proyek di Dashboard Vercel.
5. Deploy versi produksi dengan:
   ```bash
   vercel --prod
   ```

## Pengujian (Testing)
Jalankan pengujian unit dan komponen menggunakan Vitest:
```bash
npm run test
```

## Lisensi
Hak Cipta (c) 2026. Seluruh hak dilindungi undang-undang.
