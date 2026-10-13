import type { FormEvent, ReactNode } from 'react';
import type {
  DirectoryEmployee,
  EmployeeProfile,
  EmployeeRecord,
} from './employee';

export type WorkspacePage = 'profile' | 'directory' | 'departments';

export interface BrandProps {
  light?: boolean;
}
export interface ProfilePageProps {
  profile: EmployeeProfile;
  error: string;
}
export interface EmployeeProfileProps {
  profile: EmployeeProfile;
}
export interface WorkspaceSidebarProps extends EmployeeProfileProps {
  currentPage: WorkspacePage;
}
export interface WorkspaceLayoutProps extends WorkspaceSidebarProps {
  submitting: boolean;
  onSignOut: () => Promise<void>;
  children: ReactNode;
}
export interface LoginPageProps {
  error: string;
  connected: boolean;
  submitting: boolean;
  onSignIn: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}
export interface EmployeeDetailsProps {
  employee: DirectoryEmployee;
  viewer: EmployeeProfile;
  onBack: () => void;
  onEdit: (record: EmployeeRecord) => void;
}
export interface EmployeeFormProps {
  employee: EmployeeRecord | null;
  onSaved: (employeeId: string) => void;
  onCancel: () => void;
}
export interface DirectoryPageProps {
  viewer: EmployeeProfile;
  onRecordSaved: () => Promise<void>;
}
