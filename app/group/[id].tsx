import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/useAppStore';
import { groupService, type Payment, type Cycle } from '../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { Skeleton, Pill, LoadingOverlay } from '../../src/components';

// ─── Invite Code card ─────────────────────────────────────────────────────────
const InviteCard: React.FC<{ groupId: number; inviteCode: string; colors: any }> = ({
  groupId, inviteCode, colors,
}) => {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const regenMutation = useMutation({
    mutationFn: () => groupService.regenerateInviteCode(groupId),
    onSuccess: (data) => {
      queryClient.setQueryData(['group', groupId], (old: any) =>
        old ? { ...old, invite_code: data.invite_code } : old,
      );
    },
  });

  const handleCopy = () => {
    Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[s.inviteCard, { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Ionicons name="key-outline" size={16} color={colors.primary} />
        <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.primary, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Invite Code
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.primary, letterSpacing: 3, flex: 1 }}>
          {regenMutation.isPending ? '········' : inviteCode}
        </Text>

        <TouchableOpacity
          onPress={handleCopy}
          style={[s.inviteBtn, { backgroundColor: copied ? colors.successLight : colors.surface }]}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={16}
            color={copied ? colors.successDark : colors.primary}
          />
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: copied ? colors.successDark : colors.primary, marginLeft: 4 }}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => regenMutation.mutate()}
          disabled={regenMutation.isPending}
          style={[s.inviteBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: FontSize.xs, color: colors.primary, opacity: 0.7, marginTop: 8 }}>
        Share this code with people you want to invite. Tap refresh to generate a new code.
      </Text>
    </View>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const freqLabel = (f: string) => ({ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[f] ?? f);

const formatAmt = (v: string | number) => `₦${Number(v).toLocaleString()}`;

const statusColor = (status: string, colors: any) => ({
  pending:  { bg: colors.warningLight, fg: colors.warningDark },
  approved: { bg: colors.successLight, fg: colors.successDark },
  rejected: { bg: colors.errorLight,   fg: colors.errorDark   },
  active:   { bg: colors.primaryTint,  fg: colors.primary      },
  closed:   { bg: colors.border,       fg: colors.textSecondary },
}[status] ?? { bg: colors.border, fg: colors.textSecondary });

// ─── Payment row (read-only — full review handled in /payments screen) ────────
const PaymentRow: React.FC<{ payment: Payment }> = ({ payment }) => {
  const { colors } = useTheme();
  const sc = statusColor(payment.status, colors);

  return (
    <View style={[s.payRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>
          {payment.member_name}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
          {formatAmt(payment.amount_entered)}
          {payment.cycle_number ? ` · Cycle ${payment.cycle_number}` : ''}
        </Text>
      </View>
      <Pill label={payment.status} bg={sc.bg} color={sc.fg} />
    </View>
  );
};

// ─── Cycle status card ────────────────────────────────────────────────────────
const CycleCard: React.FC<{ cycle: Cycle | undefined; colors: any }> = ({ cycle, colors }) => {
  if (!cycle) {
    return (
      <View style={[s.cycleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="time-outline" size={20} color={colors.textTertiary} />
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginLeft: 8 }}>
          No active cycle
        </Text>
      </View>
    );
  }

  const sc = statusColor(cycle.status, colors);
  const end = new Date(cycle.end_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={[s.cycleCard, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
            Cycle {cycle.cycle_number}
          </Text>
          <Pill label={cycle.status} bg={sc.bg} color={sc.fg} />
        </View>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
          Ends {end}
          {cycle.force_close_requested
            ? ` · ${cycle.force_close_acceptor_count}/${cycle.total_member_count} accepted early close`
            : ''}
        </Text>
      </View>
    </View>
  );
};

// ─── Quick action button ──────────────────────────────────────────────────────
const ActionBtn: React.FC<{ icon: string; label: string; onPress: () => void; colors: any }> = ({
  icon, label, onPress, colors,
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={[s.actionIcon, { backgroundColor: colors.primaryTint }]}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
    </View>
    <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.textPrimary, marginTop: 8, textAlign: 'center' }}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Group Detail Screen ──────────────────────────────────────────────────────
export default function GroupDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: group, isLoading: groupLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupDetail(groupId),
    enabled: !!groupId,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', groupId],
    queryFn: () => groupService.getPayments(groupId),
    enabled: !!groupId,
  });

  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['cycles', groupId],
    queryFn: () => groupService.getCycles(groupId),
    enabled: !!groupId,
  });

  const joinMutation = useMutation({
    mutationFn: () => groupService.joinGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const isGroupAdmin = group?.admin.id === user?.id;
  const activeCycle  = cycles?.find((c) => c.status === 'active');

  // Pending items count (admin only)
  const pendingPayments = payments?.filter((p) => p.status === 'pending').length ?? 0;

  if (groupLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 52, marginBottom: 24 }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Skeleton width="60%" height={24} style={{ marginBottom: 10 }} />
        <Skeleton width="90%" height={14} style={{ marginBottom: 24 }} />
        <Skeleton width="100%" height={80} radius={Radius.lg} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={80} radius={Radius.lg} />
      </View>
    );
  }

  if (isError || !group) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="warning-outline" size={48} color={colors.error} />
        <Text style={{ fontSize: FontSize.md, color: colors.textPrimary, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
          Could not load group
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={joinMutation.isPending} message="Sending join request…" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ── Header ── */}
        <View style={[s.groupHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: '#FFF', marginBottom: 4 }}>
                {group.name}
              </Text>
              {!!group.description && (
                <Text style={{ fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 18 }}>
                  {group.description}
                </Text>
              )}
            </View>
            {isGroupAdmin && (
              <View style={[s.adminBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#FFF' }}>Admin</Text>
              </View>
            )}
          </View>

          {/* Stats row */}
          <View style={[s.statsRow, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={s.statItem}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFF' }}>
                {formatAmt(group.contribution_amount)}
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' }}>
                {freqLabel(group.contribution_frequency)}
              </Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFF' }}>
                {group.member_count}
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' }}>Members</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* ── Pending alert (admin only) ── */}
          {isGroupAdmin && pendingPayments > 0 && (
            <TouchableOpacity
              onPress={() => router.push(`/group/${groupId}/payments` as any)}
              style={[s.alertBanner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}
            >
              <Ionicons name="alert-circle-outline" size={18} color={colors.warningDark} />
              <Text style={{ fontSize: FontSize.sm, color: colors.warningDark, flex: 1, marginLeft: 8, fontWeight: '600' }}>
                {pendingPayments} payment{pendingPayments > 1 ? 's' : ''} awaiting your review
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.warningDark} />
            </TouchableOpacity>
          )}

          {/* ── Invite code card (admin only) ── */}
          {isGroupAdmin && (
            <InviteCard groupId={groupId} inviteCode={group.invite_code} colors={colors} />
          )}

          {/* ── Cycle Status ── */}
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 }}>
            Current Cycle
          </Text>
          {cyclesLoading ? (
            <Skeleton width="100%" height={64} radius={Radius.lg} style={{ marginBottom: 20 }} />
          ) : (
            <View style={{ marginBottom: 20 }}>
              <CycleCard cycle={activeCycle} colors={colors} />
            </View>
          )}

          {/* ── Quick actions ── */}
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>
            Actions
          </Text>
          <View style={s.actionsGrid}>
            <ActionBtn
              icon="cash-outline"
              label="Submit Payment"
              colors={colors}
              onPress={() => router.push(`/group/${groupId}/submit-payment` as any)}
            />
            <ActionBtn
              icon="people-outline"
              label="Members"
              colors={colors}
              onPress={() => router.push(`/group/${groupId}/members` as any)}
            />
            <ActionBtn
              icon="receipt-outline"
              label="Payments"
              colors={colors}
              onPress={() => router.push(`/group/${groupId}/payments` as any)}
            />
            {isGroupAdmin && (
              <ActionBtn
                icon="refresh-circle-outline"
                label="Cycles"
                colors={colors}
                onPress={() => router.push(`/group/${groupId}/cycles` as any)}
              />
            )}
          </View>

          {/* ── Recent payments ── */}
          <View style={[s.section, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }}>
                Recent Payments
              </Text>
              <TouchableOpacity onPress={() => router.push(`/group/${groupId}/payments` as any)}>
                <Text style={{ fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' }}>See all</Text>
              </TouchableOpacity>
            </View>

            {paymentsLoading ? (
              <>
                <Skeleton width="100%" height={48} radius={Radius.sm} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={48} radius={Radius.sm} />
              </>
            ) : !payments || payments.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="document-outline" size={32} color={colors.textTertiary} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 8 }}>
                  No payments yet
                </Text>
              </View>
            ) : (
              payments.slice(0, 5).map((p) => (
                <PaymentRow key={p.id} payment={p} />
              ))
            )}
          </View>

          {/* ── Join button (non-member) ── */}
          {!isGroupAdmin && (
            <TouchableOpacity
              onPress={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              style={[s.joinBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: FontSize.md, fontWeight: '700', marginLeft: 8 }}>
                Request to Join
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Layout stylesheet ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  groupHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },
  adminBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cycleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    width: '47%',
    padding: 16,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.full,
    marginTop: 8,
  },
  inviteCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
});
