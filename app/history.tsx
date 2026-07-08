import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/hooks/useTheme';
import { groupService, type Payment, type PaymentStatus } from '../src/services/groupService';
import { FontSize, Radius, Shadow } from '../src/theme';
import { Skeleton } from '../src/components';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

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

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HistoryRoute() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['payment-history'],
    queryFn: groupService.getPaymentHistory,
  });

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
