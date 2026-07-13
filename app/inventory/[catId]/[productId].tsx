import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import {
  getProducts, getMovements, deleteProduct,
  type InventoryMovement,
} from '../../../src/services/inventoryService';

const MOVE_META: Record<string, { label: string; color: string; icon: string }> = {
  in:         { label: 'Stock In',    color: '#2E7D32', icon: 'arrow-down-circle-outline' },
  out:        { label: 'Sale / Out',  color: '#C62828', icon: 'arrow-up-circle-outline' },
  adjustment: { label: 'Adjustment', color: '#1565C0', icon: 'swap-vertical-outline' },
};

export default function ProductDetailScreen() {
  const { catId, productId } = useLocalSearchParams<{ catId: string; productId: string }>();
  const catIdNum   = Number(catId);
  const prodIdNum  = Number(productId);
  const { colors } = useTheme();
  const router     = useRouter();
  const qc         = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['inventory-products', catIdNum],
    queryFn: () => getProducts(catIdNum),
    enabled: !!catIdNum,
  });
  const product = products?.find(p => p.id === prodIdNum);

  const { data: movements, isLoading: movLoading, refetch } = useQuery({
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
    onError: () => Alert.alert('Error', 'Could not delete product.'),
  });

  const confirmDelete = () => {
    Alert.alert(
      'Delete Product',
      `Delete "${product?.name}"? All movement history will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => delProduct() },
      ],
    );
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  };

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
        <TouchableOpacity
          onPress={confirmDelete}
          disabled={deleting}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
        >
          {deleting
            ? <ActivityIndicator size="small" color={colors.error} />
            : <Ionicons name="trash-outline" size={22} color={colors.error} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        {/* Product info card */}
        {product && (
          <View style={[s.infoCard, { backgroundColor: '#FFF3E0' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ fontSize: FontSize.xs, color: '#BF360C' }}>Price per unit</Text>
                <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: '#E65100' }}>
                  ₦{parseFloat(product.price).toLocaleString()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: FontSize.xs, color: '#BF360C' }}>In stock</Text>
                <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: product.quantity > 0 ? '#2E7D32' : '#C62828' }}>
                  {product.quantity}
                </Text>
              </View>
            </View>
            {Object.keys(product.custom_fields).length > 0 && (
              <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(product.custom_fields).map(([k, v]) => (
                  <View key={k} style={[s.cfChip, { backgroundColor: '#FFCCBC' }]}>
                    <Text style={{ fontSize: 11, color: '#BF360C' }}>
                      <Text style={{ fontWeight: '700' }}>{k}:</Text> {String(v)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={s.actionRow}>
          {[
            { type: 'in',         label: 'Stock In',    color: '#2E7D32', bg: '#E8F5E9', icon: 'arrow-down-circle' },
            { type: 'out',        label: 'Record Sale', color: '#C62828', bg: '#FFEBEE', icon: 'arrow-up-circle' },
            { type: 'adjustment', label: 'Adjust',      color: '#1565C0', bg: '#E3F2FD', icon: 'swap-vertical' },
          ].map(btn => (
            <TouchableOpacity
              key={btn.type}
              onPress={() => router.push(`/inventory/${catId}/${productId}/move?type=${btn.type}` as any)}
              style={[s.actionBtn, { backgroundColor: btn.bg }]}
              activeOpacity={0.82}
            >
              <Ionicons name={btn.icon as any} size={22} color={btn.color} />
              <Text style={{ fontSize: FontSize.xs, color: btn.color, fontWeight: '700', marginTop: 4, textAlign: 'center' }}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Movement history */}
        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Movement History</Text>

        {movLoading ? (
          <ActivityIndicator color="#E65100" style={{ marginTop: 20 }} />
        ) : (movements ?? []).length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>No movements recorded yet.</Text>
          </View>
        ) : (
          (movements ?? []).map((m: InventoryMovement) => {
            const meta = MOVE_META[m.movement_type];
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
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>bal: {m.balance_after}</Text>
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
  infoCard: { borderRadius: Radius.lg, padding: 20, marginBottom: 16 },
  cfChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: Radius.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 12 },
  moveRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.lg, marginBottom: 10 },
  moveIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
