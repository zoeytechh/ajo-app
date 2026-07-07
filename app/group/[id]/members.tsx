import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, StyleSheet, Modal, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/store/useAppStore';
import { groupService, type Membership } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Pill, Skeleton, LoadingOverlay, feedback } from '../../../src/components';

// ─── Confirm modal ────────────────────────────────────────────────────────────
const ConfirmModal: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ visible, title, message, confirmLabel, confirmDestructive, onConfirm, onCancel }) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.modalOverlay} onPress={onCancel}>
        <Pressable style={[s.modalBox, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>
            {title}
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: 24 }}>
            {message}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={[s.modalBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[s.modalBtn, { backgroundColor: confirmDestructive ? colors.error : colors.primary }]}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Member row ───────────────────────────────────────────────────────────────
const statusColor = (status: string, colors: any) => ({
  pending:  { bg: colors.warningLight,  fg: colors.warningDark  },
  approved: { bg: colors.successLight,  fg: colors.successDark  },
  rejected: { bg: colors.errorLight,    fg: colors.errorDark    },
}[status] ?? { bg: colors.border, fg: colors.textSecondary });

const MemberRow: React.FC<{
  membership: Membership;
  isAdmin: boolean;
  onApprove: (m: Membership) => void;
  onReject:  (m: Membership) => void;
  onRemove:  (m: Membership) => void;
}> = ({ membership, isAdmin, onApprove, onReject, onRemove }) => {
  const { colors } = useTheme();
  const sc = statusColor(membership.status, colors);

  return (
    <View style={[s.memberRow, { borderBottomColor: colors.border }]}>
      <View style={[s.avatar, { backgroundColor: colors.primaryTint }]}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.primary }}>
          {membership.user.first_name?.[0] ?? membership.user.email[0].toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
          {membership.user.first_name} {membership.user.last_name}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
          {membership.user.email}
        </Text>
        {membership.status === 'approved' && Number(membership.total_approved) > 0 && (
          <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 2 }}>
            Total paid: ₦{Number(membership.total_approved).toLocaleString()}
          </Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Pill label={membership.status} bg={sc.bg} color={sc.fg} />
        {isAdmin && membership.status === 'pending' && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={() => onApprove(membership)}
              style={[s.actionChip, { backgroundColor: colors.successLight }]}
            >
              <Ionicons name="checkmark" size={14} color={colors.successDark} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.successDark, marginLeft: 3 }}>
                Approve
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onReject(membership)}
              style={[s.actionChip, { backgroundColor: colors.errorLight }]}
            >
              <Ionicons name="close" size={14} color={colors.errorDark} />
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.errorDark, marginLeft: 3 }}>
                Reject
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {isAdmin && membership.status === 'approved' && (
          <TouchableOpacity
            onPress={() => onRemove(membership)}
            style={[s.actionChip, { backgroundColor: colors.errorLight }]}
          >
            <Ionicons name="person-remove-outline" size={13} color={colors.errorDark} />
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.errorDark, marginLeft: 3 }}>
              Remove
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Members Screen ───────────────────────────────────────────────────────────
export default function MembersRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive: boolean;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', confirmLabel: '', destructive: false, onConfirm: () => {} });

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupDetail(groupId),
    enabled: !!groupId,
  });

  const { data: members, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['members', groupId],
    queryFn: () => groupService.getMembers(groupId),
    enabled: !!groupId,
  });

  const isGroupAdmin = group?.admin.id === user?.id;

  const reviewMutation = useMutation({
    mutationFn: ({ membershipId, action }: { membershipId: number; action: 'approve' | 'reject' }) =>
      groupService.reviewMembership(groupId, membershipId, action),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: () => feedback('error'),
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId: number) => groupService.removeMember(groupId, membershipId),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
    onError: () => feedback('error'),
  });

  const closeModal = () =>
    setConfirmModal((prev) => ({ ...prev, visible: false }));

  const handleApprove = (m: Membership) => {
    setConfirmModal({
      visible: true,
      title: 'Approve member',
      message: `Approve ${m.user.first_name} ${m.user.last_name} to join this group?`,
      confirmLabel: 'Approve',
      destructive: false,
      onConfirm: () => {
        closeModal();
        reviewMutation.mutate({ membershipId: m.id, action: 'approve' });
      },
    });
  };

  const handleReject = (m: Membership) => {
    setConfirmModal({
      visible: true,
      title: 'Reject request',
      message: `Reject ${m.user.first_name} ${m.user.last_name}'s join request?`,
      confirmLabel: 'Reject',
      destructive: true,
      onConfirm: () => {
        closeModal();
        reviewMutation.mutate({ membershipId: m.id, action: 'reject' });
      },
    });
  };

  const handleRemove = (m: Membership) => {
    setConfirmModal({
      visible: true,
      title: 'Remove member',
      message: `Remove ${m.user.first_name} ${m.user.last_name} from this group? This cannot be undone.`,
      confirmLabel: 'Remove',
      destructive: true,
      onConfirm: () => {
        closeModal();
        removeMutation.mutate(m.id);
      },
    });
  };

  const pending  = members?.filter((m) => m.status === 'pending')  ?? [];
  const approved = members?.filter((m) => m.status === 'approved') ?? [];
  const rejected = members?.filter((m) => m.status === 'rejected') ?? [];

  const isBusy = reviewMutation.isPending || removeMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={isBusy} message="Updating member…" />

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmDestructive={confirmModal.destructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeModal}
      />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
          Members
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.body}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[s.memberRow, { borderBottomColor: colors.border }]}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                  <Skeleton width="50%" height={14} radius={4} />
                  <Skeleton width="70%" height={11} radius={4} />
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            {/* Pending requests */}
            {isGroupAdmin && pending.length > 0 && (
              <>
                <Text style={sectionLabel(colors)}>Pending Requests ({pending.length})</Text>
                <View style={[s.sectionCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                  {pending.map((m) => (
                    <MemberRow
                      key={m.id}
                      membership={m}
                      isAdmin={isGroupAdmin}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onRemove={handleRemove}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Approved members */}
            <Text style={sectionLabel(colors)}>
              Members ({approved.length})
            </Text>
            {approved.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                  No approved members yet
                </Text>
              </View>
            ) : (
              <View style={[s.sectionCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                {approved.map((m) => (
                  <MemberRow
                    key={m.id}
                    membership={m}
                    isAdmin={isGroupAdmin}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onRemove={handleRemove}
                  />
                ))}
              </View>
            )}

            {/* Rejected (admin view only) */}
            {isGroupAdmin && rejected.length > 0 && (
              <>
                <Text style={sectionLabel(colors)}>Rejected ({rejected.length})</Text>
                <View style={[s.sectionCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                  {rejected.map((m) => (
                    <MemberRow
                      key={m.id}
                      membership={m}
                      isAdmin={isGroupAdmin}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onRemove={handleRemove}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const layout = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionCard: {
    borderRadius: Radius.lg,
    marginBottom: 24,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalBox: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: 24,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});

const s = layout;

const sectionLabel = (colors: any) => ({
  fontSize: FontSize.xs,
  fontWeight: '700' as const,
  color: colors.textTertiary,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  marginBottom: 10,
});
