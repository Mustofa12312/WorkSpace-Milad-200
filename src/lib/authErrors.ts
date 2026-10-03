/** Maps Firebase Auth error codes to user-friendly (Indonesian) messages. */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email atau password salah.',
  'auth/wrong-password': 'Email atau password salah.',
  'auth/user-not-found': 'Akun dengan email ini tidak ditemukan.',
  'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan login.',
  'auth/weak-password': 'Password minimal 6 karakter.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
  'auth/network-request-failed': 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
  'auth/popup-closed-by-user': 'Login Google dibatalkan.',
  'auth/unauthorized-domain': 'Domain ini belum diizinkan di Firebase Auth (Authorized domains).',
  'auth/invalid-api-key': 'Konfigurasi Firebase tidak valid. Periksa VITE_FIREBASE_API_KEY.',
  'auth/configuration-not-found': 'Metode login ini belum diaktifkan di Firebase Console.',
  'auth/operation-not-allowed': 'Metode login ini belum diaktifkan di Firebase Console.',
};

export function toAuthMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: unknown } | null)?.code;
  return (typeof code === 'string' && AUTH_ERROR_MESSAGES[code]) || fallback;
}
