export interface LeaveSummary {
  scope: 'own' | 'direct_reports' | 'company';
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export interface WorkspaceOverview {
  active_headcount: number;
  summaries: LeaveSummary[];
}
