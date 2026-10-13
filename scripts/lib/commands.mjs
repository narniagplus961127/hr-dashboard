import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export function supabase(args, runtime, { json = false } = {}) {
  const result = spawnSync(
    process.execPath,
    [
      join(process.cwd(), 'node_modules/supabase/dist/supabase.js'),
      ...args,
      '--workdir',
      runtime,
    ],
    { encoding: 'utf8', timeout: 600_000, maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.error || result.status !== 0)
    throw new Error(
      `Supabase ${args[0]} failed. Run npm run preflight to check Docker. CLI credential output was withheld.`,
    );
  return json ? JSON.parse(result.stdout) : undefined;
}
