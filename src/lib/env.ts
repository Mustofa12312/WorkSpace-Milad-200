/**
 * Runtime validation for the Firebase environment variables.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time, so a missing variable
 * silently becomes `undefined` and Firebase later fails with an obscure error
 * (e.g. `auth/invalid-api-key`). We validate up-front and surface a clear,
 * actionable message instead.
 */

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/** Maps each Firebase config key to its environment variable name. */
export const REQUIRED_ENV_VARS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const satisfies Record<Exclude<keyof FirebaseEnvConfig, 'measurementId'>, string>;

export const OPTIONAL_ENV_VARS = {
  measurementId: 'VITE_FIREBASE_MEASUREMENT_ID',
} as const;

/** Values copied verbatim from `.env.example` — they are never valid. */
const PLACEHOLDER_PATTERN = /^(your_.*_here|changeme|todo|xxx+)$/i;

export class FirebaseConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Firebase configuration is incomplete. Missing or invalid environment variable(s): ` +
        `${missing.join(', ')}. Copy .env.example to .env, fill in the values from ` +
        `Firebase Console → Project settings → Your apps, then restart the dev server ` +
        `(or set them in Vercel → Settings → Environment Variables and redeploy).`,
    );
    this.name = 'FirebaseConfigError';
    this.missing = missing;
  }
}

const clean = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  // Tolerate accidental surrounding quotes/whitespace from copy-paste.
  const trimmed = value.trim().replace(/^["']|["']$/g, '').trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) return undefined;
  return trimmed;
};

/**
 * Validates a raw env object (normally `import.meta.env`) and returns a typed
 * Firebase config. Throws {@link FirebaseConfigError} listing *every* missing
 * variable at once, so developers can fix them in a single pass.
 */
export function parseFirebaseEnv(env: Record<string, unknown>): FirebaseEnvConfig {
  const missing: string[] = [];
  const config: Partial<FirebaseEnvConfig> = {};

  for (const [key, envName] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = clean(env[envName]);
    if (value) config[key as keyof typeof REQUIRED_ENV_VARS] = value;
    else missing.push(envName);
  }

  if (missing.length > 0) throw new FirebaseConfigError(missing);

  const measurementId = clean(env[OPTIONAL_ENV_VARS.measurementId]);
  if (measurementId) config.measurementId = measurementId;

  return config as FirebaseEnvConfig;
}
