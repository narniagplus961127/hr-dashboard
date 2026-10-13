import type {
  DirectoryEmployee,
  EmployeeRecord,
  Department,
  EmployeeFields,
} from './types/employee';
import { supabase } from './supabase';

export async function getDepartments() {
  if (!supabase) throw new Error('Your workspace is not connected.');

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name')
    .returns<Department[]>();
  if (error) throw new Error('Could not load Departments. Please try again.');

  return data;
}

export async function getManagerOptions() {
  if (!supabase) throw new Error('Your workspace is not connected.');

  const { data, error } = await supabase
    .from('employee_profiles')
    .select('*')
    .eq('role', 'manager')
    .eq('is_active', true)
    .order('full_name')
    .returns<EmployeeRecord[]>();
  if (error) throw new Error('Could not load Managers. Please try again.');

  return data.filter((manager) => manager.user_id !== null);
}

export async function saveEmployee(
  employeeId: string | null,
  fields: EmployeeFields,
) {
  if (!supabase) throw new Error('Your workspace is not connected.');

  const { data, error } = await supabase.rpc('save_employee', {
    p_employee_id: employeeId,
    p_full_name: fields.full_name,
    p_work_email: fields.work_email,
    p_job_title: fields.job_title,
    p_department_id: fields.department_id,
    p_manager_id: fields.manager_id,
    p_start_date: fields.start_date,
  });

  if (error) {
    if (error.code === '23505')
      throw new Error('An Employee already uses this work email.');
    if (error.code === '23514' || error.code === '23502')
      throw new Error(
        'Enter a name, valid work email, job title, Department, and start date.',
      );
    if (error.code === '23503')
      throw new Error(
        'The Department or Manager is no longer available. Reload and try again.',
      );
    if (error.code === '22023' || error.code === '42501')
      throw new Error(error.message);
    throw new Error('Could not save the Employee. Please try again.');
  }

  return data as string;
}

export async function saveDepartment(id: string | null, name: string) {
  if (!supabase) throw new Error('Your workspace is not connected.');

  const result = id
    ? await supabase
        .from('departments')
        .update({ name: name.trim() })
        .eq('id', id)
        .select()
        .single()
    : await supabase
        .from('departments')
        .insert({ name: name.trim() })
        .select()
        .single();

  if (result.error) {
    if (result.error.code === '23505')
      throw new Error('A Department already uses this name.');
    if (result.error.code === '23514')
      throw new Error('Enter a Department name between 1 and 100 characters.');
    throw new Error(
      'Could not save the Department. Check your access and try again.',
    );
  }
}

export async function getDirectory() {
  if (!supabase) throw new Error('Your workspace is not connected.');

  const { data, error } = await supabase
    .from('employee_directory')
    .select('*')
    .order('full_name')
    .returns<DirectoryEmployee[]>();

  if (error) throw new Error('Could not load employees. Please try again.');

  return data;
}

export async function getEmployeeRecord(employeeId: string) {
  if (!supabase) throw new Error('Your workspace is not connected.');

  const { data, error } = await supabase
    .from('employee_profiles')
    .select('*')
    .eq('employee_id', employeeId)
    .returns<EmployeeRecord[]>()
    .maybeSingle();

  if (error)
    throw new Error('Could not load employment details. Please try again.');

  return data;
}
