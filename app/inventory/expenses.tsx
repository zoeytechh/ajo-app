import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator, Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getExpenses, createExpense, deleteExpense,
  EXPENSE_CATEGORIES, type InventoryExpense, type ExpenseCategory,
} from '../../src/services/inventoryService';

const INV = '#E65100';

const CAT_ICONS: Record<ExpenseCategory, string> = {
  rent: 'home-outline',
  transport: 'car-outline',
  supplies: 'cube-outline',
  salary: 'people-outline',
  utility: 'flash-outline',
  other: 'receipt-outline',
};

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: expenses, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-expenses'],
    queryFn: getExpenses,
  });

  const [modal, setModal]           = useState(false);
  const [category, setCategory]     = useState<ExpenseCategory>('other');
  const [description, setDescription] = useState('');
  const [amount, setAmount]         = useState('');
  const [spentAt, setSpentAt]       = useState(new Date().toISOString().slice(0, 10));

  const openAdd = () => {
    setCategory('other'); setDescription(''); setAmount('');
    setSpentAt(new Date().toISOString().slice(0, 10));
    setModal(true);
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => createExpense({
      category,
      description: description.trim(),
      amount: parseFloat(amount),
      spent_at: spentAt,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-expenses'] });
      setModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not save expense.'),
  });

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-expenses'] }),
    onError: () => Alert.alert('Error', 'Could not delete.'),
  });

  const handleSave = () => {
    if (!amount || isNaN(parseFloat(amount))) return Alert.alert('Required', 'Enter a valid amount.');
    if (!spentAt) return Alert.alert('Required', 'Enter the date.');
    save();
  };

  const confirmDelete = (e: InventoryExpense) => {
    Alert.alert('Delete Expense', `Remove ₦${Number(e.amount).toLocaleString()} expense?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del(e.id) },
    ]);
  };

  const totalThisMonth = (expenses ?? [])
    .filter(e => e.spent_at.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Expenses</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            This month: ₦{totalThisMonth.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={[s.addBtn, { backgroundColor: INV }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={INV} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={INV} />}
          showsVerticalScrollIndicator={false}
        >
          {(expenses ?? []).length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="receipt-outline" size={56} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 14 }}>No expenses yet</Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Track business expenses to see your true profit.
              </Text>
            </View>
          ) : (
            (expenses ?? []).map((e) => (
              <View key={e.id} style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                <View style={s.cardRow}>
                  <View style={[s.catIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name={CAT_ICONS[e.category] as any} size={20} color={INV} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{e.category_label}</Text>
                    {!!e.description && (
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{e.description}</Text>
                    )}
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{e.spent_at}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: colors.textPrimary }}>
                      ₦{Number(e.amount).toLocaleString()}
                    </Text>
                    <TouchableOpacity onPress={() => confirmDelete(e)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} style={{ marginTop: 6 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.error ?? '#D32F2F'} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add expense modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 }}>Log Expense</Text>

            <Text style={[s.label, { color: colors.textPrimary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={[s.catChip, {
                      backgroundColor: category === cat.value ? INV : colors.background,
                      borderColor: category === cat.value ? INV : colors.border,
                    }]}
                  >
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: category === cat.value ? '#fff' : colors.textPrimary }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[s.label, { color: colors.textPrimary }]}>Amount (₦) *</Text>
            <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]} />

            <Text style={[s.label, { color: colors.textPrimary }]}>Date *</Text>
            <TextInput value={spentAt} onChangeText={setSpentAt} placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]} />

            <Text style={[s.label, { color: colors.textPrimary }]}>Description</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="Optional detail" multiline
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary, minHeight: 60, textAlignVertical: 'top' }]} />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setModal(false)} style={[s.modalBtn, { backgroundColor: colors.background, flex: 1 }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={[s.modalBtn, { backgroundColor: INV, flex: 1 }]}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18, borderBottomWidth: 1,
  },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  catIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.sm, marginBottom: 8 },
  modalBtn: { paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
});
