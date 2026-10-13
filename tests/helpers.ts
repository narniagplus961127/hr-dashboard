import { createClient } from '@supabase/supabase-js';
import { spawnSync } from 'node:child_process';
import { assertTestContext } from '../scripts/lib/test-backend.mjs';

// Trusted provisioning/cleanup only. Behavioral assertions use public APIs.
export function provisionFixture(sql: string) {
  const { projectId: project } = assertTestContext();
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      `supabase_db_${project}`,
      'psql',
      '-U',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: sql, encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr);
}

export function publicClient(token?: string) {
  assertTestContext();
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
