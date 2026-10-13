export interface CompanyHoliday {
  id: string;
  holiday_date: string;
  name: string;
}

export interface CalendarAbsence {
  employee_id: string;
  full_name: string;
  start_date: string;
  end_date: string;
}
