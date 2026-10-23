export type UserRole =
  | 'member'
  | 'developer'
  | 'super_admin'
  | 'finance_admin'
  | 'compliance_officer'
  | 'support_agent';

export type UserStatus = 'pending' | 'active' | 'suspended';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type TransactionType = 'deposit' | 'withdrawal' | 'commission' | 'bonus' | 'adjustment';

export type TransactionStatus = 'pending' | 'verified' | 'approved' | 'paid' | 'rejected' | 'reversed';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  member_code: string;
  sponsor_id?: number | null;
  current_rank_id?: number | null;
  status: UserStatus;
  verification_status: VerificationStatus;
  roles: UserRole[];
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  country?: string;
  password: string;
  password_confirmation: string;
  sponsor_code?: string;
}

export interface Rank {
  id: number;
  code: string;
  name: string;
  level: number;
  salary: number;
  min_direct_links?: number | null;
  downline_volume?: number | null;
  count_of_rank?: number | null;
  count_rank_code?: string | null;
}

export interface Wallet {
  balance: number;
  currency: string;
}

export interface Commission {
  id: number;
  recipient_id: number;
  source_member_id: number;
  amount: number;
  generation: number;
  rate: number;
  status: TransactionStatus;
  created_at: string;
}

export interface Referral {
  id: number;
  name: string;
  member_code: string;
  status: UserStatus;
  joined_at: string;
}
