import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key?.startsWith('sb_secret_'))
    throw new Error(
      'Only a publishable Supabase key belongs in VITE_ settings.',
    );
  if (key?.startsWith('eyJ')) {
    const payload = JSON.parse(
      Buffer.from(key.split('.')[1], 'base64url').toString('utf8'),
    );
    if (payload.role !== 'anon')
      throw new Error(
        'Privileged Supabase JWT keys must never enter the frontend.',
      );
  }
  return { plugins: [react()] };
});
