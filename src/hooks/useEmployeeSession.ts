import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useLocation } from 'react-router';
import { supabase } from '../supabase';
import type { EmployeeProfile } from '../types/employee';

export function useEmployeeSession() {
  const { pathname } = useLocation();
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

    async function revalidate() {
      const { data } = await client.auth.getSession();
      if (alive) await loadProfile(data.session);
    }

    function revalidateVisible() {
      if (document.visibilityState === 'visible') void revalidate();
    }

    window.addEventListener('focus', revalidateVisible);
    document.addEventListener('visibilitychange', revalidateVisible);

    return () => {
      alive = false;
      revision++;
      listener.subscription.unsubscribe();
      window.removeEventListener('focus', revalidateVisible);
      document.removeEventListener('visibilitychange', revalidateVisible);
    };
  }, [pathname]);

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

  async function signOut() {
    setSubmitting(true);

    const result = await supabase?.auth.signOut({ scope: 'local' });
    setSubmitting(false);

    if (result?.error)
      setError('We couldn’t complete sign-out. Please try again.');
  }

  async function refreshProfile() {
    if (!supabase || !profile) return;

    const { data, error: profileError } = await supabase
      .from('employee_profiles')
      .select('*')
      .eq('user_id', profile.user_id)
      .returns<EmployeeProfile[]>()
      .maybeSingle();

    if (profileError || !data) {
      setProfile(null);
      setError(
        'Your employee profile is unavailable. Please contact your HR Administrator.',
      );
      await supabase.auth.signOut({ scope: 'local' });
    } else
      setProfile((current) =>
        current?.user_id === data.user_id ? data : current,
      );
  }

  return {
    profile,
    loading,
    error,
    submitting,
    connected: Boolean(supabase),
    signIn,
    signOut,
    refreshProfile,
  };
}
