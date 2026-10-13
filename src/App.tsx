import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { EmployeeProfile } from './supabase';

export default function App() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let alive = true;
    let revision = 0;
    const client = supabase;
    async function loadProfile(session: Session | null) {
      const current = ++revision;
      setProfile(null);
      if (!session) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: profileError } = await client
        .from('employee_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .returns<EmployeeProfile[]>()
        .maybeSingle();
      if (!alive || current !== revision) return;
      if (profileError || !data) {
        setError(
          'Your employee profile is unavailable. Please contact your HR Administrator.',
        );
        await client.auth.signOut({ scope: 'local' });
      } else {
        setProfile(data);
        setError('');
      }
      setLoading(false);
    }
    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        queueMicrotask(() => {
          if (alive) void loadProfile(session);
        });
      },
    );
    return () => {
      alive = false;
      revision++;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const fields = new FormData(event.currentTarget);
    setError('');
    setSubmitting(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: String(fields.get('email')).trim(),
      password: String(fields.get('password')),
    });
    setSubmitting(false);
    if (loginError) {
      setError(
        'We couldn’t sign you in. Check your email and password, then try again.',
      );
      setLoading(false);
    }
  }

  if (loading)
    return (
      <main className="loading-screen" aria-busy="true">
        <span className="brand-mark" aria-hidden="true">
          h.
        </span>
        <p role="status">Opening your workspace…</p>
      </main>
    );
  if (profile) {
    const roleName = {
      employee: 'Employee',
      manager: 'Manager',
      hr_administrator: 'HR Administrator',
    }[profile.role];
    const accessLink = profile.role === 'manager' ? 'Team access' : 'HR access';
    const initials = profile.full_name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('');
    return (
      <div className="workspace-shell">
        <a className="skip-link" href="#profile">
          Skip to my profile
        </a>
        <aside className="sidebar">
          <a className="brand" href="#profile">
            <span className="brand-mark" aria-hidden="true">
              h.
            </span>
            <span>
              HR Dashboard
              <span className="brand-caption">Your people, together</span>
            </span>
          </a>
          <div className="company-label">
            <span className="company-icon" aria-hidden="true">
              H
            </span>
            <div>
              Harmony Studio<small>Kuala Lumpur, Malaysia</small>
            </div>
          </div>
          <nav aria-label="Workspace">
            <span className="nav-caption">WORKSPACE</span>
            <a className="nav-item selected" href="#profile">
              <span aria-hidden="true">◉</span>My profile
            </a>
            {profile.role !== 'employee' && (
              <a className="nav-item" href="#access">
                <span aria-hidden="true">◇</span>
                {accessLink}
              </a>
            )}
          </nav>
          <div className="sidebar-footer">
            <span className="avatar mini">{initials}</span>
            <div>
              {profile.full_name}
              <small>{roleName}</small>
            </div>
          </div>
        </aside>
        <div className="workspace-body">
          <header className="topbar">
            <span>
              Workspace <span className="breadcrumb-divider">/</span>{' '}
              <strong>My profile</strong>
            </span>
            <button
              className="secondary-button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                const result = await supabase?.auth.signOut({ scope: 'local' });
                setSubmitting(false);
                if (result?.error)
                  setError('We couldn’t complete sign-out. Please try again.');
              }}
            >
              {submitting ? 'Signing out…' : 'Sign out'}
            </button>
          </header>
          <main className="profile-page" id="profile">
            <div className="page-heading">
              <div>
                <p className="eyebrow">A LITTLE ABOUT YOU</p>
                <h1>My profile</h1>
                <p>Your place in the team, all in one view.</p>
              </div>
              <span className="status-pill">
                <span aria-hidden="true" />
                Active employee
              </span>
            </div>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <section className="profile-card" aria-labelledby="employee-name">
              <div className="profile-cover">
                <span className="cover-orbit orbit-one" />
                <span className="cover-orbit orbit-two" />
                <span className="cover-caption">
                  Good people. Shared purpose.
                </span>
              </div>
              <div className="profile-identity">
                <span className="avatar large">{initials}</span>
                <div>
                  <h2 id="employee-name">{profile.full_name}</h2>
                  <p>{profile.job_title}</p>
                </div>
                <span className="role-pill">{roleName}</span>
              </div>
              <div className="profile-details">
                <h3>Employment details</h3>
                <dl>
                  <div>
                    <dt>Work email</dt>
                    <dd>
                      <a href={`mailto:${profile.work_email}`}>
                        {profile.work_email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Department</dt>
                    <dd>{profile.department}</dd>
                  </div>
                  <div>
                    <dt>Job title</dt>
                    <dd>{profile.job_title}</dd>
                  </div>
                  <div>
                    <dt>Start date</dt>
                    <dd>
                      {new Intl.DateTimeFormat('en-MY', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC',
                      }).format(new Date(`${profile.start_date}T00:00:00Z`))}
                    </dd>
                  </div>
                  <div>
                    <dt>Employment status</dt>
                    <dd>Active</dd>
                  </div>
                  <div>
                    <dt>Workspace role</dt>
                    <dd>{roleName}</dd>
                  </div>
                </dl>
              </div>
            </section>
            <section
              className="access-card"
              id="access"
              aria-labelledby="access-heading"
            >
              <span className="access-icon" aria-hidden="true">
                ◇
              </span>
              <div>
                <h3 id="access-heading">Your workspace access</h3>
                <p>
                  {profile.role === 'employee'
                    ? 'Your account gives you access to your own employment information.'
                    : profile.role === 'manager'
                      ? 'You’re assigned as a Manager. Your account and employment information are maintained by HR.'
                      : 'You’re assigned as an HR Administrator. Your account access is managed by the company.'}{' '}
                  Contact HR if your details need updating.
                </p>
              </div>
              <span className="access-badge">{roleName}</span>
            </section>
            <footer className="page-footer">
              <span>Harmony Studio · HR Dashboard</span>
              <span>Your people, together.</span>
            </footer>
          </main>
        </div>
      </div>
    );
  }

  return (
    <main className="login-layout">
      <section className="login-story" aria-label="HR Dashboard">
        <div className="brand light">
          <span className="brand-mark" aria-hidden="true">
            h.
          </span>
          <span>
            HR Dashboard
            <span className="brand-caption">Your people, together</span>
          </span>
        </div>
        <div className="story-content">
          <p className="eyebrow">A WORKSPACE THAT FEELS HUMAN</p>
          <h2>
            People first.
            <br />
            Work in harmony.
          </h2>
          <p>
            A little less admin.
            <br />A little more room for your people.
          </p>
          <div className="story-art" aria-hidden="true">
            <div className="art-ring" />
            <div className="art-card">
              <span className="art-avatar">↗</span>
              <span>
                Your people.
                <br />
                <strong>One shared space.</strong>
              </span>
              <span className="art-dot" />
            </div>
          </div>
        </div>
        <span className="story-footer">
          Built around people. Just like your team.
        </span>
      </section>
      <section className="login-panel">
        <div className="login-content">
          <span className="login-kicker">YOUR COMPANY WORKSPACE</span>
          <h1>Welcome back</h1>
          <p className="login-intro">
            Sign in to your HR Dashboard.
            <br />
            We’re glad you’re here.
          </p>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {!supabase && (
            <p className="error-message" role="alert">
              Your workspace isn’t connected yet. Please contact your HR
              Administrator.
            </p>
          )}
          <form onSubmit={signIn}>
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              required
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
            <button
              className="primary-button"
              type="submit"
              disabled={!supabase || submitting}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className="sign-in-help">
            Need help signing in?
            <br />
            <strong>Contact your HR Administrator.</strong>
          </p>
        </div>
        <footer className="login-footer">
          HR Dashboard <span>•</span> Your people, together.
        </footer>
      </section>
    </main>
  );
}
