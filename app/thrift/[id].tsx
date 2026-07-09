import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar,
  StyleSheet, RefreshControl, Alert, Modal, TextInput, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/useAppStore';
import { thriftService, type ThriftMember, type ThriftPayment } from '../../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { Pill, LoadingOverlay, Skeleton, feedback } from '../../src/components';

const FREQ_LABEL: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const STATUS_COLOR = (colors: any, s: string) => ({
  pending:        { bg: colors.warningLight, text: colors.warning  },
  approved:       { bg: colors.successLight, text: colors.success  },
  rejected:       { bg: colors.errorLight,   text: colors.error    },
  amount_pending: { bg: colors.warningLight, text: colors.warning  },
}[s] ?? { bg: colors.primaryTint, text: colors.primary });

const STATUS_LABEL: Record<string, string> = {
  pending:        'Pending',
  approved:       'Approved',
  rejected:       'Rejected',
  amount_pending: 'Amount Flagged',
};

// ─── Mark Payment Modal ───────────────────────────────────────────────────────
function MarkPaymentModal({
  visible, member, groupId, onClose,
}: { visible: boolean; member: ThriftMember | null; groupId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [date, setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmt]  = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr]     = useState('');

  const mutation = useMutation({
    mutationFn: () => thriftService.markPayment(groupId, {
      member_id: member!.id,
      period_date: date,
      amount: amount.trim(),
      notes: notes.trim(),
    }),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
      setAmt(''); setNotes(''); setErr('');
      onClose();
    },
    onError: (e: any) => {
      feedback('error');
      const d = e.response?.data;
      setErr(d?.detail ?? d?.amount?.[0] ?? 'Failed to mark payment.');
    },
  });

  const handleMark = () => {
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErr('Enter a valid amount.'); return;
    }
    setErr('');
    mutation.mutate();
  };

  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={[mStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={mStyles.handle} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>
            Mark Payment
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 20 }}>
            {member.user.first_name} {member.user.last_name} · usual ₦{Number(member.personal_amount).toLocaleString()}/period
          </Text>

          <Text style={[mStyles.label, { color: colors.textSecondary }]}>Period date</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            style={[mStyles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[mStyles.label, { color: colors.textSecondary, marginTop: 14 }]}>Amount received (₦)</Text>
          <TextInput
            value={amount}
            onChangeText={(v) => { setAmt(v.replace(/[^0-9.]/g, '')); setErr(''); }}
            placeholder={`e.g. ${Number(member.personal_amount).toLocaleString()}`}
            keyboardType="decimal-pad"
            style={[mStyles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[mStyles.label, { color: colors.textSecondary, marginTop: 14 }]}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any note..."
            style={[mStyles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border, height: 70 }]}
            multiline
            placeholderTextColor={colors.textTertiary}
          />

          {err ? <Text style={{ color: colors.error, fontSize: FontSize.xs, marginTop: 8 }}>{err}</Text> : null}

          <TouchableOpacity
            onPress={handleMark}
            disabled={mutation.isPending}
            style={[mStyles.btn, { backgroundColor: colors.success }]}
          >
            {mutation.isPending
              ? <Text style={{ color: '#fff', fontWeight: '700' }}>Marking…</Text>
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.sm }}>Mark as Paid</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[mStyles.btn, { backgroundColor: colors.background, marginTop: 8 }]}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Flag Amount Modal ────────────────────────────────────────────────────────
function FlagAmountModal({
  visible, member, groupId, onClose,
}: { visible: boolean; member: ThriftMember | null; groupId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => thriftService.reviewMember(groupId, member!.id, { action: 'flag_amount', reason }),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      setReason('');
      onClose();
    },
    onError: () => feedback('error'),
  });

  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={[mStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={mStyles.handle} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>Flag Amount</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 20 }}>
            Tell {member.user.first_name} why their amount of ₦{Number(member.personal_amount).toLocaleString()} is incorrect.
          </Text>
          <Text style={[mStyles.label, { color: colors.textSecondary }]}>Reason (optional)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. We agreed ₦1,000 not ₦500"
            multiline
            style={[mStyles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border, height: 80 }]}
            placeholderTextColor={colors.textTertiary}
          />
          <TouchableOpacity onPress={() => mutation.mutate()} disabled={mutation.isPending}
            style={[mStyles.btn, { backgroundColor: colors.warning, marginTop: 20 }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.sm }}>
              {mutation.isPending ? 'Flagging…' : 'Flag & Notify Payer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[mStyles.btn, { backgroundColor: colors.background, marginTop: 8 }]}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Correct Amount Modal (Payer) ─────────────────────────────────────────────
function CorrectAmountModal({
  visible, member, groupId, onClose,
}: { visible: boolean; member: ThriftMember | null; groupId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [err, setErr]       = useState('');

  const mutation = useMutation({
    mutationFn: () => thriftService.updateMyAmount(groupId, member!.id, amount.trim()),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      setAmount(''); setErr('');
      onClose();
    },
    onError: (e: any) => {
      feedback('error');
      setErr(e.response?.data?.personal_amount?.[0] ?? 'Failed to update amount.');
    },
  });

  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={[mStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={mStyles.handle} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>Correct Your Amount</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 20 }}>
            Current: ₦{Number(member.personal_amount).toLocaleString()}/period
            {member.flag_reason ? `\nCollector's note: ${member.flag_reason}` : ''}
          </Text>
          <Text style={[mStyles.label, { color: colors.textSecondary }]}>New contribution amount (₦)</Text>
          <TextInput
            value={amount}
            onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, '')); setErr(''); }}
            keyboardType="decimal-pad"
            placeholder="e.g. 1000"
            style={[mStyles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholderTextColor={colors.textTertiary}
          />
          {err ? <Text style={{ color: colors.error, fontSize: FontSize.xs, marginTop: 6 }}>{err}</Text> : null}
          <TouchableOpacity
            onPress={() => {
              if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) { setErr('Enter a valid amount.'); return; }
              mutation.mutate();
            }}
            disabled={mutation.isPending}
            style={[mStyles.btn, { backgroundColor: colors.primary, marginTop: 20 }]}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.sm }}>
              {mutation.isPending ? 'Submitting…' : 'Submit Correction'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[mStyles.btn, { backgroundColor: colors.background, marginTop: 8 }]}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ThriftGroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [markTarget,  setMarkTarget]  = useState<ThriftMember | null>(null);
  const [flagTarget,  setFlagTarget]  = useState<ThriftMember | null>(null);
  const [correctOpen, setCorrectOpen] = useState(false);

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['thrift-group', groupId],
    queryFn: () => thriftService.getGroup(groupId),
  });

  const isCollector = group?.collector.id === user?.id;

  const { data: members, isLoading: membersLoading, refetch: refetchMembers, isRefetching } = useQuery({
    queryKey: ['thrift-members', groupId],
    queryFn: () => thriftService.getMembers(groupId),
    enabled: !!group,
  });

  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['thrift-payments', groupId],
    queryFn: () => thriftService.getPayments(groupId),
    enabled: !!group,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ memberId, action }: { memberId: number; action: 'approve' | 'reject' }) =>
      thriftService.reviewMember(groupId, memberId, { action }),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-groups'] });
    },
    onError: () => feedback('error'),
  });

  const unmarkMutation = useMutation({
    mutationFn: (paymentId: number) => thriftService.unmarkPayment(groupId, paymentId),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
      queryClient.invalidateQueries({ queryKey: ['thrift-members', groupId] });
    },
    onError: () => feedback('error'),
  });

  const shareInvite = async () => {
    if (!group) return;
    await Share.share({ message: `Join my thrift group "${group.name}" on Ajo!\nInvite code: ${group.invite_code}` });
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: onConfirm },
    ]);
  };

  if (groupLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></TouchableOpacity>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ padding: 24 }}>
          <Skeleton width="60%" height={24} radius={6} style={{ marginBottom: 12 }} />
          <Skeleton width="40%" height={16} radius={4} style={{ marginBottom: 24 }} />
          <Skeleton width="100%" height={80} radius={12} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} radius={12} />
        </View>
      </View>
    );
  }

  if (!group) return null;

  // Own membership (for payer view)
  const ownMember = members?.find((m) => m.user.id === user?.id);

  // Pending members (for collector)
  const pendingMembers  = members?.filter((m) => m.status === 'pending' || m.status === 'amount_pending') ?? [];
  const approvedMembers = members?.filter((m) => m.status === 'approved') ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.textPrimary, flex: 1, marginHorizontal: 12 }} numberOfLines={1}>
          {group.name}
        </Text>
        {isCollector && (
          <TouchableOpacity onPress={shareInvite} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchMembers(); refetchPayments(); }} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Group info card */}
        <View style={[s.infoCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={[s.iconBadge, { backgroundColor: colors.successLight }]}>
              <Ionicons name="wallet" size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>{group.name}</Text>
              {!!group.description && <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>{group.description}</Text>}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <View style={s.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>{FREQ_LABEL[group.frequency]}</Text>
            </View>
            <View style={s.metaRow}>
              <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4 }}>{group.member_count} payers</Text>
            </View>
            {isCollector && (
              <View style={s.metaRow}>
                <Ionicons name="key-outline" size={14} color={colors.textSecondary} />
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 4, fontFamily: 'monospace' }}>{group.invite_code}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── COLLECTOR VIEW ── */}
        {isCollector ? (
          <>
            {/* Pending payers */}
            {pendingMembers.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Awaiting Approval ({pendingMembers.length})</Text>
                {pendingMembers.map((m) => (
                  <View key={m.id} style={[s.memberCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={[s.avatar, { backgroundColor: colors.primaryTint }]}>
                        <Text style={{ fontWeight: '800', color: colors.primary, fontSize: FontSize.sm }}>
                          {m.user.first_name?.[0]}{m.user.last_name?.[0]}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                          {m.user.first_name} {m.user.last_name}
                        </Text>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
                          ₦{Number(m.personal_amount).toLocaleString()} / period
                        </Text>
                      </View>
                      <Pill
                        label={STATUS_LABEL[m.status]}
                        bg={STATUS_COLOR(colors, m.status).bg}
                        color={STATUS_COLOR(colors, m.status).text}
                      />
                    </View>
                    {m.status === 'amount_pending' && m.flag_reason ? (
                      <Text style={{ fontSize: FontSize.xs, color: colors.warning, marginBottom: 10 }}>
                        Flagged: {m.flag_reason}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => reviewMutation.mutate({ memberId: m.id, action: 'approve' })}
                        style={[s.actionBtn, { backgroundColor: colors.successLight, flex: 1 }]}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.success} />
                        <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.success, marginLeft: 4 }}>Approve</Text>
                      </TouchableOpacity>
                      {m.status === 'pending' && (
                        <TouchableOpacity
                          onPress={() => setFlagTarget(m)}
                          style={[s.actionBtn, { backgroundColor: colors.warningLight, flex: 1 }]}
                        >
                          <Ionicons name="flag-outline" size={16} color={colors.warning} />
                          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.warning, marginLeft: 4 }}>Flag Amount</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => confirmAction('Reject payer?', `Reject ${m.user.first_name}'s request?`, () => reviewMutation.mutate({ memberId: m.id, action: 'reject' }))}
                        style={[s.actionBtn, { backgroundColor: colors.errorLight, flex: 1 }]}
                      >
                        <Ionicons name="close" size={16} color={colors.error} />
                        <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.error, marginLeft: 4 }}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Approved payers */}
            <Text style={[s.sectionTitle, { color: colors.textPrimary, marginTop: pendingMembers.length > 0 ? 8 : 0 }]}>
              Approved Payers ({approvedMembers.length})
            </Text>
            {membersLoading ? (
              <><Skeleton width="100%" height={80} radius={12} style={{ marginBottom: 10 }} /><Skeleton width="100%" height={80} radius={12} /></>
            ) : approvedMembers.length === 0 ? (
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
                No approved payers yet. Share the invite code to get started.
              </Text>
            ) : (
              approvedMembers.map((m) => {
                const memberPayments = payments?.filter((p) => p.member === m.id) ?? [];
                return (
                  <View key={m.id} style={[s.memberCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={[s.avatar, { backgroundColor: colors.successLight }]}>
                        <Text style={{ fontWeight: '800', color: colors.success, fontSize: FontSize.sm }}>
                          {m.user.first_name?.[0]}{m.user.last_name?.[0]}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                          {m.user.first_name} {m.user.last_name}
                        </Text>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
                          ₦{Number(m.personal_amount).toLocaleString()}/period · Total saved: ₦{Number(m.total_saved).toLocaleString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setMarkTarget(m)}
                        style={[s.markBtn, { backgroundColor: colors.success }]}
                      >
                        <Ionicons name="checkmark" size={14} color="#fff" />
                        <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#fff', marginLeft: 3 }}>Mark</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Recent payments */}
                    {memberPayments.slice(0, 3).map((p) => (
                      <View key={p.id} style={[s.paymentRow, { borderTopColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                          <Text style={{ fontSize: FontSize.xs, color: colors.textPrimary, marginLeft: 6, fontWeight: '600' }}>
                            {p.period_date}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: FontSize.xs, color: colors.success, fontWeight: '700' }}>
                            ₦{Number(p.amount).toLocaleString()}
                          </Text>
                          <TouchableOpacity onPress={() => confirmAction('Unmark payment?', `Remove payment for ${p.period_date}?`, () => unmarkMutation.mutate(p.id))}>
                            <Ionicons name="trash-outline" size={14} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    {memberPayments.length === 0 && (
                      <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, paddingTop: 8 }}>No payments marked yet.</Text>
                    )}
                  </View>
                );
              })
            )}
          </>
        ) : (
          /* ── PAYER VIEW ── */
          <>
            {/* Own status */}
            {ownMember && (
              <View style={[s.infoCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>My membership</Text>
                  <Pill
                    label={STATUS_LABEL[ownMember.status]}
                    bg={STATUS_COLOR(colors, ownMember.status).bg}
                    color={STATUS_COLOR(colors, ownMember.status).text}
                  />
                </View>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>
                  Contribution: ₦{Number(ownMember.personal_amount).toLocaleString()}/{FREQ_LABEL[group.frequency].toLowerCase()}
                </Text>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 4 }}>
                  Total saved: ₦{Number(ownMember.total_saved).toLocaleString()}
                </Text>

                {ownMember.status === 'amount_pending' && (
                  <View style={{ marginTop: 12 }}>
                    <View style={[s.alertBox, { backgroundColor: colors.warningLight }]}>
                      <Ionicons name="warning-outline" size={16} color={colors.warning} />
                      <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.warning, marginLeft: 8, lineHeight: 18 }}>
                        The collector flagged your amount.{ownMember.flag_reason ? ` Reason: ${ownMember.flag_reason}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setCorrectOpen(true)}
                      style={[s.actionBtn, { backgroundColor: colors.primary, marginTop: 10, justifyContent: 'center' }]}
                    >
                      <Ionicons name="create-outline" size={16} color="#fff" />
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#fff', marginLeft: 6 }}>Correct My Amount</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {ownMember.status === 'pending' && (
                  <View style={[s.alertBox, { backgroundColor: colors.primaryTint, marginTop: 12 }]}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.primary, marginLeft: 8, lineHeight: 18 }}>
                      Waiting for the collector to approve your membership.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Payment history */}
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>My Payment History</Text>
            {paymentsLoading ? (
              <><Skeleton width="100%" height={56} radius={10} style={{ marginBottom: 8 }} /><Skeleton width="100%" height={56} radius={10} /></>
            ) : (payments ?? []).length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="receipt-outline" size={48} color={colors.border} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                  No payments recorded yet. Once you pay and the collector marks it, it will appear here.
                </Text>
              </View>
            ) : (
              (payments ?? []).map((p) => (
                <View key={p.id} style={[s.paymentCard, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.iconBadge, { backgroundColor: colors.successLight, width: 36, height: 36 }]}>
                      <Ionicons name="checkmark" size={18} color={colors.success} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{p.period_date}</Text>
                      {p.notes ? <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{p.notes}</Text> : null}
                    </View>
                    <Text style={{ fontSize: FontSize.base, fontWeight: '800', color: colors.success }}>
                      ₦{Number(p.amount).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <MarkPaymentModal  visible={!!markTarget}  member={markTarget}  groupId={groupId} onClose={() => setMarkTarget(null)} />
      <FlagAmountModal   visible={!!flagTarget}  member={flagTarget}  groupId={groupId} onClose={() => setFlagTarget(null)} />
      <CorrectAmountModal visible={correctOpen}  member={ownMember ?? null} groupId={groupId} onClose={() => setCorrectOpen(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  infoCard: { borderRadius: Radius.lg, padding: 16, marginBottom: 20 },
  iconBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  memberCard: { borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md },
  markBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.md },
  paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8, marginTop: 8 },
  paymentCard: { borderRadius: Radius.md, padding: 14, marginBottom: 8 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: Radius.md },
});

const mStyles = StyleSheet.create({
  sheet: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 20 },
  label: { fontSize: FontSize.xs, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: 12, fontSize: FontSize.sm },
  btn: { padding: 14, borderRadius: Radius.md, alignItems: 'center' },
});
