import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getCategories, getProducts, deleteCategory,
  type InventoryCategory, type InventoryProduct,
} from '../../src/services/inventoryService';
import { getCategoryEmoji, formatStock, stockColor } from '../../src/utils/inventoryHelpers';

export default function CategoryDetailScreen() {
  const { catId } = useLocalSearchParams<{ catId: string }>();
  const catIdNum = Number(catId);
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: categories, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: getCategories,
  });
  const cat = categories?.find(c => c.id === catIdNum);
  const emoji = cat ? getCategoryEmoji(cat.name) : '📦';

  const { data: products, isLoading } = useQuery({
    queryKey: ['inventory-products', catIdNum],
    queryFn: () => getProducts(catIdNum),
    enabled: !!catIdNum,
  });

  const { mutate: delCat, isPending: deleting } = useMutation({
    mutationFn: () => deleteCategory(catIdNum),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not delete category.'),
  });

  const confirmDelete = () => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat?.name}" and all its products? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => delCat() },
      ],
    );
  };

  const totalValue = (products ?? []).reduce(
    (sum, p) => sum + parseFloat(p.price) * p.quantity,
    0,
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, marginLeft: 14 }}>{emoji}</Text>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginLeft: 10, flex: 1 }} numberOfLines={1}>
          {cat?.name ?? 'Category'}
        </Text>
        <TouchableOpacity
          onPress={confirmDelete}
          disabled={deleting}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          style={{ marginRight: 8 }}
        >
          {deleting
            ? <ActivityIndicator size="small" color={colors.error} />
            : <Ionicons name="trash-outline" size={22} color={colors.error} />
          }
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      {!isLoading && (products ?? []).length > 0 && (
        <View style={[s.summaryBar, { backgroundColor: '#FFF3E0' }]}>
          <View style={s.summaryItem}>
            <Text style={s.summaryVal}>{(products ?? []).length}</Text>
            <Text style={s.summaryLbl}>Products</Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: '#E65100' + '40' }]} />
          <View style={s.summaryItem}>
            <Text style={s.summaryVal}>₦{totalValue.toLocaleString()}</Text>
            <Text style={s.summaryLbl}>Stock Value</Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E65100" />}
      >
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#E65100" />
          </View>
        ) : (products ?? []).length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="cube-outline" size={56} color="#FFF3E0" />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
              No products yet
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              Tap the + button to add your first product in this category.
            </Text>
          </View>
        ) : (
          (products ?? []).map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => router.push(`/inventory/${catId}/${p.id}` as any)}
              style={[s.card, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}
              activeOpacity={0.82}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
                    ₦{parseFloat(p.price).toLocaleString()} per unit
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[s.qtyBadge, { backgroundColor: stockColor(p.quantity) + '18' }]}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: stockColor(p.quantity) }}>
                      {p.quantity}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: stockColor(p.quantity), marginTop: 2, fontWeight: '600' }}>
                    {p.quantity === 0 ? 'Out of stock' : p.quantity < 5 ? 'Low stock' : 'In stock'}
                  </Text>
                </View>
              </View>
              {Object.keys(p.custom_fields).length > 0 && (
                <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(p.custom_fields).map(([k, v]) => (
                    <View key={k} style={[s.cfChip, { backgroundColor: colors.background }]}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                        <Text style={{ fontWeight: '600' }}>{k}:</Text> {String(v)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push(`/inventory/${catId}/add-product` as any)}
        style={[s.fab, { backgroundColor: '#E65100' }]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: FontSize.md, fontWeight: '800', color: '#E65100' },
  summaryLbl: { fontSize: FontSize.xs, color: '#BF360C', marginTop: 2 },
  summaryDivider: { width: 1, marginVertical: 4 },
  body: { padding: 20 },
  card: { borderRadius: Radius.lg, padding: 16, marginBottom: 12 },
  qtyBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.md },
  cfChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  fab: {
    position: 'absolute', bottom: 92, right: 24,
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E65100', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
