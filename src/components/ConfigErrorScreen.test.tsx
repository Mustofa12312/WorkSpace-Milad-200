import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConfigErrorScreen from './ConfigErrorScreen';
import { FirebaseConfigError } from '../lib/env';

describe('ConfigErrorScreen', () => {
  it('lists each missing Firebase env var', () => {
    render(<ConfigErrorScreen error={new FirebaseConfigError(['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID'])} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Firebase belum dikonfigurasi/ })).toBeInTheDocument();
    expect(screen.getByText('VITE_FIREBASE_API_KEY')).toBeInTheDocument();
    expect(screen.getByText('VITE_FIREBASE_APP_ID')).toBeInTheDocument();
    expect(screen.getByText('cp .env.example .env')).toBeInTheDocument();
  });

  it('shows the raw message for unexpected errors', () => {
    render(<ConfigErrorScreen error={new Error('Something exploded')} />);
    expect(screen.getByRole('heading', { name: /Aplikasi gagal dimuat/ })).toBeInTheDocument();
    expect(screen.getByText('Something exploded')).toBeInTheDocument();
  });
});
