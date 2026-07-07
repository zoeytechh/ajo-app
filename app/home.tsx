import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/useAppStore';
import { groupService, type Group } from '../src/services/groupService';
import { FontSize, Radius, Shadow } from '../src/theme';
import { Skeleton, Pill } from '../src/components';

// ─── Frequency label ──────────────────────────────────────────────────────────
const FREQ: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const freqLabel = (f: string) => FREQ[f] ?? f;

// ─── Group Card ───────────────────────────────────────────────────────────────
const GroupCard: React.FC<{ group: Group; isAdmin: boolean; onPress: () => void }> = ({
  group, isAdmin, onPress,
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        s.card,
        { backgroundColor: colors.surface, ...Shadow.card(colors.black) },
      ]}
    >
      <View style={s.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text
            style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 }}
            numberOfLines={1}
          >
            {group.name}
          </Text>
          {!!group.description && (
            <Text
              style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 18 }}
              numberOfLines={2}
            >
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
            ₦{Number(group.contribution_amount).toLocaleString()} / {freqLabel(group.contribution_frequency)}
          </Text>
        </View>
        {isAdmin && (
          <Pill
            label="Admin"
            bg={colors.primaryTint}
            color={colors.primary}
            style={{ marginLeft: 'auto' }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Skeleton card placeholder ────────────────────────────────────────────────
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

// ─── Section label ────────────────────────────────────────────────────────────
const SectionTitle: React.FC<{ label: string }> = ({ label }) => {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>
      {label}
    </Text>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyGroups: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
      <Ionicons name="people-circle-outline" size={64} color={colors.primaryTint} />
      <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>
        No groups yet
      </Text>
      <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
        Create your first Ajo group or join one with an invite code.
      </Text>
      <TouchableOpacity
        onPress={onCreate}
        style={[s.emptyBtn, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={18} color={colors.white} />
        <Text style={{ color: colors.white, fontSize: FontSize.sm, fontWeight: '700', marginLeft: 6 }}>
          Create Group
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeRoute() {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const { data: groups, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['groups'],
    queryFn: groupService.getGroups,
  });

  const handleLogout = () => { logout(); router.replace('/login'); };
  const goToGroup   = (id: number) => router.push(`/group/${id}` as any);
  const goToCreate  = () => router.push('/group/create' as any);
  const goToJoin    = () => router.push('/group/join' as any);

  const adminGroups  = groups?.filter((g) => g.admin.id === user?.id) ?? [];
  const joinedGroups = groups?.filter((g) => g.admin.id !== user?.id) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 2 }}>
            Welcome back
          </Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
            {user?.first_name ?? 'there'} {user?.last_name ?? ''}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.headerIcon} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Error banner */}
        {isError && (
          <View style={[s.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: FontSize.sm, marginLeft: 8 }}>
              Could not load groups. Pull down to retry.
            </Text>
          </View>
        )}

        {/* Groups I manage */}
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            {adminGroups.length > 0 && (
              <>
                <SectionTitle label="My Groups" />
                {adminGroups.map((g) => (
                  <GroupCard key={g.id} group={g} isAdmin onPress={() => goToGroup(g.id)} />
                ))}
              </>
            )}

            {/* Groups the user has joined as a member */}
            {joinedGroups.length > 0 && (
              <>
                {adminGroups.length > 0 && <View style={s.sectionDivider} />}
                <SectionTitle label="Groups I've Joined" />
                {joinedGroups.map((g) => (
                  <GroupCard key={g.id} group={g} isAdmin={false} onPress={() => goToGroup(g.id)} />
                ))}
              </>
            )}

            {/* Empty state — no groups at all */}
            {adminGroups.length === 0 && joinedGroups.length === 0 && (
              <EmptyGroups onCreate={goToCreate} />
            )}
          </>
        )}

        {/* Join with invite code — always visible */}
        {!isLoading && (
          <TouchableOpacity
            onPress={goToJoin}
            style={[s.joinCodeBtn, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}
            activeOpacity={0.82}
          >
            <View style={[s.joinCodeIcon, { backgroundColor: colors.primaryTint }]}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                Join a Group
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                Enter an invite code from your group admin
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Create FAB — visible to all users ── */}
      <TouchableOpacity
        onPress={goToCreate}
        activeOpacity={0.85}
        style={[s.fab, { backgroundColor: colors.primary, ...Shadow.strong(colors.primary) }]}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Layout-only stylesheet ───────────────────────────────────────────────────
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
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDivider: {
    height: 1,
    marginVertical: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    marginTop: 20,
  },
  joinCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 8,
  },
  joinCodeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 16,
  },
});
