import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Placeholder configuration. 
// For production, these values should be securely managed and loaded from environment variables (.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForMockupPurposes",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "milad-workspace.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "milad-workspace",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "milad-workspace.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
