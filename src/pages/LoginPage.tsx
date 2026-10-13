import type { FormEvent } from 'react';
import Brand from '../components/Brand';

import './LoginPage.css';

interface LoginPageProps {
  error: string;
  connected: boolean;
  submitting: boolean;
  onSignIn: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export default function LoginPage({
  error,
  connected,
  submitting,
  onSignIn,
}: LoginPageProps) {
  return (
    <main className="login-layout">
      <section className="login-story" aria-label="HR Dashboard">
        <Brand light />

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

          {!connected && (
            <p className="error-message" role="alert">
              Your workspace isn’t connected yet. Please contact your HR
              Administrator.
            </p>
          )}

          <form onSubmit={onSignIn}>
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
              disabled={!connected || submitting}
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
