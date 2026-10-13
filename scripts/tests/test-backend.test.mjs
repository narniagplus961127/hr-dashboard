import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  assertTestContext,
  assertTestUrl,
  buildTestConfig,
  createTestRuntime,
  removeTestRuntime,
  testPorts,
} from '../lib/test-backend.mjs';

test('ordinary Playwright invocation refuses legacy development settings before seeding', () => {
  assert.throws(
    () => assertTestContext({ TEST_SUPABASE_URL: 'http://127.0.0.1:54321' }),
    /runner-owned/,
  );
  const result = spawnSync(process.execPath, ['scripts/setup-tests.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, HR_TEST_RUNTIME: '', HR_TEST_RUN_ID: '' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /runner-owned/);
});

test('test API refuses development, hosted, and embedded-credential targets', () => {
  for (const url of [
    'http://127.0.0.1:54321',
    'https://example.supabase.co',
    'http://password@127.0.0.1:56421',
    'http://127.0.0.1:56421/other',
  ])
    assert.throws(() => assertTestUrl(url), /dedicated/);
  assert.doesNotThrow(() => assertTestUrl(`http://127.0.0.1:${testPorts.api}`));
});

test('generated test configuration keeps development configuration unchanged', () => {
  const original = readFileSync('supabase/config.toml', 'utf8');
  const generated = buildTestConfig(original, 'hr-dashboard-e2e-123456789abc');
  assert.match(generated, /project_id = "hr-dashboard-e2e-123456789abc"/);
  assert.match(generated, /port = 56421/);
  assert.match(generated, /port = 56422/);
  assert.match(generated, /shadow_port = 56420/);
  assert.equal(readFileSync('supabase/config.toml', 'utf8'), original);
});

test('fixture context requires matching ownership and safe config, even with a valid URL', () => {
  const context = createTestRuntime();
  const env = {
    HR_TEST_RUNTIME: context.runtime,
    HR_TEST_RUN_ID: context.runId,
    TEST_SUPABASE_URL: `http://127.0.0.1:${testPorts.api}`,
  };
  const configPath = join(context.runtime, 'supabase/config.toml');
  const original = readFileSync(configPath, 'utf8');
  try {
    assert.equal(assertTestContext(env).projectId, context.projectId);
    assert.throws(
      () => assertTestContext({ ...env, HR_TEST_RUN_ID: 'different-run' }),
      /ownership/,
    );
    assert.throws(
      () => assertTestContext({ ...env, HR_TEST_RUNTIME: process.cwd() }),
      /inside/,
    );
    writeFileSync(
      configPath,
      original.replace(context.projectId, 'hr-dashboard-test'),
    );
    assert.throws(() => assertTestContext(env), /unexpected/);
    writeFileSync(configPath, original.replace('port = 56422', 'port = 54322'));
    assert.throws(() => assertTestContext(env), /unexpected/);
  } finally {
    writeFileSync(configPath, original);
    removeTestRuntime(context);
  }
  assert.equal(existsSync(context.runtime), false);
});

test('cleanup refuses a modified ownership marker rather than deleting unknown files', () => {
  const context = createTestRuntime();
  const markerPath = join(context.runtime, 'owner.json');
  const original = readFileSync(markerPath, 'utf8');
  try {
    writeFileSync(
      markerPath,
      JSON.stringify({ ...context, owner: 'someone-else' }),
    );
    assert.throws(() => removeTestRuntime(context), /ownership/);
    assert.equal(existsSync(context.runtime), true);
  } finally {
    writeFileSync(markerPath, original);
    removeTestRuntime(context);
  }
});
