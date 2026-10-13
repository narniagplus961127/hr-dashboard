import { randomBytes } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export const testPorts = Object.freeze({
  api: 56421,
  database: 56422,
  shadow: 56420,
  frontend: 56414,
});
const owner = 'hr-dashboard-isolated-tests/v1';

function setting(config, section, key) {
  const block = section
    ? config.split(`[${section}]`)[1]?.split(/\r?\n\[/)[0]
    : config.split(/\r?\n\[/)[0];
  return block?.match(new RegExp(`^${key}\\s*=\\s*(.+)`, 'm'))?.[1].trim();
}

function replaceSetting(config, section, key, value) {
  const start = section ? config.indexOf(`[${section}]`) : 0;
  if (start < 0) throw new Error(`Missing Supabase section ${section}.`);
  const next = config.indexOf(
    '\n[',
    start + (section ? section.length + 2 : 0),
  );
  const end = next < 0 ? config.length : next;
  const block = config.slice(start, end);
  const pattern = new RegExp(`^${key}\\s*=.*$`, 'm');
  if (!pattern.test(block)) throw new Error(`Missing Supabase setting ${key}.`);
  return (
    config.slice(0, start) +
    block.replace(pattern, `${key} = ${value}`) +
    config.slice(end)
  );
}

export function buildTestConfig(config, projectId) {
  let result = replaceSetting(
    config,
    '',
    'project_id',
    JSON.stringify(projectId),
  );
  result = replaceSetting(result, 'api', 'port', testPorts.api);
  result = replaceSetting(result, 'db', 'port', testPorts.database);
  result = replaceSetting(result, 'db', 'shadow_port', testPorts.shadow);
  result = replaceSetting(
    result,
    'auth',
    'site_url',
    JSON.stringify(`http://127.0.0.1:${testPorts.frontend}`),
  );
  result = replaceSetting(result, 'auth', 'additional_redirect_urls', '[]');
  return result.replace(/\r?\n/g, '\r\n');
}

function inside(parent, child) {
  const part = relative(parent, child);
  return (
    Boolean(part) &&
    !isAbsolute(part) &&
    part !== '..' &&
    !part.startsWith(`..${sep}`)
  );
}

export function testRuntimeBase(repositoryRoot = process.cwd()) {
  const repository = realpathSync(repositoryRoot);
  const base = join(repository, '.test-runtime');
  mkdirSync(base, { recursive: true });
  if (realpathSync(base).toLowerCase() !== base.toLowerCase())
    throw new Error('Test runtime directory must stay inside this checkout.');
  return base;
}

export function createTestRuntime(repositoryRoot = process.cwd()) {
  const repository = realpathSync(repositoryRoot);
  const base = testRuntimeBase(repository);
  const runtime = mkdtempSync(join(base, 'run-'));
  const runId = randomBytes(6).toString('hex');
  const projectId = `hr-dashboard-e2e-${runId}`;
  mkdirSync(join(runtime, 'supabase'));
  const config = buildTestConfig(
    readFileSync(join(repository, 'supabase/config.toml'), 'utf8'),
    projectId,
  );
  writeFileSync(join(runtime, 'supabase/config.toml'), config);
  cpSync(
    join(repository, 'supabase/migrations'),
    join(runtime, 'supabase/migrations'),
    { recursive: true },
  );
  if (existsSync(join(repository, 'supabase/seed.sql')))
    cpSync(
      join(repository, 'supabase/seed.sql'),
      join(runtime, 'supabase/seed.sql'),
    );
  const marker = { owner, repository, runId, projectId };
  writeFileSync(join(runtime, 'owner.json'), JSON.stringify(marker));
  return { ...marker, runtime };
}

export function assertTestContext(
  env = process.env,
  repositoryRoot = process.cwd(),
) {
  const repository = realpathSync(repositoryRoot);
  if (!env.HR_TEST_RUNTIME || !env.HR_TEST_RUN_ID)
    throw new Error(
      'Use npm test: tests require a runner-owned disposable backend.',
    );
  const runtime = realpathSync(resolve(env.HR_TEST_RUNTIME));
  const base = join(repository, '.test-runtime');
  if (!inside(base, runtime))
    throw new Error('Test runtime must be inside this checkout.');
  const marker = JSON.parse(readFileSync(join(runtime, 'owner.json'), 'utf8'));
  if (
    marker.owner !== owner ||
    marker.repository !== repository ||
    marker.runId !== env.HR_TEST_RUN_ID ||
    !/^[a-f0-9]{12}$/.test(marker.runId) ||
    marker.projectId !== `hr-dashboard-e2e-${marker.runId}`
  ) {
    throw new Error('Test runtime ownership does not match this run.');
  }
  const config = readFileSync(join(runtime, 'supabase/config.toml'), 'utf8');
  if (
    setting(config, '', 'project_id') !== JSON.stringify(marker.projectId) ||
    setting(config, 'api', 'port') !== String(testPorts.api) ||
    setting(config, 'db', 'port') !== String(testPorts.database) ||
    setting(config, 'db', 'shadow_port') !== String(testPorts.shadow)
  ) {
    throw new Error(
      'Refusing an unexpected test project or development database ports.',
    );
  }
  if (env.TEST_SUPABASE_URL) assertTestUrl(env.TEST_SUPABASE_URL);
  return { ...marker, runtime };
}

export function assertTestUrl(url) {
  const target = new URL(url);
  if (
    target.protocol !== 'http:' ||
    target.hostname !== '127.0.0.1' ||
    target.port !== String(testPorts.api) ||
    target.username ||
    target.password ||
    target.pathname !== '/' ||
    target.search ||
    target.hash
  ) {
    throw new Error('Tests may only use the dedicated disposable API port.');
  }
}

export function removeTestRuntime(context) {
  const verified = assertTestContext(
    { HR_TEST_RUNTIME: context.runtime, HR_TEST_RUN_ID: context.runId },
    context.repository,
  );
  rmSync(verified.runtime, { recursive: true, force: true });
}
