import { AlertTriangle, Terminal } from 'lucide-react';
import { FirebaseConfigError } from '../lib/env';

interface Props {
  error: unknown;
}

/**
 * Rendered by main.tsx when the app fails to boot — most commonly because the
 * Firebase environment variables are missing. Lists exactly what to fix.
 */
export default function ConfigErrorScreen({ error }: Props) {
  const isConfigError = error instanceof FirebaseConfigError;
  const message = error instanceof Error ? error.message : String(error);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <section
        role="alert"
        className="w-full max-w-xl bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-red-100 overflow-hidden"
      >
        <header className="p-6 bg-gradient-to-b from-red-50 to-white flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-red-100 text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isConfigError ? 'Firebase belum dikonfigurasi' : 'Aplikasi gagal dimuat'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isConfigError
                ? 'Beberapa environment variable wajib belum diatur.'
                : 'Terjadi kesalahan saat inisialisasi aplikasi.'}
            </p>
          </div>
        </header>

        <div className="px-6 pb-6 space-y-4">
          {isConfigError ? (
            <>
              <ul className="space-y-1.5">
                {error.missing.map((name) => (
                  <li
                    key={name}
                    className="font-mono text-xs bg-red-50 text-red-700 border border-red-100 rounded-lg px-3 py-2"
                  >
                    {name}
                  </li>
                ))}
              </ul>
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono space-y-1">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Terminal className="w-3.5 h-3.5" /> Lokal
                </div>
                <div>cp .env.example .env</div>
                <div className="text-slate-400"># isi nilai dari Firebase Console → Project settings</div>
                <div>npm run dev</div>
              </div>
              <p className="text-xs text-slate-500">
                Untuk Vercel: tambahkan variabel di <strong>Settings → Environment Variables</strong>, lalu redeploy.
                Lihat README untuk panduan lengkap.
              </p>
            </>
          ) : (
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-4 whitespace-pre-wrap break-words text-slate-700">
              {message}
            </pre>
          )}
        </div>
      </section>
    </main>
  );
}
