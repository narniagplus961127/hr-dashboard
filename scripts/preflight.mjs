import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { testPorts } from './lib/test-backend.mjs';

const git = (args) => spawnSync('git', args, { encoding: 'utf8' });
const branch =
  git(['branch', '--show-current']).stdout.trim() || '(detached HEAD)';
console.log(`Branch: ${branch}`);
console.log(
  `Working tree: ${git(['status', '--porcelain']).stdout.trim() ? 'changes present' : 'clean'}`,
);
const expected = process.argv[process.argv.indexOf('--branch') + 1];
if (process.argv.includes('--branch') && branch !== expected) {
  console.error(`Expected branch ${expected}.`);
  process.exitCode = 1;
}
const project = readFileSync('supabase/config.toml', 'utf8').match(
  /^project_id\s*=\s*"([^"]+)"/m,
)?.[1];
console.log(`Development project: ${project ?? 'missing'}`);
console.log(
  `Disposable tests: separate project per run, API ${testPorts.api}, database ${testPorts.database}`,
);
const docker = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
  encoding: 'utf8',
  timeout: 15_000,
});
if (docker.status !== 0) {
  console.error(
    'Docker: unavailable. Start Docker Desktop before backend tests.',
  );
  process.exitCode = 1;
} else {
  console.log(`Docker: ready (${docker.stdout.trim()})`);
  if (project && /^[a-zA-Z0-9_-]+$/.test(project)) {
    const state = spawnSync(
      'docker',
      ['inspect', '--format', '{{.State.Status}}', `supabase_db_${project}`],
      { encoding: 'utf8', timeout: 5_000 },
    );
    console.log(
      `Development database: ${state.status === 0 ? state.stdout.trim() : 'not started'}`,
    );
  }
}
if (existsSync('.env.local')) {
  const env = parseEnv(readFileSync('.env.local', 'utf8'));
  try {
    const url = new URL(env.VITE_SUPABASE_URL);
    console.log(
      `Frontend backend: ${url.origin} (${['localhost', '127.0.0.1'].includes(url.hostname) ? 'local' : 'hosted'})`,
    );
  } catch {
    console.error('Frontend backend URL is missing or invalid.');
    process.exitCode = 1;
  }
} else console.log('Frontend environment: .env.local is not configured.');
console.log(
  `Test runner lock: ${existsSync('.test-runtime/runner.lock') ? 'present; a run may be active' : 'available'}`,
);
