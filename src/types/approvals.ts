import type { LeaveRequest } from './leave';

export interface ApprovalRequest extends LeaveRequest {
  full_name: string;
  can_decide: boolean;
  can_cancel: boolean;
}

export interface ApprovalRequestCardProps {
  request: ApprovalRequest;
  submitting: boolean;
  onDecision: (
    id: string,
    decision: 'approved' | 'rejected',
    reason: string,
  ) => Promise<void>;
}
