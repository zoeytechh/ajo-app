import api from './api';
import type { AjoUser } from '../store/useAppStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThriftFrequency   = 'daily' | 'weekly' | 'monthly';
export type ThriftMemberStatus = 'pending' | 'approved' | 'rejected' | 'amount_pending';

export interface ThriftGroup {
  id: number;
  name: string;
  description: string;
  frequency: ThriftFrequency;
  collector: AjoUser;
  invite_code: string;
  member_count: number;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  trial_start: string | null;
  trial_end: string | null;
  subscription_expires: string | null;
  created_at: string;
}

export interface ThriftMember {
  id: number;
  user: AjoUser;
  group: ThriftGroup;
  personal_amount: string;
  status: ThriftMemberStatus;
  flag_reason: string;
  joined_at: string | null;
  total_saved: string;
  created_at: string;
}

export interface ThriftPayment {
  id: number;
  member: number;
  member_name: string;
  amount: string;
  period_date: string;
  notes: string;
  marked_at: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const thriftService = {
  getGroups: async (): Promise<ThriftGroup[]> => {
    const { data } = await api.get('/thrift/');
    return data;
  },

  getGroup: async (id: number): Promise<ThriftGroup> => {
    const { data } = await api.get(`/thrift/${id}/`);
    return data;
  },

  createGroup: async (payload: { name: string; description?: string; frequency: ThriftFrequency }): Promise<ThriftGroup> => {
    const { data } = await api.post('/thrift/', payload);
    return data;
  },

  regenerateInvite: async (id: number): Promise<{ invite_code: string }> => {
    const { data } = await api.post(`/thrift/${id}/invite/regenerate/`);
    return data;
  },

  getMembers: async (groupId: number, statusFilter?: string): Promise<ThriftMember[]> => {
    const params = statusFilter ? { status: statusFilter } : {};
    const { data } = await api.get(`/thrift/${groupId}/members/`, { params });
    return data;
  },

  joinByCode: async (payload: { invite_code: string; personal_amount: string }): Promise<{ message: string; member: ThriftMember }> => {
    const { data } = await api.post('/thrift/join/', payload);
    return data;
  },

  reviewMember: async (
    groupId: number,
    memberId: number,
    payload: { action: 'approve' | 'reject' | 'flag_amount'; reason?: string },
  ): Promise<ThriftMember> => {
    const { data } = await api.patch(`/thrift/${groupId}/members/${memberId}/`, payload);
    return data;
  },

  updateMyAmount: async (groupId: number, memberId: number, personalAmount: string): Promise<ThriftMember> => {
    const { data } = await api.patch(`/thrift/${groupId}/members/${memberId}/`, { personal_amount: personalAmount });
    return data;
  },

  getPayments: async (groupId: number, memberId?: number): Promise<ThriftPayment[]> => {
    const params = memberId ? { member_id: memberId } : {};
    const { data } = await api.get(`/thrift/${groupId}/payments/`, { params });
    return data;
  },

  markPayment: async (groupId: number, payload: {
    member_id: number;
    period_date: string;
    amount: string;
    notes?: string;
  }): Promise<ThriftPayment> => {
    const { data } = await api.post(`/thrift/${groupId}/payments/`, payload);
    return data;
  },

  unmarkPayment: async (groupId: number, paymentId: number): Promise<void> => {
    await api.delete(`/thrift/${groupId}/payments/${paymentId}/`);
  },
};
