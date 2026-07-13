import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { FontSize, Radius } from '../../../src/theme';
import { getCategories, createProduct } from '../../../src/services/inventoryService';
import { getCategoryEmoji } from '../../../src/utils/inventoryHelpers';

export default function AddProductScreen() {
  const { catId } = useLocalSearchParams<{ catId: string }>();
  const catIdNum = Number(catId);
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: getCategories,
  });
  const cat = categories?.find(c => c.id === catIdNum);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      createProduct(catIdNum, {
        name: name.trim(),
        price,
        quantity: parseInt(quantity, 10) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not save product. Please try again.'),
  });

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Missing info', 'What is the name of this product?');
    if (!price || isNaN(parseFloat(price))) return Alert.alert('Missing info', 'Enter the selling price.');
    mutate();
  };

  const emoji = cat ? getCategoryEmoji(cat.name) : '📦';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginLeft: 14, flex: 1 }}>
          Add a Product
        </Text>
      </View>

      <View style={s.body}>
        {/* Category badge */}
        {cat && (
          <View style={[s.catBadge, { backgroundColor: '#FFF3E0' }]}>
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
            <Text style={{ fontSize: FontSize.sm, color: '#E65100', fontWeight: '600', marginLeft: 8 }}>{cat.name}</Text>
          </View>
        )}

        {/* Product name */}
        <Text style={[s.label, { color: colors.textSecondary }]}>What is this product called?</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Indomie noodles, Blue T-shirt, iPhone 15..."
          placeholderTextColor={colors.textTertiary}
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          autoFocus
        />

        {/* Price */}
        <Text style={[s.label, { color: colors.textSecondary }]}>How much do you sell it for? (₦)</Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, marginRight: 6 }}>₦</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.md, color: colors.textPrimary }}
          />
        </View>

        {/* Quantity */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>How many do you have right now?</Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: 10 }}>
          You can leave this at 0 and add stock later.
        </Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.md, color: colors.textPrimary }}
          />
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>pieces / units</Text>
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[s.saveBtn, { backgroundColor: '#E65100', marginTop: 28 }]}
          activeOpacity={0.85}
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Save Product</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  body: { padding: 24 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.md, marginBottom: 24,
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: FontSize.sm, marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 20,
  },
  saveBtn: {
    paddingVertical: 16, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
});
