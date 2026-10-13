import type { EmployeeProfile } from './employee';

export type LeaveType = 'Annual' | 'Sick';

export interface LeaveCancellationFormProps {
  requestId: string;
  approved?: boolean;
  submitting: boolean;
  onCancel: (id: string, reason: string) => Promise<void>;
}

export interface LeaveBalancesPageProps {
  viewer: EmployeeProfile;
  manage?: boolean;
  revision?: number;
  embedded?: boolean;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  charged_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string;
  created_at: string;
}

export interface LeaveHistory {
  id: string;
  request_id: string;
  actor_employee_id: string;
  actor_name: string;
  action: 'submitted' | 'approved' | 'rejected' | 'cancelled';
  reason: string;
  created_at: string;
}

export interface LeaveBalance {
  employee_id: string;
  full_name: string;
  leave_year: number;
  leave_type: LeaveType;
  allowance: number;
  used_days: number;
  reserved_days: number;
  available_days: number;
}
