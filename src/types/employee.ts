export type WorkspaceRole = 'employee' | 'manager' | 'hr_administrator';
export type JobLevel =
  'Director' | 'Head' | 'Manager' | 'Lead' | 'Senior' | 'Junior';

export interface DirectoryEmployee {
  employee_id: string;
  full_name: string;
  work_email: string;
  job_title: string;
  job_level: JobLevel;
  department_id: string;
  department: string;
  manager_id: string | null;
  manager_name: string | null;
}

export interface EmployeeRecord extends DirectoryEmployee {
  user_id: string | null;
  start_date: string;
  is_active: boolean;
  role: WorkspaceRole;
}

export interface EmployeeProfile extends EmployeeRecord {
  user_id: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface EmployeeFields {
  full_name: string;
  work_email: string;
  job_title: string;
  job_level: JobLevel;
  department_id: string;
  manager_id: string | null;
  start_date: string;
}
