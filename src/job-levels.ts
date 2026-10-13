import type { DirectoryEmployee, JobLevel } from './types/employee';

export const jobLevels: JobLevel[] = [
  'Director',
  'Head',
  'Manager',
  'Lead',
  'Senior',
  'Junior',
];

export function compareEmployees(
  left: DirectoryEmployee,
  right: DirectoryEmployee,
) {
  return (
    jobLevels.indexOf(left.job_level) - jobLevels.indexOf(right.job_level) ||
    left.full_name.localeCompare(right.full_name)
  );
}
