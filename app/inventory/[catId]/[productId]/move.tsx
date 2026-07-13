import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/hooks/useTheme';
import { FontSize, Radius } from '../../../../src/theme';
import { getProducts, recordMovement, type MovementType } from '../../../../src/services/inventoryService';

const META: Record<MovementType, { label: string; color: string; bg: string; hint: string }> = {
  in:         { label: 'Stock In',    color: '#2E7D32', bg: '#E8F5E9', hint: 'How many units are you adding?' },
  out:        { label: 'Record Sale', color: '#C62828', bg: '#FFEBEE', hint: 'How many units were sold / removed?' },
  adjustment: { label: 'Adjust Stock', color: '#1565C0', bg: '#E3F2FD', hint: 'Set the absolute new quantity.' },
};

export default function MoveScreen() {
  const { catId, productId, type } = useLocalSearchParams<{ catId: string; productId: string; type: MovementType }>();
  const catIdNum  = Number(catId);
  const prodIdNum = Number(productId);
  const mvType: MovementType = (['in', 'out', 'adjustment'] as MovementType[]).includes(type as MovementType)
    ? (type as MovementType)
    : 'in';

  const { colors } = useTheme();
  const router     = useRouter();
  const qc         = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['inventory-products', catIdNum],
    queryFn: () => getProducts(catIdNum),
    enabled: !!catIdNum,
  });
  const product = products?.find(p => p.id === prodIdNum);

  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => recordMovement(prodIdNum, { movement_type: mvType, quantity: parseInt(quantity, 10), note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-movements', prodIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      router.back();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.quantity ?? 'Could not record movement. Try again.';
      Alert.alert('Error', msg);
    },
  });

  const handleSave = () => {
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty < 1) {
      Alert.alert('Required', 'Enter a valid quantity (minimum 1).');
      return;
    }
    mutate();
  };

  const meta = META[mvType];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: meta.color, marginLeft: 16, flex: 1 }}>
          {meta.label}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[s.saveBtn, { backgroundColor: meta.color }]}
        >
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.sm }}>Confirm</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {/* Product info */}
        {product && (
          <View style={[s.productCard, { backgroundColor: meta.bg }]}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: meta.color }}>{product.name}</Text>
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 6 }}>
              <Text style={{ fontSize: FontSize.xs, color: meta.color }}>
                Current stock: <Text style={{ fontWeight: '800' }}>{product.quantity}</Text>
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: meta.color }}>
                Price: <Text style={{ fontWeight: '800' }}>₦{parseFloat(product.price).toLocaleString()}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Quantity */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 20 }]}>
          {mvType === 'adjustment' ? 'New Total Quantity *' : 'Quantity *'}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: 8 }}>{meta.hint}</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          style={[s.input, s.bigInput, { backgroundColor: colors.surface, borderColor: meta.color + '60', color: meta.color }]}
          autoFocus
        />

        {/* Note */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 8 }]}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Received from supplier, sold to John..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          style={[s.input, s.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.md },
  body: { padding: 20 },
  productCard: { padding: 16, borderRadius: Radius.lg },
  label: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, marginBottom: 16,
  },
  bigInput: { fontSize: 32, fontWeight: '800', textAlign: 'center', paddingVertical: 20 },
  noteInput: { textAlignVertical: 'top', minHeight: 80 },
});
