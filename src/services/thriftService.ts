import api from './api';
import type { AjoUser } from '../store/useAppStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThriftFrequency    = 'daily' | 'weekly' | 'monthly';
export type ThriftMemberStatus = 'pending' | 'approved' | 'rejected' | 'amount_pending';
export type ThriftCycleType    = 'rolling' | 'fixed';
export type ThriftCycleStatus  = 'active' | 'completed';
export type OrgType            = 'bank' | 'mfb' | 'cooperative' | 'other';
export type OrgMemberRole      = 'admin' | 'collector';
export type OrgMemberStatus    = 'pending' | 'active' | 'suspended';
export type ReportStatus       = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface ThriftOrganization {
  id: number;
  name: string;
  org_type: OrgType;
  logo: string | null;
  registration_number: string;
  is_verified: boolean;
  owner: AjoUser;
  member_count: number;
  created_at: string;
}

export interface ThriftOrgMember {
  id: number;
  organization: ThriftOrganization;
  user: AjoUser;
  role: OrgMemberRole;
  status: OrgMemberStatus;
  joined_at: string | null;
  created_at: string;
}

export interface ThriftCycle {
  id: number;
  cycle_number: number;
  start_date: string;
  end_date: string | null;
  status: ThriftCycleStatus;
  ended_at: string | null;
  created_at: string;
}

export interface ThriftGroup {
  id: number;
  name: string;
  description: string;
  frequency: ThriftFrequency;
  cycle_type: ThriftCycleType;
  collector: AjoUser;
  organization: ThriftOrganization | null;
  invite_code: string;
  member_count: number;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  trial_start: string | null;
  trial_end: string | null;
  subscription_expires: string | null;
  active_cycle: ThriftCycle | null;
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
  cycle_id: number | null;
  amount: string;
  period_date: string;
  notes: string;
  marked_at: string;
}

export interface CollectorReport {
  id: number;
  collector: AjoUser;
  reported_by: AjoUser;
  group: number;
  organization: ThriftOrganization | null;
  reason: string;
  status: ReportStatus;
  resolution_notes: string;
  created_at: string;
  reviewed_at: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const thriftService = {
  // ── Groups ──────────────────────────────────────────────────────────────────
  getGroups: async (): Promise<ThriftGroup[]> => {
    const { data } = await api.get('/api/thrift/');
    return data;
  },

  getGroup: async (id: number): Promise<ThriftGroup> => {
    const { data } = await api.get(`/api/thrift/${id}/`);
    return data;
  },

  createGroup: async (payload: {
    name: string;
    description?: string;
    frequency: ThriftFrequency;
    cycle_type: ThriftCycleType;
    start_date?: string | null;
    end_date?: string | null;
  }): Promise<ThriftGroup> => {
    const { data } = await api.post('/api/thrift/', payload);
    return data;
  },

  regenerateInvite: async (id: number): Promise<{ invite_code: string }> => {
    const { data } = await api.post(`/api/thrift/${id}/invite/regenerate/`);
    return data;
  },

  // ── Members ─────────────────────────────────────────────────────────────────
  getMembers: async (groupId: number, statusFilter?: string): Promise<ThriftMember[]> => {
    const params = statusFilter ? { status: statusFilter } : {};
    const { data } = await api.get(`/api/thrift/${groupId}/members/`, { params });
    return data;
  },

  joinByCode: async (payload: { invite_code: string; personal_amount: string }): Promise<{ message: string; member: ThriftMember }> => {
    const { data } = await api.post('/api/thrift/join/', payload);
    return data;
  },

  reviewMember: async (
    groupId: number,
    memberId: number,
    payload: { action: 'approve' | 'reject' | 'flag_amount'; reason?: string },
  ): Promise<ThriftMember> => {
    const { data } = await api.patch(`/api/thrift/${groupId}/members/${memberId}/`, payload);
    return data;
  },

  updateMyAmount: async (groupId: number, memberId: number, personalAmount: string): Promise<ThriftMember> => {
    const { data } = await api.patch(`/api/thrift/${groupId}/members/${memberId}/`, { personal_amount: personalAmount });
    return data;
  },

  // ── Payments ────────────────────────────────────────────────────────────────
  getPayments: async (groupId: number, memberId?: number): Promise<ThriftPayment[]> => {
    const params = memberId ? { member_id: memberId } : {};
    const { data } = await api.get(`/api/thrift/${groupId}/payments/`, { params });
    return data;
  },

  markPayment: async (groupId: number, payload: {
    member_id: number;
    period_date: string;
    amount: string;
    notes?: string;
  }): Promise<ThriftPayment> => {
    const { data } = await api.post(`/api/thrift/${groupId}/payments/`, payload);
    return data;
  },

  unmarkPayment: async (groupId: number, paymentId: number): Promise<void> => {
    await api.delete(`/api/thrift/${groupId}/payments/${paymentId}/`);
  },

  // ── Cycles ──────────────────────────────────────────────────────────────────
  getCycles: async (groupId: number): Promise<ThriftCycle[]> => {
    const { data } = await api.get(`/api/thrift/${groupId}/cycles/`);
    return data;
  },

  endCycle: async (groupId: number): Promise<ThriftCycle> => {
    const { data } = await api.post(`/api/thrift/${groupId}/cycles/end/`);
    return data;
  },

  restartCycle: async (groupId: number, payload: { start_date?: string; end_date?: string | null }): Promise<ThriftCycle> => {
    const { data } = await api.post(`/api/thrift/${groupId}/cycles/restart/`, payload);
    return data;
  },

  // ── Reports ─────────────────────────────────────────────────────────────────
  reportCollector: async (groupId: number, reason: string): Promise<CollectorReport> => {
    const { data } = await api.post(`/api/thrift/${groupId}/report/`, { reason });
    return data;
  },

  // ── Organisations ────────────────────────────────────────────────────────────
  getOrgs: async (): Promise<ThriftOrganization[]> => {
    const { data } = await api.get('/api/thrift/orgs/');
    return data;
  },

  getOrg: async (orgId: number): Promise<ThriftOrganization> => {
    const { data } = await api.get(`/api/thrift/orgs/${orgId}/`);
    return data;
  },

  createOrg: async (payload: {
    name: string;
    org_type: OrgType;
    registration_number?: string;
    logo?: any;
  }): Promise<ThriftOrganization> => {
    const form = new FormData();
    form.append('name', payload.name);
    form.append('org_type', payload.org_type);
    if (payload.registration_number) form.append('registration_number', payload.registration_number);
    if (payload.logo) form.append('logo', payload.logo);
    const { data } = await api.post('/api/thrift/orgs/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  updateOrg: async (orgId: number, payload: Partial<{ name: string; org_type: OrgType; registration_number: string; logo: any }>): Promise<ThriftOrganization> => {
    const { data } = await api.patch(`/api/thrift/orgs/${orgId}/`, payload);
    return data;
  },

  getOrgMembers: async (orgId: number): Promise<ThriftOrgMember[]> => {
    const { data } = await api.get(`/api/thrift/orgs/${orgId}/members/`);
    return data;
  },

  inviteCollector: async (orgId: number, email: string): Promise<{ detail: string }> => {
    const { data } = await api.post(`/api/thrift/orgs/${orgId}/members/`, { email });
    return data;
  },

  acceptOrgInvite: async (invite_token: string): Promise<ThriftOrgMember> => {
    const { data } = await api.post('/api/thrift/orgs/accept-invite/', { invite_token });
    return data;
  },

  orgMemberAction: async (orgId: number, memberId: number, action: 'suspend' | 'activate' | 'remove'): Promise<ThriftOrgMember | void> => {
    if (action === 'remove') {
      await api.patch(`/api/thrift/orgs/${orgId}/members/${memberId}/`, { action });
      return;
    }
    const { data } = await api.patch(`/api/thrift/orgs/${orgId}/members/${memberId}/`, { action });
    return data;
  },

  getOrgDashboard: async (orgId: number): Promise<{
    organization: ThriftOrganization;
    collectors: ThriftOrgMember[];
    groups: ThriftGroup[];
    recent_reports: CollectorReport[];
  }> => {
    const { data } = await api.get(`/api/thrift/orgs/${orgId}/dashboard/`);
    return data;
  },

  getOrgReports: async (orgId: number, statusFilter?: string): Promise<CollectorReport[]> => {
    const params = statusFilter ? { status: statusFilter } : {};
    const { data } = await api.get(`/api/thrift/orgs/${orgId}/reports/`, { params });
    return data;
  },

  resolveReport: async (orgId: number, reportId: number, action: 'resolve' | 'dismiss' | 'review', resolution_notes?: string): Promise<CollectorReport> => {
    const { data } = await api.patch(`/api/thrift/orgs/${orgId}/reports/${reportId}/`, { action, resolution_notes });
    return data;
  },
};
