import type { EmployeeProfile } from './employee';

export type LeaveType = 'Annual' | 'Sick';

export interface LeaveBalancesPageProps {
  viewer: EmployeeProfile;
  manage?: boolean;
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
