import { describe, expect, it } from 'vitest';
import { FirebaseConfigError, parseFirebaseEnv, REQUIRED_ENV_VARS } from './env';

const validEnv = {
  VITE_FIREBASE_API_KEY: 'AIza-test',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
};

describe('parseFirebaseEnv', () => {
  it('returns a typed config when all required vars are present', () => {
    expect(parseFirebaseEnv(validEnv)).toEqual({
      apiKey: 'AIza-test',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo',
      storageBucket: 'demo.appspot.com',
      messagingSenderId: '123',
      appId: '1:123:web:abc',
    });
  });

  it('includes measurementId only when provided', () => {
    const config = parseFirebaseEnv({ ...validEnv, VITE_FIREBASE_MEASUREMENT_ID: 'G-XYZ' });
    expect(config.measurementId).toBe('G-XYZ');
  });

  it('lists every missing variable at once', () => {
    const { VITE_FIREBASE_API_KEY: _a, VITE_FIREBASE_APP_ID: _b, ...partial } = validEnv;
    try {
      parseFirebaseEnv(partial);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(FirebaseConfigError);
      expect((err as FirebaseConfigError).missing).toEqual([
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_APP_ID',
      ]);
      expect((err as Error).message).toContain('.env.example');
    }
  });

  it('reports all variables when env is empty', () => {
    expect(() => parseFirebaseEnv({})).toThrowError(FirebaseConfigError);
    try {
      parseFirebaseEnv({});
    } catch (err) {
      expect((err as FirebaseConfigError).missing).toHaveLength(Object.keys(REQUIRED_ENV_VARS).length);
    }
  });

  it.each([
    ['empty string', ''],
    ['whitespace', '   '],
    ['.env.example placeholder', 'your_api_key_here'],
    ['quoted empty', '""'],
  ])('treats %s as missing', (_label, value) => {
    expect(() => parseFirebaseEnv({ ...validEnv, VITE_FIREBASE_API_KEY: value })).toThrowError(
      /VITE_FIREBASE_API_KEY/,
    );
  });

  it('strips accidental surrounding quotes and whitespace', () => {
    const config = parseFirebaseEnv({ ...validEnv, VITE_FIREBASE_PROJECT_ID: '  "demo"  ' });
    expect(config.projectId).toBe('demo');
  });
});
