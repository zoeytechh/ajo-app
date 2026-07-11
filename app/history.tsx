import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/hooks/useTheme';
import { groupService, type Payment, type PaymentStatus } from '../src/services/groupService';
import { thriftService, type CollectorReport, type ThriftOrgMember } from '../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../src/theme';
import { Skeleton } from '../src/components';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtTime = (d: string) =>
  new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── Org activity timeline ────────────────────────────────────────────────────
type OrgEvent = {
  id: string;
  date: string;
  icon: string;
  title: string;
  subtitle: string;
  variant: 'info' | 'success' | 'warning' | 'error' | 'muted';
};

function buildOrgTimeline(
  members: ThriftOrgMember[],
  reports: CollectorReport[],
): OrgEvent[] {
  const events: OrgEvent[] = [];

  for (const m of members) {
    events.push({
      id: `invite-${m.id}`,
      date: m.created_at,
      icon: 'mail-outline',
      title: `Invite sent to ${m.user.first_name} ${m.user.last_name}`,
      subtitle: m.user.email,
      variant: 'info',
    });
    if (m.joined_at) {
      events.push({
        id: `joined-${m.id}`,
        date: m.joined_at,
        icon: 'checkmark-circle-outline',
        title: `${m.user.first_name} ${m.user.last_name} joined as collector`,
        subtitle: m.status === 'suspended' ? 'Currently suspended' : 'Active collector',
        variant: m.status === 'suspended' ? 'warning' : 'success',
      });
    }
    if (m.status === 'suspended') {
      events.push({
        id: `suspend-${m.id}`,
        date: m.joined_at ?? m.created_at,
        icon: 'pause-circle-outline',
        title: `${m.user.first_name} ${m.user.last_name} suspended`,
        subtitle: 'Collector access revoked',
        variant: 'error',
      });
    }
  }

  for (const r of reports) {
    events.push({
      id: `report-${r.id}`,
      date: r.created_at,
      icon: 'flag-outline',
      title: `Report filed against ${r.collector.first_name} ${r.collector.last_name}`,
      subtitle: r.reason.slice(0, 80) + (r.reason.length > 80 ? '…' : ''),
      variant: 'warning',
    });
    if (r.reviewed_at && r.status !== 'pending') {
      const label = r.status === 'resolved' ? 'Resolved' : r.status === 'dismissed' ? 'Dismissed' : 'Marked as reviewed';
      events.push({
        id: `report-reviewed-${r.id}`,
        date: r.reviewed_at,
        icon: r.status === 'resolved' ? 'shield-checkmark-outline' : r.status === 'dismissed' ? 'close-circle-outline' : 'eye-outline',
        title: `Report ${label.toLowerCase()}`,
        subtitle: r.resolution_notes || `Against ${r.collector.first_name} ${r.collector.last_name}`,
        variant: r.status === 'resolved' ? 'success' : r.status === 'dismissed' ? 'muted' : 'info',
      });
    }
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const statusColor = (s: PaymentStatus, colors: any) =>
  s === 'approved' ? colors.success
  : s === 'rejected' ? colors.error
  : colors.warning;

const statusBg = (s: PaymentStatus, colors: any) =>
  s === 'approved' ? colors.successLight
  : s === 'rejected' ? colors.errorLight
  : colors.warningLight;

// ─── Payment row ─────────────────────────────────────────────────────────────
function PaymentCard({ payment, onPress, colors }: { payment: Payment; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[s.card, { backgroundColor: colors.surface, ...Shadow.soft(colors.black) }]}
    >
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
            {payment.group_name}
          </Text>
          {payment.cycle_number != null && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
              Cycle #{payment.cycle_number}
            </Text>
          )}
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusBg(payment.status, colors) }]}>
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: statusColor(payment.status, colors), textTransform: 'capitalize' }}>
            {payment.status}
          </Text>
        </View>
      </View>

      <View style={s.cardBottom}>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
          ₦{Number(payment.amount_entered).toLocaleString('en-NG')}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
          {fmt(payment.submitted_at)}
        </Text>
      </View>

      {payment.rejection_reason ? (
        <View style={[s.rejectionBanner, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.error, marginLeft: 6 }} numberOfLines={2}>
            {payment.rejection_reason}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Filter tab ───────────────────────────────────────────────────────────────
type Filter = 'all' | PaymentStatus;

function FilterTab({ label, count, active, onPress, colors }: {
  label: string; count: number; active: boolean; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[s.filterTab, { borderBottomColor: active ? colors.primary : 'transparent' }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={{ fontSize: FontSize.xs, fontWeight: active ? '700' : '500', color: active ? colors.primary : colors.textSecondary }}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[s.countBadge, { backgroundColor: active ? colors.primaryTint : colors.background }]}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: active ? colors.primary : colors.textTertiary, lineHeight: 14 }}>
              {count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Org event card ───────────────────────────────────────────────────────────
function OrgEventCard({ event, colors }: { event: OrgEvent; colors: any }) {
  const palette = {
    info:    { bg: colors.primaryTint,  icon: colors.primary },
    success: { bg: colors.successLight, icon: colors.success },
    warning: { bg: '#FEF3C7',           icon: '#D97706' },
    error:   { bg: colors.errorLight,   icon: colors.error },
    muted:   { bg: colors.background,   icon: colors.textTertiary },
  }[event.variant];

  return (
    <View style={[s.card, { backgroundColor: colors.surface, ...Shadow.soft(colors.black), flexDirection: 'row', alignItems: 'flex-start' }]}>
      <View style={[s.eventIcon, { backgroundColor: palette.bg }]}>
        <Ionicons name={event.icon as any} size={18} color={palette.icon} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, lineHeight: 20 }}>
          {event.title}
        </Text>
        {!!event.subtitle && (
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 3, lineHeight: 17 }} numberOfLines={2}>
            {event.subtitle}
          </Text>
        )}
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 5 }}>
          {fmtTime(event.date)}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HistoryRoute() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');

  // Org admin detection
  const { data: myOrgs } = useQuery({
    queryKey: ['my-orgs'],
    queryFn: thriftService.getOrgs,
    staleTime: 5 * 60 * 1000,
  });
  const isOrgAdmin = (myOrgs ?? []).length > 0;

  // Org dashboards — one per owned org
  const orgDashboardResults = useQueries({
    queries: (myOrgs ?? []).map((org) => ({
      queryKey: ['thrift-org', org.id] as const,
      queryFn: () => thriftService.getOrgDashboard(org.id),
      enabled: isOrgAdmin,
      staleTime: 2 * 60 * 1000,
    })),
  });

  // Ajo payment history — only fetch for non-org-admin
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['payment-history'],
    queryFn: groupService.getPaymentHistory,
    enabled: !isOrgAdmin,
  });

  // ── Org admin branch ────────────────────────────────────────────────────────
  if (isOrgAdmin) {
    const dashboardsLoading = orgDashboardResults.some((r) => r.isLoading);
    const allMembers  = orgDashboardResults.flatMap((r) => [
      ...(r.data?.collectors         ?? []),
      ...(r.data?.pending_collectors ?? []),
    ]);
    const allReports  = orgDashboardResults.flatMap((r) => r.data?.recent_reports ?? []);
    const timeline    = buildOrgTimeline(allMembers, allReports);
    const refetchAll  = () => orgDashboardResults.forEach((r) => r.refetch());
    const isRefreshing = orgDashboardResults.some((r) => r.isFetching && !r.isLoading);

    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

        <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary }}>History</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
            Organisation activity — invites, approvals and reports
          </Text>
        </View>

        {dashboardsLoading ? (
          <ScrollView contentContainerStyle={s.body}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width="100%" height={80} radius={Radius.lg} style={{ marginBottom: 12 }} />
            ))}
          </ScrollView>
        ) : timeline.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="time-outline" size={56} color={colors.primaryTint} />
            <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginTop: 16 }}>
              No activity yet
            </Text>
            <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              Actions like inviting collectors and resolving reports will appear here.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.body}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
          >
            {timeline.map((event) => (
              <OrgEventCard key={event.id} event={event} colors={colors} />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // ── Regular user branch (Ajo payment history) ───────────────────────────────
  const payments = data ?? [];
  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);

  const counts: Record<Filter, number> = {
    all:      payments.length,
    pending:  payments.filter((p) => p.status === 'pending').length,
    approved: payments.filter((p) => p.status === 'approved').length,
    rejected: payments.filter((p) => p.status === 'rejected').length,
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary }}>
          History
        </Text>
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
          All your contributions across groups
        </Text>
      </View>

      {/* Filter tabs */}
      <View style={[s.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['all', 'pending', 'approved', 'rejected'] as Filter[]).map((f) => (
          <FilterTab
            key={f}
            label={f.charAt(0).toUpperCase() + f.slice(1)}
            count={counts[f]}
            active={filter === f}
            onPress={() => setFilter(f)}
            colors={colors}
          />
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <ScrollView contentContainerStyle={s.body}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={88} radius={Radius.lg} style={{ marginBottom: 12 }} />
          ))}
        </ScrollView>
      ) : isError ? (
        <View style={s.empty}>
          <Ionicons name="wifi-outline" size={48} color={colors.textTertiary} />
          <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
            Couldn't load history
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="time-outline" size={56} color={colors.primaryTint} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginTop: 16 }}>
            {filter === 'all' ? 'No payments yet' : `No ${filter} payments`}
          </Text>
          <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            {filter === 'all'
              ? 'Payments you submit to any group will appear here.'
              : `You have no ${filter} payments right now.`}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.body}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              colors={colors}
              onPress={() => router.push(`/group/${payment.group_id}` as any)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 2.5,
  },
  countBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  eventIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginLeft: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 8,
    borderRadius: Radius.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
});
