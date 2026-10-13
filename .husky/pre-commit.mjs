import { spawnSync } from 'node:child_process';

const staged = spawnSync(
  process.execPath,
  ['node_modules/lint-staged/bin/lint-staged.js'],
  { stdio: 'inherit' },
);
if (staged.status !== 0) process.exit(staged.status ?? 1);
const checked = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'check:fast'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(checked.status ?? 1);
