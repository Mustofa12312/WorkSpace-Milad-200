import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { parseFirebaseEnv } from './env';

// The configuration is loaded from environment variables (.env) and validated
// up-front. A FirebaseConfigError is thrown with a readable message if any
// required variable is missing — main.tsx catches it and renders a setup screen.
const firebaseConfig = parseFirebaseEnv(import.meta.env);

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence.');
    }
  });
}

export const storage = getStorage(app);

// Analytics is optional: only initialise it when a measurement ID is configured
// and the browser supports it (it is unavailable in SSR, tests, some privacy modes).
export let analytics: Analytics | null = null;
if (firebaseConfig.measurementId && typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app);
    })
    .catch(() => {
      /* analytics is non-critical */
    });
}

export default app;
