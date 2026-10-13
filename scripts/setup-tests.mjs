import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { seedDemoAccounts } from './demo-accounts.mjs';

const status = spawnSync(
  process.execPath,
  ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'],
  { encoding: 'utf8' },
);
if (status.status !== 0)
  throw new Error(
    'Start the isolated local backend with npm run backend:start first.',
  );
const settings = JSON.parse(status.stdout);
const url = settings.API_URL;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error(
    'Test setup only seeds a loopback Supabase instance, never a hosted project.',
  );
}
if (existsSync('.env.test.local')) loadEnvFile('.env.test.local');
const password =
  process.env.TEST_DEMO_PASSWORD ?? `Test-${randomBytes(24).toString('hex')}!`;
writeFileSync(
  '.env.test.local',
  [
    `TEST_SUPABASE_URL=${url}`,
    `TEST_SUPABASE_PUBLISHABLE_KEY=${settings.PUBLISHABLE_KEY ?? settings.ANON_KEY}`,
    `TEST_DEMO_PASSWORD=${password}`,
    '',
  ].join('\r\n'),
);
await seedDemoAccounts({
  url,
  secretKey: settings.SECRET_KEY ?? settings.SERVICE_ROLE_KEY,
  password,
});
console.log(
  'Local test accounts are ready. Test settings are saved in an ignored file; no keys or passwords were printed.',
);
