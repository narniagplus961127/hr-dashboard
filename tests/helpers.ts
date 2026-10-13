import { createClient } from '@supabase/supabase-js';

export function publicClient(token?: string) {
  const url = process.env.TEST_SUPABASE_URL;
  const key = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;

  if (
    !url ||
    !key ||
    !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)
  )
    throw new Error(
      'Run test:setup against the isolated local backend before testing.',
    );

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
  });
}
