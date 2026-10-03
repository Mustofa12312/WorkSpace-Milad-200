import { describe, expect, it } from 'vitest';
import { toAuthMessage } from './authErrors';

describe('toAuthMessage', () => {
  it('maps known Firebase error codes to friendly messages', () => {
    expect(toAuthMessage({ code: 'auth/invalid-credential' }, 'fallback')).toBe('Email atau password salah.');
    expect(toAuthMessage({ code: 'auth/email-already-in-use' }, 'fallback')).toMatch(/sudah terdaftar/);
  });

  it('falls back for unknown codes, non-objects and null', () => {
    expect(toAuthMessage({ code: 'auth/something-new' }, 'fallback')).toBe('fallback');
    expect(toAuthMessage(new Error('boom'), 'fallback')).toBe('fallback');
    expect(toAuthMessage(null, 'fallback')).toBe('fallback');
    expect(toAuthMessage({ code: 42 }, 'fallback')).toBe('fallback');
  });
});
