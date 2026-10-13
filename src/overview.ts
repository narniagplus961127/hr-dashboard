import { supabase } from './supabase';
import type { WorkspaceOverview } from './types/overview';

export async function getOverview(): Promise<WorkspaceOverview> {
  if (!supabase) throw new Error('Connect the backend to load the overview.');

  const { data, error } = await supabase.rpc('get_workspace_overview');

  if (error) throw new Error(error.message);

  return data;
}
