import { supabase } from './supabase';
import type {
  LeaveBalance,
  LeaveType,
  LeaveRequest,
  LeaveHistory,
} from './types/leave';

export async function cancelLeaveRequest(id: string, reason = '') {
  if (!supabase) throw new Error('Backend is not configured.');
  const { error } = await supabase.rpc('cancel_leave_request', {
    p_request_id: id,
    p_reason: reason,
  });
  if (error)
    throw new Error(
      error.code === '22023' || error.code === '42501'
        ? error.message
        : 'Could not cancel leave. Please reload and try again.',
    );
}

export async function getMyLeave() {
  if (!supabase) throw new Error('Backend is not configured.');
  const [requests, history] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<LeaveRequest[]>(),
    supabase
      .from('leave_history')
      .select('*')
      .order('created_at')
      .returns<LeaveHistory[]>(),
  ]);
  if (requests.error || history.error)
    throw new Error('Could not load your Leave requests. Please try again.');
  return { requests: requests.data, history: history.data };
}

export async function submitLeaveRequest(
  type: LeaveType,
  startDate: string,
  endDate: string,
  reason: string,
) {
  if (!supabase) throw new Error('Backend is not configured.');
  const { error } = await supabase.rpc('submit_leave_request', {
    p_type: type,
    p_start_date: startDate,
    p_end_date: endDate,
    p_reason: reason,
  });
  if (error)
    throw new Error(
      error.code === '22023' || error.code === '42501'
        ? error.message
        : 'Could not submit your Leave request. Please try again.',
    );
}

export async function getLeaveBalances(
  year: number,
  employeeId?: string,
): Promise<LeaveBalance[]> {
  if (!supabase) throw new Error('Backend is not configured.');

  const { data, error } = await supabase.rpc('get_leave_balances', {
    p_year: year,
    p_employee_id: employeeId ?? null,
  });
  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function saveLeaveEntitlement(
  employeeId: string,
  year: number,
  type: LeaveType,
  allowance: number,
) {
  if (!supabase) throw new Error('Backend is not configured.');

  const { error } = await supabase.rpc('save_leave_entitlement', {
    p_employee_id: employeeId,
    p_year: year,
    p_type: type,
    p_allowance: allowance,
  });
  if (error) throw new Error(error.message);
}
