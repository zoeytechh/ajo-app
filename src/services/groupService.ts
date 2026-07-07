import api from './api';
import type { AjoUser } from '../store/useAppStore';

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Group {
  id: number;
  name: string;
  description: string;
  contribution_amount: string;
  contribution_frequency: 'daily' | 'weekly' | 'monthly';
  collection_day: number | null;
  grace_period_days: number;
  invite_code: string;
  member_count: number;
  admin: AjoUser;
  trial_start: string | null;
  trial_end: string | null;
  subscription_expires: string | null;
  is_subscription_active: boolean;
  is_on_trial: boolean;
  created_at: string;
}

export type MembershipStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus    = 'pending' | 'approved' | 'rejected';
export type CycleStatus      = 'active'  | 'closed';
export type ReviewAction     = 'approve' | 'reject';

export interface Membership {
  id: number;
  user: AjoUser;
  group: number;
  status: MembershipStatus;
  joined_at: string | null;
  total_approved: string;
}

export interface Payment {
  id: number;
  member_name: string;
  member_email: string;
  amount_entered: string;
  amount_ocr: string | null;
  status: PaymentStatus;
  receipt_image: string | null;
  reviewed_by: AjoUser | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  cycle_number: number | null;
  submitted_at: string;
}

export interface Cycle {
  id: number;
  cycle_number: number;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  is_over: boolean;
  can_normal_close: boolean;
  force_close_requested: boolean;
  force_close_acceptor_count: number;
  total_member_count: number;
}

export interface Defaulter {
  id: number;
  user: AjoUser;
  total_approved: string;
}

export interface Subscription {
  id: number;
  months: number;
  amount: string;
  status: 'pending' | 'successful' | 'failed';
  tx_ref: string;
  extends_until: string | null;
  verified_at: string | null;
  initiated_by_email: string;
  group_name: string;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateGroupPayload {
  name: string;
  description?: string;
  contribution_amount: string;
  contribution_frequency: 'daily' | 'weekly' | 'monthly';
  collection_day?: number;
  grace_period_days?: number;
  start_date?: string;  // ISO date YYYY-MM-DD — auto-creates first cycle
  end_date?: string;
}

export interface SubmitPaymentPayload {
  group_id: number;
  amount_entered: string;
  receipt_image?: {
    uri: string;
    name: string;
    type: string;
  } | null;
}

// ─── Group service ─────────────────────────────────────────────────────────────

export const groupService = {
  // ── Groups ──────────────────────────────────────────────────────────────────

  getGroups: async (): Promise<Group[]> => {
    const res = await api.get('/api/groups/');
    return res.data;
  },

  getGroupDetail: async (groupId: number): Promise<Group> => {
    const res = await api.get(`/api/groups/${groupId}/`);
    return res.data;
  },

  createGroup: async (data: CreateGroupPayload): Promise<Group> => {
    const res = await api.post('/api/groups/', data);
    return res.data;
  },

  joinGroup: async (groupId: number): Promise<Membership> => {
    const res = await api.post(`/api/groups/${groupId}/join/`);
    return res.data;
  },

  // ── Members ─────────────────────────────────────────────────────────────────

  getMembers: async (groupId: number, status?: MembershipStatus): Promise<Membership[]> => {
    const params = status ? { status } : {};
    const res = await api.get(`/api/groups/${groupId}/members/`, { params });
    return res.data;
  },

  reviewMembership: async (
    groupId: number,
    membershipId: number,
    action: ReviewAction,
  ): Promise<Membership> => {
    const res = await api.patch(`/api/groups/${groupId}/members/${membershipId}/`, { action });
    return res.data;
  },

  removeMember: async (groupId: number, membershipId: number): Promise<void> => {
    await api.delete(`/api/groups/${groupId}/members/${membershipId}/`);
  },

  // ── Payments ─────────────────────────────────────────────────────────────────

  getPayments: async (groupId: number, status?: PaymentStatus): Promise<Payment[]> => {
    const params = status ? { status } : {};
    const res = await api.get(`/api/groups/${groupId}/payments/`, { params });
    return res.data;
  },

  submitPayment: async ({ group_id, amount_entered, receipt_image }: SubmitPaymentPayload): Promise<Payment> => {
    const form = new FormData();
    form.append('amount_entered', amount_entered);
    if (receipt_image) {
      form.append('receipt_image', receipt_image as any);
    }
    const res = await api.post(`/api/groups/${group_id}/payments/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  reviewPayment: async (
    groupId: number,
    paymentId: number,
    action: ReviewAction,
    reason?: string,
  ): Promise<Payment> => {
    const body: Record<string, string> = { action };
    if (reason) body.reason = reason;
    const res = await api.patch(`/api/groups/${groupId}/payments/${paymentId}/`, body);
    return res.data;
  },

  // ── Cycles ───────────────────────────────────────────────────────────────────

  getCycles: async (groupId: number): Promise<Cycle[]> => {
    const res = await api.get(`/api/groups/${groupId}/cycles/`);
    return res.data;
  },

  startCycle: async (groupId: number, start_date: string, end_date: string): Promise<Cycle> => {
    const res = await api.post(`/api/groups/${groupId}/cycles/`, { start_date, end_date });
    return res.data;
  },

  closeCycle: async (groupId: number, cycleId: number): Promise<Cycle> => {
    const res = await api.post(`/api/groups/${groupId}/cycles/${cycleId}/close/`);
    return res.data;
  },

  requestEarlyClose: async (groupId: number, cycleId: number): Promise<Cycle> => {
    const res = await api.post(`/api/groups/${groupId}/cycles/${cycleId}/request-early-close/`);
    return res.data;
  },

  acceptEarlyClose: async (groupId: number, cycleId: number): Promise<{ message: string; accepted_count: number; total_count: number }> => {
    const res = await api.post(`/api/groups/${groupId}/cycles/${cycleId}/accept-early-close/`);
    return res.data;
  },

  getDefaulters: async (groupId: number, cycleId: number): Promise<{ cycle_number: number; end_date: string; status: CycleStatus; visible_from: string; grace_period_active: boolean; defaulters: Defaulter[] }> => {
    const res = await api.get(`/api/groups/${groupId}/cycles/${cycleId}/defaulters/`);
    return res.data;
  },

  // ── Invite ───────────────────────────────────────────────────────────────────

  joinByCode: async (invite_code: string): Promise<{ message: string; group_name: string; membership: Membership }> => {
    const res = await api.post('/api/invite/join/', { invite_code: invite_code.toUpperCase().trim() });
    return res.data;
  },

  regenerateInviteCode: async (groupId: number): Promise<{ invite_code: string }> => {
    const res = await api.post(`/api/groups/${groupId}/invite/regenerate/`);
    return res.data;
  },

  // ── Subscription ─────────────────────────────────────────────────────────────

  initiateSubscription: async (groupId: number, months: number): Promise<{ link: string; subscription: Subscription }> => {
    const res = await api.post(`/api/groups/${groupId}/subscription/initiate/`, { months });
    return res.data;
  },

  verifySubscription: async (groupId: number, transaction_id: string): Promise<Subscription> => {
    const res = await api.get(`/api/groups/${groupId}/subscription/verify/`, {
      params: { transaction_id },
    });
    return res.data;
  },
};
