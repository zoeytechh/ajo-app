import React, { useState, useMemo } from 'react';
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
  getUserExpenseCategories, saveUserExpenseCategory, deleteUserExpenseCategory,
  PRESET_EXPENSE_CATEGORIES,
  type InventoryExpense, type UserExpenseCategory,
} from '../../src/services/inventoryService';

const INV = '#E65100';
const MAX_CAT_CHARS = 20;

const PRESET_META: Record<string, { icon: string; color: string; bg: string }> = {
  rent:      { icon: 'home',            color: '#1565C0', bg: '#E3F2FD' },
  transport: { icon: 'car',             color: '#6A1B9A', bg: '#F3E5F5' },
  supplies:  { icon: 'cube',            color: '#E65100', bg: '#FFF3E0' },
  salary:    { icon: 'people',          color: '#2E7D32', bg: '#E8F5E9' },
  utility:   { icon: 'flash',           color: '#F57F17', bg: '#FFFDE7' },
  other:     { icon: 'receipt-outline', color: '#546E7A', bg: '#ECEFF1' },
};
const CUSTOM_META = { icon: 'pricetag-outline' as const, color: '#00838F', bg: '#E0F7FA' };
const getCatMeta = (cat: string) => PRESET_META[cat] ?? CUSTOM_META;

type Period = 'all' | 'week' | 'month';

function formatDate(iso: string): string {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: expenses, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-expenses'],
    queryFn: getExpenses,
  });

  const { data: userCats = [] } = useQuery({
    queryKey: ['inventory-expense-categories'],
    queryFn: getUserExpenseCategories,
  });

  // ── Form state ─────────────────────────────────────────────────────────────
  const [period, setPeriod]           = useState<Period>('month');
  const [modal, setModal]             = useState(false);
  const [category, setCategory]       = useState('other');
  const [otherName, setOtherName]     = useState('');   // name typed when Other is selected
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [dateMode, setDateMode]       = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate]   = useState('');

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const spentAt   = dateMode === 'today' ? today : dateMode === 'yesterday' ? yesterday : customDate;

  const isOther = category === 'other';
  // The actual category string sent to the backend
  const effectiveCat = isOther && otherName.trim() ? otherName.trim() : category;

  const openAdd = () => {
    setCategory('other'); setOtherName(''); setDescription(''); setAmount('');
    setDateMode('today'); setCustomDate('');
    setModal(true);
  };

  // ── Save expense ────────────────────────────────────────────────────────────
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => createExpense({
      category: effectiveCat,
      description: description.trim(),
      amount: parseFloat(amount),
      spent_at: spentAt,
    }),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['inventory-expenses'] });
      qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      setModal(false);

      // If they typed a custom name under "Other" and it's not already saved, prompt
      const customName = otherName.trim();
      const alreadySaved = userCats.some(c => c.name.toLowerCase() === customName.toLowerCase());
      if (customName && !alreadySaved) {
        Alert.alert(
          'Save as regular category?',
          `Add "${customName}" to your category list so you can quickly pick it next time?`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Yes, add it', onPress: () => addCat(customName) },
          ],
        );
      }
    },
    onError: () => Alert.alert('Error', 'Could not save expense.'),
  });

  // ── Add custom category ─────────────────────────────────────────────────────
  const { mutate: addCat } = useMutation({
    mutationFn: (name: string) => saveUserExpenseCategory(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-expense-categories'] }),
  });

  // ── Delete expense ──────────────────────────────────────────────────────────
  const { mutate: del } = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-expenses'] });
      qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    },
    onError: () => Alert.alert('Error', 'Could not delete.'),
  });

  // ── Delete user category ────────────────────────────────────────────────────
  const { mutate: delCat } = useMutation({
    mutationFn: (id: number) => deleteUserExpenseCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-expense-categories'] }),
  });

  const handleSave = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return Alert.alert('Required', 'Enter a valid amount.');
    if (!spentAt) return Alert.alert('Required', 'Pick a date.');
    save();
  };

  const confirmDelete = (e: InventoryExpense) => {
    Alert.alert('Delete Expense', `Remove ₦${Number(e.amount).toLocaleString()} — ${e.category_label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del(e.id) },
    ]);
  };

  const confirmDeleteCat = (c: UserExpenseCategory) => {
    Alert.alert('Remove category?', `Remove "${c.name}" from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => delCat(c.id) },
    ]);
  };

  // ── Filtered + grouped list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const all = expenses ?? [];
    if (period === 'all') return all;
    const thisMonth = today.slice(0, 7);
    const weekAgo   = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    if (period === 'month') return all.filter(e => e.spent_at.startsWith(thisMonth));
    return all.filter(e => e.spent_at >= weekAgo);
  }, [expenses, period, today]);

  const total = filtered.reduce((s, e) => s + parseFloat(e.amount), 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filtered) map[e.category] = (map[e.category] ?? 0) + parseFloat(e.amount);
    return Object.entries(map).sort((a, b) => b[1] - a[1]) as [string, number][];
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, InventoryExpense[]>();
    for (const e of filtered) {
      if (!map.has(e.spent_at)) map.set(e.spent_at, []);
      map.get(e.spent_at)!.push(e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Expenses</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={[s.addBtn, { backgroundColor: INV }]}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.xs, marginLeft: 4 }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Period tabs ── */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['month', 'week', 'all'] as Period[]).map((p) => {
          const label = p === 'month' ? 'This Month' : p === 'week' ? 'This Week' : 'All Time';
          return (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)}
              style={[s.tab, period === p && { borderBottomColor: INV, borderBottomWidth: 2 }]}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: period === p ? '700' : '400',
                color: period === p ? INV : colors.textSecondary }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={INV} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={INV} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Total banner ── */}
          <View style={[s.totalBanner, { backgroundColor: '#FFF3E0' }]}>
            <View>
              <Text style={{ fontSize: FontSize.xs, color: '#BF360C', fontWeight: '600', textTransform: 'uppercase' }}>
                {period === 'month' ? 'Total This Month' : period === 'week' ? 'Total This Week' : 'All-time Total'}
              </Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#E65100', marginTop: 4 }}>
                ₦{total.toLocaleString()}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FontSize.xs, color: '#BF360C', fontWeight: '600', textTransform: 'uppercase' }}>Entries</Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#E65100', marginTop: 4 }}>{filtered.length}</Text>
            </View>
          </View>

          {/* ── Category breakdown ── */}
          {byCategory.length > 0 && (
            <View style={[s.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textSecondary,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Breakdown by Category
              </Text>
              {byCategory.map(([cat, amt]) => {
                const meta = getCatMeta(cat);
                const pct  = total > 0 ? Math.round((amt / total) * 100) : 0;
                const label = PRESET_EXPENSE_CATEGORIES.find(c => c.value === cat)?.label
                  ?? userCats.find(c => c.name === cat)?.name
                  ?? cat;
                return (
                  <View key={cat} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={[s.miniIcon, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon as any} size={13} color={meta.color} />
                      </View>
                      <Text style={{ flex: 1, fontSize: FontSize.sm, fontWeight: '600',
                        color: colors.textPrimary, marginLeft: 8 }}>
                        {label}
                      </Text>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: colors.textPrimary }}>
                        ₦{amt.toLocaleString()}
                      </Text>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, width: 36, textAlign: 'right' }}>
                        {pct}%
                      </Text>
                    </View>
                    <View style={{ height: 5, backgroundColor: colors.border, borderRadius: 3, marginLeft: 29 }}>
                      <View style={{ height: 5, width: `${pct}%`, backgroundColor: meta.color,
                        borderRadius: 3, opacity: 0.75 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Empty state ── */}
          {grouped.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="receipt-outline" size={56} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 14 }}>
                No expenses yet
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Tap "Add" to record rent, transport, supplies and more.
              </Text>
            </View>
          )}

          {/* ── Expense list grouped by date ── */}
          {grouped.map(([date, items]) => {
            const dayTotal = items.reduce((s, e) => s + parseFloat(e.amount), 0);
            return (
              <View key={date}>
                <View style={s.dateRow}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textSecondary,
                    textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {formatDate(date)}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border, marginHorizontal: 10 }} />
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#C62828' }}>
                    ₦{dayTotal.toLocaleString()}
                  </Text>
                </View>

                {items.map((e) => {
                  const meta = getCatMeta(e.category);
                  return (
                    <TouchableOpacity
                      key={e.id}
                      onLongPress={() => confirmDelete(e)}
                      activeOpacity={0.85}
                      style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <View style={[s.rowIcon, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                          {e.category_label}
                        </Text>
                        {!!e.description && (
                          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                            {e.description}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: '#C62828' }}>
                          ₦{Number(e.amount).toLocaleString()}
                        </Text>
                        <TouchableOpacity
                          onPress={() => confirmDelete(e)}
                          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          style={{ marginTop: 6 }}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}

          {/* ── My categories (custom only) ── */}
          {userCats.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textSecondary,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                My Categories
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {userCats.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onLongPress={() => confirmDeleteCat(c)}
                    style={[s.userCatChip, { backgroundColor: CUSTOM_META.bg, borderColor: CUSTOM_META.color + '44' }]}
                  >
                    <Ionicons name="pricetag-outline" size={12} color={CUSTOM_META.color} />
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: CUSTOM_META.color, marginLeft: 5 }}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 6 }}>
                Long-press a category to remove it
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Add Expense Modal ── */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.modalOverlay}>
          <ScrollView
            style={[s.modalBox, { backgroundColor: colors.surface }]}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>
              Log Expense
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 20 }}>
              Record money spent on your business
            </Text>

            {/* ── Category grid ── */}
            <Text style={[s.label, { color: colors.textSecondary }]}>What did you spend on?</Text>
            <View style={s.catGrid}>
              {/* 6 preset tiles */}
              {PRESET_EXPENSE_CATEGORIES.map((cat) => {
                const meta = getCatMeta(cat.value);
                const sel  = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => { setCategory(cat.value); setOtherName(''); }}
                    style={[s.catTile, {
                      backgroundColor: sel ? meta.color : colors.background,
                      borderColor: sel ? meta.color : colors.border,
                    }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={meta.icon as any} size={22} color={sel ? '#fff' : meta.color} />
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '700', marginTop: 6, textAlign: 'center',
                      color: sel ? '#fff' : colors.textPrimary }} numberOfLines={2}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* User's saved custom categories */}
              {userCats.map((c) => {
                const sel = category === c.name;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => { setCategory(c.name); setOtherName(''); }}
                    style={[s.catTile, {
                      backgroundColor: sel ? CUSTOM_META.color : colors.background,
                      borderColor: sel ? CUSTOM_META.color : colors.border,
                    }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pricetag-outline" size={22} color={sel ? '#fff' : CUSTOM_META.color} />
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '700', marginTop: 6, textAlign: 'center',
                      color: sel ? '#fff' : colors.textPrimary }} numberOfLines={2}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── "Other" name input — only shown when Other is selected ── */}
            {isOther && (
              <View style={{ marginTop: 10, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[s.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                    What is this expense? (optional)
                  </Text>
                  <Text style={{ fontSize: 11, color: otherName.length >= MAX_CAT_CHARS ? '#C62828' : colors.textTertiary }}>
                    {otherName.length}/{MAX_CAT_CHARS}
                  </Text>
                </View>
                <TextInput
                  value={otherName}
                  onChangeText={(t) => setOtherName(t.slice(0, MAX_CAT_CHARS))}
                  placeholder="e.g. Generator Fuel, School Fees"
                  placeholderTextColor={colors.textTertiary}
                  style={[s.input, { backgroundColor: colors.background, borderColor: colors.border,
                    color: colors.textPrimary }]}
                  autoCapitalize="words"
                />
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                  If you name it, we'll ask if you want to save it as a regular category.
                </Text>
              </View>
            )}

            {/* ── Amount ── */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: 16 }]}>How much did you spend? (₦)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 5000"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            />

            {/* ── Date ── */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>When did you spend it?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {(['today', 'yesterday', 'custom'] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDateMode(d)}
                  style={[s.dateChip, {
                    backgroundColor: dateMode === d ? INV : colors.background,
                    borderColor: dateMode === d ? INV : colors.border,
                    flex: 1,
                  }]}
                >
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', textAlign: 'center',
                    color: dateMode === d ? '#fff' : colors.textPrimary }}>
                    {d === 'today' ? 'Today' : d === 'yesterday' ? 'Yesterday' : 'Other date'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {dateMode === 'custom' && (
              <TextInput
                value={customDate}
                onChangeText={setCustomDate}
                placeholder="YYYY-MM-DD  e.g. 2026-07-20"
                placeholderTextColor={colors.textTertiary}
                style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              />
            )}

            {/* ── Description ── */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Any note? (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Paid PHCN electricity bill"
              multiline
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border,
                color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' }]}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setModal(false)}
                style={[s.modalBtn, { backgroundColor: colors.background, borderWidth: 1.5,
                  borderColor: colors.border, flex: 1 }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving}
                style={[s.modalBtn, { backgroundColor: INV, flex: 2, opacity: saving ? 0.6 : 1 }]}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm }}>Save Expense</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1 },
  tab: { marginRight: 20, paddingVertical: 12 },
  totalBanner: {
    borderRadius: Radius.xl ?? Radius.lg, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  breakdownCard: { borderRadius: Radius.lg, padding: 16, borderWidth: 1, marginBottom: 16 },
  miniIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.lg, borderWidth: 1, marginBottom: 8,
  },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  userCatChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  label: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: FontSize.md, marginBottom: 8,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catTile: {
    width: '30%', paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: Radius.lg, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  dateChip: { paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center' },
  modalBtn: { paddingVertical: 15, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
