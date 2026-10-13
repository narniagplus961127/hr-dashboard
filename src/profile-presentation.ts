import type { EmployeeProfile } from './types/employee';

export function getRoleName(role: EmployeeProfile['role']) {
  return {
    employee: 'Employee',
    manager: 'Manager',
    hr_administrator: 'HR Administrator',
  }[role];
}

export function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
}
