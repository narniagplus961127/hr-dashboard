import { spawn, spawnSync } from 'node:child_process';
import { existsSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import {
  createTestRuntime,
  assertTestContext,
  removeTestRuntime,
  testPorts,
  testRuntimeBase,
} from './lib/test-backend.mjs';
import { supabase } from './lib/commands.mjs';
import { setupTestAccounts } from './setup-tests.mjs';

const lockDirectory = testRuntimeBase();
const lock = join(lockDirectory, 'runner.lock');
let context;
let locked = false;
let started = false;
let browserProcess;
const interrupt = () => browserProcess?.kill('SIGINT');
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);
try {
  const file = openSync(lock, 'wx');
  closeSync(file);
  locked = true;
  const docker = spawnSync(
    'docker',
    ['info', '--format', '{{.ServerVersion}}'],
    { encoding: 'utf8', timeout: 15_000 },
  );
  if (docker.status !== 0)
    throw new Error('Start Docker Desktop, then run npm test again.');
  context = createTestRuntime();
  const env = {
    ...process.env,
    HR_TEST_RUNTIME: context.runtime,
    HR_TEST_RUN_ID: context.runId,
    HR_TEST_FRONTEND_PORT: String(testPorts.frontend),
  };
  // Existing environment files cannot redirect this run to a development backend.
  delete env.TEST_SUPABASE_URL;
  delete env.TEST_SUPABASE_PUBLISHABLE_KEY;
  delete env.TEST_DEMO_PASSWORD;
  assertTestContext(env);
  console.log(
    `Starting disposable project ${context.projectId} on API port ${testPorts.api}.`,
  );
  started = true;
  supabase(
    [
      'start',
      '--exclude',
      'realtime,storage-api,imgproxy,mailpit,studio,edge-runtime,logflare,vector,supavisor',
    ],
    context.runtime,
  );
  const credentials = await setupTestAccounts(env);
  console.log(
    'Fictional test accounts ready; credentials were not written to environment files.',
  );
  process.exitCode = await new Promise((resolve, reject) => {
    browserProcess = spawn(
      process.execPath,
      [
        join(process.cwd(), 'node_modules/@playwright/test/cli.js'),
        'test',
        ...process.argv.slice(2),
      ],
      { stdio: 'inherit', env: { ...env, ...credentials } },
    );
    browserProcess.once('error', reject);
    browserProcess.once('close', (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(
    error?.code === 'EEXIST'
      ? 'Another test run owns .test-runtime/runner.lock. Finish it before starting another.'
      : error instanceof Error
        ? error.message
        : 'Isolated test run failed.',
  );
  process.exitCode = 1;
} finally {
  if (context) {
    try {
      assertTestContext({
        HR_TEST_RUNTIME: context.runtime,
        HR_TEST_RUN_ID: context.runId,
      });
      if (started)
        supabase(
          ['stop', '--project-id', context.projectId, '--no-backup'],
          context.runtime,
        );
      removeTestRuntime(context);
      console.log(
        'Disposed of this run’s test backend; development data was untouched.',
      );
    } catch {
      console.error(
        `Test cleanup needs attention for ${context.projectId}; its owned runtime was retained.`,
      );
      process.exitCode = 1;
    }
  }
  if (locked && existsSync(lock)) unlinkSync(lock);
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}
