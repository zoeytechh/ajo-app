import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import {
  getProducts, getMovements, deleteProduct, updateProduct,
  type InventoryMovement,
} from '../../../src/services/inventoryService';
import { formatStock, stockColor } from '../../../src/utils/inventoryHelpers';

const MOVE_DISPLAY: Record<string, { label: string; color: string; icon: string }> = {
  in:         { label: 'Received goods',  color: '#2E7D32', icon: 'arrow-down-circle-outline' },
  out:        { label: 'Sold',            color: '#C62828', icon: 'cash-outline' },
  adjustment: { label: 'Count corrected', color: '#1565C0', icon: 'checkmark-circle-outline' },
};

export default function ProductDetailScreen() {
  const { catId, productId } = useLocalSearchParams<{ catId: string; productId: string }>();
  const catIdNum   = Number(catId);
  const prodIdNum  = Number(productId);
  const { colors } = useTheme();
  const router     = useRouter();
  const qc         = useQueryClient();

  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName]   = useState('');
  const [editPrice, setEditPrice] = useState('');

  const { data: products } = useQuery({
    queryKey: ['inventory-products', catIdNum],
    queryFn: () => getProducts(catIdNum),
    enabled: !!catIdNum,
  });
  const product = products?.find(p => p.id === prodIdNum);

  const { data: movements, isLoading: movLoading } = useQuery({
    queryKey: ['inventory-movements', prodIdNum],
    queryFn: () => getMovements(prodIdNum),
    enabled: !!prodIdNum,
  });

  const { mutate: delProduct, isPending: deleting } = useMutation({
    mutationFn: () => deleteProduct(prodIdNum),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not delete this product.'),
  });

  const { mutate: saveEdit, isPending: saving } = useMutation({
    mutationFn: () => updateProduct(prodIdNum, {
      name: editName.trim(),
      price: editPrice.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      setEditModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not update product.'),
  });

  const openEdit = () => {
    setEditName(product?.name ?? '');
    setEditPrice(product?.price ?? '');
    setEditModal(true);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Remove this product?',
      `"${product?.name}" and all its history will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => delProduct() },
      ],
    );
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  };

  const stockValue = product ? parseFloat(product.price) * product.quantity : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginLeft: 16, flex: 1 }} numberOfLines={1}>
          {product?.name ?? 'Product'}
        </Text>
        <TouchableOpacity onPress={openEdit} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} style={{ marginRight: 14 }}>
          <Ionicons name="pencil-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete} disabled={deleting} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          {deleting
            ? <ActivityIndicator size="small" color={colors.error} />
            : <Ionicons name="trash-outline" size={22} color={colors.error} />
          }
        </TouchableOpacity>
      </View>

      {/* Edit modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setEditModal(false)} />
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Edit Product</Text>
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Product name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="e.g. Indomie (70g)"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Selling price (₦)</Text>
            <TextInput
              value={editPrice}
              onChangeText={setEditPrice}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="e.g. 150"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              onPress={() => saveEdit()}
              disabled={saving || !editName.trim() || !editPrice.trim()}
              style={[s.modalSaveBtn, { backgroundColor: '#E65100', opacity: (saving || !editName.trim() || !editPrice.trim()) ? 0.5 : 1 }]}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.md }}>Save changes</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
        {/* Stock info card */}
        {product && (
          <View style={[s.infoCard, { backgroundColor: '#FFF3E0' }]}>
            {/* Product image */}
            {product.image_url && (
              <Image source={{ uri: product.image_url }} style={s.productImg} />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: FontSize.xs, color: '#BF360C', fontWeight: '600' }}>SELLING PRICE</Text>
                {parseFloat(product.discount_percent) > 0 ? (
                  <>
                    <Text style={{ fontSize: FontSize.sm, color: '#BF360C', textDecorationLine: 'line-through', marginTop: 4 }}>
                      ₦{parseFloat(product.price).toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#E65100' }}>
                      ₦{parseFloat(product.effective_price).toLocaleString()}
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '600' }}> ({product.discount_percent}% off)</Text>
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#E65100', marginTop: 4 }}>
                    ₦{parseFloat(product.price).toLocaleString()}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: FontSize.xs, color: '#BF360C', fontWeight: '600' }}>STOCK</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: stockColor(product.quantity), marginTop: 4 }}>
                  {product.quantity}
                </Text>
              </View>
            </View>
            <View style={[s.statusBar, { backgroundColor: '#FFCCBC' }]}>
              <Ionicons
                name={product.quantity === 0 ? 'alert-circle' : product.quantity < 5 ? 'warning' : 'checkmark-circle'}
                size={14}
                color={stockColor(product.quantity)}
              />
              <Text style={{ fontSize: FontSize.xs, color: stockColor(product.quantity), marginLeft: 6, fontWeight: '600' }}>
                {formatStock(product.quantity)}
              </Text>
              <Text style={{ marginLeft: 'auto', fontSize: FontSize.xs, color: '#BF360C' }}>
                Stock value: ₦{stockValue.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Action buttons — plain English */}
        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>What do you want to record?</Text>
        <View style={s.actionGrid}>
          <TouchableOpacity
            onPress={() => router.push(`/inventory/${catId}/${productId}/move?type=in` as any)}
            style={[s.actionCard, { backgroundColor: '#E8F5E9' }]}
            activeOpacity={0.82}
          >
            <Ionicons name="arrow-down-circle" size={32} color="#2E7D32" />
            <Text style={[s.actionTitle, { color: '#2E7D32' }]}>I bought goods</Text>
            <Text style={[s.actionSub, { color: '#388E3C' }]}>Received new stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/inventory/${catId}/${productId}/move?type=out` as any)}
            style={[s.actionCard, { backgroundColor: '#FFEBEE' }]}
            activeOpacity={0.82}
          >
            <Ionicons name="cash-outline" size={32} color="#C62828" />
            <Text style={[s.actionTitle, { color: '#C62828' }]}>I made a sale</Text>
            <Text style={[s.actionSub, { color: '#E53935' }]}>Remove sold items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/inventory/${catId}/${productId}/move?type=adjustment` as any)}
            style={[s.actionCard, { backgroundColor: '#E3F2FD', width: '100%' }]}
            activeOpacity={0.82}
          >
            <Ionicons name="checkmark-circle-outline" size={28} color="#1565C0" />
            <Text style={[s.actionTitle, { color: '#1565C0' }]}>Fix / correct my count</Text>
            <Text style={[s.actionSub, { color: '#1976D2' }]}>Count your goods and update the record</Text>
          </TouchableOpacity>
        </View>

        {/* History */}
        <Text style={[s.sectionTitle, { color: colors.textSecondary, marginTop: 8 }]}>
          Recent history
        </Text>

        {movLoading ? (
          <ActivityIndicator color="#E65100" style={{ marginTop: 16 }} />
        ) : (movements ?? []).length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' }}>
              No records yet. Use the buttons above to start tracking this product.
            </Text>
          </View>
        ) : (
          (movements ?? []).map((m: InventoryMovement) => {
            const meta = MOVE_DISPLAY[m.movement_type] ?? MOVE_DISPLAY.in;
            return (
              <View key={m.id} style={[s.moveRow, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                <View style={[s.moveIcon, { backgroundColor: meta.color + '15' }]}>
                  <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{meta.label}</Text>
                  {!!m.note && (
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>
                      {m.note}
                    </Text>
                  )}
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 3 }}>{fmt(m.recorded_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: meta.color }}>
                    {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>
                    bal: {m.balance_after}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  body: { padding: 20 },
  infoCard: { borderRadius: Radius.xl ?? Radius.lg, padding: 20, marginBottom: 24, overflow: 'hidden' },
  productImg: { width: '100%', height: 160, borderRadius: 8, marginBottom: 14, resizeMode: 'cover' },
  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, padding: 10, borderRadius: Radius.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
  },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionCard: {
    width: '48%', padding: 16, borderRadius: Radius.lg,
    alignItems: 'center', gap: 6,
  },
  actionTitle: { fontSize: FontSize.sm, fontWeight: '800', textAlign: 'center' },
  actionSub: { fontSize: FontSize.xs, textAlign: 'center' },
  moveRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.lg, marginBottom: 10 },
  moveIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 20 },
  modalLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.md,
  },
  modalSaveBtn: {
    marginTop: 24, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center',
  },
});
