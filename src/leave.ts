import { supabase } from './supabase';
import type { LeaveBalance, LeaveType } from './types/leave';

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
