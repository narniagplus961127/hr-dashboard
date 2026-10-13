import { supabase } from './supabase';
import type { ApprovalRequest } from './types/approvals';
import type { LeaveHistory } from './types/leave';

export async function getApprovals(): Promise<{
  requests: ApprovalRequest[];
  history: LeaveHistory[];
}> {
  if (!supabase) throw new Error('Backend is not configured.');

  const [requests, history] = await Promise.all([
    supabase.rpc('get_approval_requests'),
    supabase.rpc('get_approval_history'),
  ]);
  if (requests.error || history.error)
    throw new Error('Could not load leave approvals. Please try again.');

  return { requests: requests.data ?? [], history: history.data ?? [] };
}

export async function decideLeave(
  id: string,
  decision: 'approved' | 'rejected',
  reason: string,
) {
  if (!supabase) throw new Error('Backend is not configured.');

  const { error } = await supabase.rpc('decide_leave_request', {
    p_request_id: id,
    p_decision: decision,
    p_reason: reason,
  });
  if (error)
    throw new Error(
      error.code === '42501' || error.code === '22023'
        ? error.message
        : 'Could not save the decision. Please try again.',
    );
}
