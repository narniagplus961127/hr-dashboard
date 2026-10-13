import { supabase } from './supabase';
import type { CompanyHoliday } from './types/calendar';

export function companyToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function displayCompanyDate(date: string) {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`));
}

export async function getHolidays() {
  if (!supabase) throw new Error('Your workspace is not connected.');
  const { data, error } = await supabase
    .from('company_holidays')
    .select('*')
    .order('holiday_date')
    .returns<CompanyHoliday[]>();
  if (error)
    throw new Error('Could not load Public holidays. Please try again.');
  return data;
}

export async function saveHoliday(
  id: string | null,
  name: string,
  date: string,
) {
  if (!supabase) throw new Error('Your workspace is not connected.');
  const fields = { name: name.trim(), holiday_date: date };
  const query = id
    ? supabase.from('company_holidays').update(fields).eq('id', id)
    : supabase.from('company_holidays').insert(fields);
  const { data, error } = await query.select('id').single();
  if (error) {
    if (error.code === '23505')
      throw new Error(
        'A Public holiday already exists on this date. Edit that holiday instead.',
      );
    if (['23514', '22007', '22008'].includes(error.code))
      throw new Error(
        'Enter a holiday name and a valid date between 1900 and 2100.',
      );
    throw new Error('Could not save the Public holiday. Reload and try again.');
  }
  return data;
}

export async function deleteHoliday(id: string) {
  if (!supabase) throw new Error('Your workspace is not connected.');
  const { error } = await supabase
    .from('company_holidays')
    .delete()
    .eq('id', id)
    .select('id')
    .single();
  if (error)
    throw new Error(
      'Could not delete the Public holiday. Reload and try again.',
    );
}
