import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

export const demoEmployees = [
  {
    email: 'maya@hr.example.test',
    full_name: 'Maya Tan',
    role: 'employee',
    job_title: 'People Coordinator',
    department: 'People Operations',
    start_date: '2025-03-10',
  },
  {
    email: 'daniel@hr.example.test',
    full_name: 'Daniel Lee',
    role: 'manager',
    job_title: 'Engineering Manager',
    department: 'Engineering',
    start_date: '2024-06-03',
  },
  {
    email: 'aisha@hr.example.test',
    full_name: 'Aisha Rahman',
    role: 'hr_administrator',
    job_title: 'HR Administrator',
    department: 'People Operations',
    start_date: '2023-01-16',
  },
  {
    email: 'grace@hr.example.test',
    full_name: 'Grace Lim',
    role: 'hr_administrator',
    job_title: 'HR Administrator',
    department: 'People Operations',
    start_date: '2024-02-05',
  },
];

export async function seedDemoAccounts({ url, secretKey, password }) {
  if (!url || !secretKey || !password || password.length < 12) {
    throw new Error(
      'Set SUPABASE_URL, SUPABASE_SECRET_KEY, and a DEMO_PASSWORD of at least 12 characters.',
    );
  }
  const admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error)
      throw new Error(
        'Could not list demo accounts. Check the server-side key and project.',
      );
    users.push(...data.users);
    if (data.users.length < 100) break;
  }
  for (const employee of demoEmployees) {
    let user = users.find((candidate) => candidate.email === employee.email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: employee.email,
        password,
        email_confirm: true,
      });
      if (error || !data.user)
        throw new Error(
          `Could not create ${employee.email}. Check the project's authentication settings.`,
        );
      user = data.user;
    }
    const { email, ...profile } = employee;
    const { error } = await admin.from('employee_profiles').upsert({
      user_id: user.id,
      work_email: email,
      ...profile,
      is_active: true,
    });
    if (error)
      throw new Error(
        `Could not provision ${email}. Apply the employee-profile migration first.`,
      );
  }
}

async function resetPassword({ url, secretKey, password, email }) {
  if (
    !url ||
    !secretKey ||
    !password ||
    password.length < 12 ||
    !demoEmployees.some((employee) => employee.email === email)
  ) {
    throw new Error(
      'Provide a known demo email and DEMO_PASSWORD of at least 12 characters, plus the server-side project settings.',
    );
  }
  const admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let user;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw new Error('Could not find the demo account.');
    user = data.users.find((candidate) => candidate.email === email);
    if (user || data.users.length < 100) break;
  }
  if (!user)
    throw new Error('Demo account is not provisioned. Run demo:seed first.');
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
  });
  if (error) throw new Error('Could not reset the demo password.');
  // Revoke sessions so the old account session cannot keep accessing profiles.
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError)
    throw new Error(
      'Password changed, but session revocation could not be prepared.',
    );
  const client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: verifyError } = await client.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyError || !session.session)
    throw new Error('Password changed, but session revocation failed.');
  const { error: signOutError } = await client.auth.signOut({
    scope: 'global',
  });
  if (signOutError)
    throw new Error('Password changed, but session revocation failed.');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const settings = {
    url: process.env.SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    password: process.env.DEMO_PASSWORD,
  };
  try {
    if (process.argv[2] === 'seed') {
      await seedDemoAccounts(settings);
      console.log(
        'Provisioned four fictional demo accounts. Passwords were not printed.',
      );
    } else if (process.argv[2] === 'reset-password') {
      await resetPassword({ ...settings, email: process.argv[3] });
      console.log('Demo password reset and sessions revoked.');
    } else {
      throw new Error('Use seed or reset-password <demo-email>.');
    }
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Demo account setup failed.',
    );
    process.exitCode = 1;
  }
}
