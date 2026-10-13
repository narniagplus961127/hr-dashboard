import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { seedDemoAccounts } from './demo-accounts.mjs';
import { assertTestContext, assertTestUrl } from './lib/test-backend.mjs';
import { supabase } from './lib/commands.mjs';

export async function setupTestAccounts(env = process.env) {
  const context = assertTestContext(env);
  const settings = supabase(['status', '-o', 'json'], context.runtime, {
    json: true,
  });
  assertTestUrl(settings.API_URL);
  const password = `Test-${randomBytes(24).toString('hex')}!`;
  await seedDemoAccounts({
    url: settings.API_URL,
    secretKey: settings.SECRET_KEY ?? settings.SERVICE_ROLE_KEY,
    password,
  });
  return {
    TEST_SUPABASE_URL: settings.API_URL,
    TEST_SUPABASE_PUBLISHABLE_KEY:
      settings.PUBLISHABLE_KEY ?? settings.ANON_KEY,
    TEST_DEMO_PASSWORD: password,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await setupTestAccounts();
    console.log(
      'Disposable test accounts are ready. Credentials were kept in memory.',
    );
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Test setup failed.',
    );
    process.exitCode = 1;
  }
}
