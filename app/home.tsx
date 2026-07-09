import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/useAppStore';
import { groupService, type Group } from '../src/services/groupService';
import { thriftService, type ThriftGroup } from '../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../src/theme';
import { Skeleton, Pill } from '../src/components';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FREQ: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

// ─── Ajo Group Card ───────────────────────────────────────────────────────────
const GroupCard: React.FC<{ group: Group; isAdmin: boolean; onPress: () => void }> = ({ group, isAdmin, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}
    >
      <View style={s.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 }} numberOfLines={1}>
            {group.name}
          </Text>
          {!!group.description && (
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 18 }} numberOfLines={2}>
              {group.description}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
      <View style={s.cardMeta}>
        <View style={s.metaItem}>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
          </Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
            ₦{Number(group.contribution_amount).toLocaleString()} / {FREQ[group.contribution_frequency]}
          </Text>
        </View>
        {isAdmin && <Pill label="Admin" bg={colors.primaryTint} color={colors.primary} style={{ marginLeft: 'auto' }} />}
      </View>
    </TouchableOpacity>
  );
};

// ─── Thrift Group Card ────────────────────────────────────────────────────────
const ThriftCard: React.FC<{ group: ThriftGroup; isCollector: boolean; onPress: () => void }> = ({ group, isCollector, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}
    >
      <View style={s.cardTop}>
        <View style={[s.thriftBadge, { backgroundColor: colors.successLight }]}>
          <Ionicons name="wallet-outline" size={18} color={colors.success} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 }} numberOfLines={1}>
            {group.name}
          </Text>
          {!!group.description && (
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }} numberOfLines={1}>
              {group.description}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
      <View style={s.cardMeta}>
        <View style={s.metaItem}>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
            {group.member_count} {group.member_count === 1 ? 'payer' : 'payers'}
          </Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>
            {FREQ[group.frequency]}
          </Text>
        </View>
        {isCollector && <Pill label="Collector" bg={colors.successLight} color={colors.success} style={{ marginLeft: 'auto' }} />}
      </View>
    </TouchableOpacity>
  );
};

// ─── Skeletons ────────────────────────────────────────────────────────────────
const CardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
      <Skeleton width="70%" height={16} radius={6} style={{ marginBottom: 8 }} />
      <Skeleton width="90%" height={12} radius={4} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Skeleton width={80} height={12} radius={4} />
        <Skeleton width={110} height={12} radius={4} />
      </View>
    </View>
  );
};

const SectionTitle: React.FC<{ label: string }> = ({ label }) => {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>
      {label}
    </Text>
  );
};

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeRoute() {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<'ajo' | 'thrift'>('ajo');

  const { data: groups, isLoading: ajoLoading, isError: ajoError, refetch: refetchAjo, isRefetching: ajoRefetching } = useQuery({
    queryKey: ['groups'],
    queryFn: groupService.getGroups,
  });

  const { data: thriftGroups, isLoading: thriftLoading, isError: thriftError, refetch: refetchThrift, isRefetching: thriftRefetching } = useQuery({
    queryKey: ['thrift-groups'],
    queryFn: thriftService.getGroups,
  });

  const handleLogout = () => { logout(); router.replace('/login'); };

  const requirePhoto = (action: () => void) => {
    if (!user?.profile_photo) {
      Alert.alert(
        'Profile Photo Required',
        'Upload a profile photo before creating or joining groups.',
        [
          { text: 'Go to Profile', onPress: () => router.push('/profile') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    action();
  };

  // Ajo
  const adminGroups  = groups?.filter((g) => g.admin.id === user?.id) ?? [];
  const joinedGroups = groups?.filter((g) => g.admin.id !== user?.id) ?? [];

  // Thrift
  const myThriftGroups    = thriftGroups?.filter((g) => g.collector.id === user?.id) ?? [];
  const joinedThriftGroups = thriftGroups?.filter((g) => g.collector.id !== user?.id) ?? [];

  const isLoading   = tab === 'ajo' ? ajoLoading   : thriftLoading;
  const isError     = tab === 'ajo' ? ajoError     : thriftError;
  const isRefreshing = tab === 'ajo' ? ajoRefetching : thriftRefetching;
  const onRefresh   = tab === 'ajo' ? refetchAjo   : refetchThrift;

  const handleFab = () => {
    if (tab === 'ajo') {
      requirePhoto(() => router.push('/group/create' as any));
    } else {
      requirePhoto(() => router.push('/thrift/create' as any));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 2 }}>Welcome back</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
            {user?.first_name ?? 'there'} {user?.last_name ?? ''}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.headerIcon} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Ajo / Thrift Toggle ── */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['ajo', 'thrift'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={s.tabBtn} activeOpacity={0.8}>
            <Text style={[s.tabLabel, { color: tab === t ? colors.primary : colors.textSecondary, fontWeight: tab === t ? '700' : '400' }]}>
              {t === 'ajo' ? 'Ajo Groups' : 'Thrift'}
            </Text>
            {tab === t && <View style={[s.tabUnderline, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Body ── */}
      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {isError && (
          <View style={[s.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: FontSize.sm, marginLeft: 8 }}>Could not load. Pull down to retry.</Text>
          </View>
        )}

        {isLoading ? (
          <><CardSkeleton /><CardSkeleton /></>
        ) : tab === 'ajo' ? (
          /* ── Ajo content ── */
          <>
            {adminGroups.length > 0 && (
              <>
                <SectionTitle label="My Groups" />
                {adminGroups.map((g) => (
                  <GroupCard key={g.id} group={g} isAdmin onPress={() => router.push(`/group/${g.id}` as any)} />
                ))}
              </>
            )}
            {joinedGroups.length > 0 && (
              <>
                {adminGroups.length > 0 && <View style={s.sectionDivider} />}
                <SectionTitle label="Groups I've Joined" />
                {joinedGroups.map((g) => (
                  <GroupCard key={g.id} group={g} isAdmin={false} onPress={() => router.push(`/group/${g.id}` as any)} />
                ))}
              </>
            )}
            {adminGroups.length === 0 && joinedGroups.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="people-circle-outline" size={64} color={colors.primaryTint} />
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>No groups yet</Text>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                  Create your first Ajo group or join one with an invite code.
                </Text>
              </View>
            )}
            {!isLoading && (
              <TouchableOpacity
                onPress={() => requirePhoto(() => router.push('/group/join' as any))}
                style={[s.joinCodeBtn, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}
                activeOpacity={0.82}
              >
                <View style={[s.joinCodeIcon, { backgroundColor: colors.primaryTint }]}>
                  <Ionicons name="key-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>Join an Ajo Group</Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Enter an invite code from your group admin</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* ── Thrift content ── */
          <>
            {myThriftGroups.length > 0 && (
              <>
                <SectionTitle label="My Thrift Groups" />
                {myThriftGroups.map((g) => (
                  <ThriftCard key={g.id} group={g} isCollector onPress={() => router.push(`/thrift/${g.id}` as any)} />
                ))}
              </>
            )}
            {joinedThriftGroups.length > 0 && (
              <>
                {myThriftGroups.length > 0 && <View style={s.sectionDivider} />}
                <SectionTitle label="Thrift Groups I've Joined" />
                {joinedThriftGroups.map((g) => (
                  <ThriftCard key={g.id} group={g} isCollector={false} onPress={() => router.push(`/thrift/${g.id}` as any)} />
                ))}
              </>
            )}
            {myThriftGroups.length === 0 && joinedThriftGroups.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="wallet-outline" size={64} color={colors.successLight} />
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>No thrift groups yet</Text>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                  Create a thrift group to start collecting, or join one with an invite code from your collector.
                </Text>
              </View>
            )}
            {!isLoading && (
              <TouchableOpacity
                onPress={() => requirePhoto(() => router.push('/thrift/join' as any))}
                style={[s.joinCodeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.82}
              >
                <View style={[s.joinCodeIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="key-outline" size={20} color={colors.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>Join a Thrift Group</Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Enter the invite code from your collector</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={handleFab}
        activeOpacity={0.85}
        style={[s.fab, { backgroundColor: tab === 'ajo' ? colors.primary : colors.success, ...Shadow.strong(tab === 'ajo' ? colors.primary : colors.success) }]}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tabBtn: {
    marginRight: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabLabel: { fontSize: FontSize.sm },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  card: { borderRadius: Radius.lg, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  thriftBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionDivider: { height: 1, marginVertical: 24 },
  fab: { position: 'absolute', bottom: 92, right: 24, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  joinCodeBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.lg, borderWidth: 1, marginTop: 8 },
  joinCodeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.md, marginBottom: 16 },
});
