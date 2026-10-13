import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export type EmployeeProfile = {
  user_id: string;
  full_name: string;
  work_email: string;
  job_title: string;
  department: string;
  start_date: string;
  is_active: boolean;
  role: 'employee' | 'manager' | 'hr_administrator';
};
