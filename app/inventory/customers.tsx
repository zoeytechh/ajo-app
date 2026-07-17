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
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  type InventoryCustomer,
} from '../../src/services/inventoryService';

const INV = '#E65100';

export default function CustomersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: customers, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-customers'],
    queryFn: getCustomers,
  });

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<InventoryCustomer | null>(null);
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const openAdd = () => {
    setEditing(null);
    setName(''); setPhone(''); setNotes('');
    setModal(true);
  };

  const openEdit = (c: InventoryCustomer) => {
    setEditing(c);
    setName(c.name); setPhone(c.phone); setNotes(c.notes);
    setModal(true);
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      editing
        ? updateCustomer(editing.id, { name: name.trim(), phone: phone.trim(), notes: notes.trim() })
        : createCustomer({ name: name.trim(), phone: phone.trim(), notes: notes.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-customers'] });
      setModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not save customer.'),
  });

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-customers'] }),
    onError: () => Alert.alert('Error', 'Could not delete customer.'),
  });

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Required', 'Customer name is required.');
    save();
  };

  const confirmDelete = (c: InventoryCustomer) => {
    Alert.alert('Delete Customer', `Remove "${c.name}" from your database?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del(c.id) },
    ]);
  };

  const filtered = (customers ?? []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Customers</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{(customers ?? []).length} contacts</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={[s.addBtn, { backgroundColor: INV }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface }}>
        <View style={[s.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or phone…"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.sm, color: colors.textPrimary }}
          />
        </View>
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
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="people-outline" size={56} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 14 }}>
                {search ? 'No results' : 'No customers yet'}
              </Text>
              {!search && (
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                  Add customers to link them to sales and track purchase history.
                </Text>
              )}
            </View>
          ) : (
            filtered.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => openEdit(c)}
                activeOpacity={0.8}
                style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}
              >
                <View style={s.cardRow}>
                  <View style={[s.avatar, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: INV }}>
                      {c.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{c.name}</Text>
                    {!!c.phone && (
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{c.phone}</Text>
                    )}
                    {!!c.notes && (
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{c.notes}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => confirmDelete(c)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.error ?? '#D32F2F'} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 }}>
              {editing ? 'Edit Customer' : 'New Customer'}
            </Text>
            <Text style={[s.label, { color: colors.textPrimary }]}>Name *</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Customer name" placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]} />
            <Text style={[s.label, { color: colors.textPrimary }]}>Phone</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="+234…" keyboardType="phone-pad" placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]} />
            <Text style={[s.label, { color: colors.textPrimary }]}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Optional note" placeholderTextColor={colors.textTertiary} multiline
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' }]} />
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  card: { borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.sm, marginBottom: 8 },
  modalBtn: { paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
