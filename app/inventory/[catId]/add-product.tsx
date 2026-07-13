import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { FontSize, Radius } from '../../../src/theme';
import { getCategories, createProduct } from '../../../src/services/inventoryService';

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
  const [quantity, setQuantity] = useState('0');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      createProduct(catIdNum, {
        name: name.trim(),
        price,
        quantity: parseInt(quantity, 10) || 0,
        custom_fields: customFields,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not add product. Try again.'),
  });

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Required', 'Enter a product name.');
    if (!price || isNaN(parseFloat(price))) return Alert.alert('Required', 'Enter a valid price.');
    mutate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginLeft: 16, flex: 1 }}>
          Add Product
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[s.saveBtn, { backgroundColor: '#E65100' }]}
        >
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.sm }}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {cat && (
          <View style={[s.catBadge, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="cube-outline" size={14} color="#E65100" />
            <Text style={{ fontSize: FontSize.xs, color: '#E65100', fontWeight: '600', marginLeft: 6 }}>{cat.name}</Text>
          </View>
        )}

        <Text style={[s.label, { color: colors.textSecondary }]}>Product Name *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. iPhone 15, Rice 50kg..."
          placeholderTextColor={colors.textTertiary}
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Price (₦) *</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Opening Stock</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            />
          </View>
        </View>

        {/* Custom fields */}
        {(cat?.custom_field_defs ?? []).length > 0 && (
          <>
            <Text style={[s.label, { color: colors.textSecondary, marginTop: 8 }]}>Custom Fields</Text>
            {cat!.custom_field_defs.map((def) => (
              <View key={def.name} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 6 }}>
                  {def.name}
                  <Text style={{ color: colors.textTertiary }}> ({def.type})</Text>
                </Text>
                <TextInput
                  value={customFields[def.name] ?? ''}
                  onChangeText={v => setCustomFields(prev => ({ ...prev, [def.name]: v }))}
                  keyboardType={def.type === 'number' ? 'numeric' : 'default'}
                  placeholder={def.type === 'date' ? 'YYYY-MM-DD' : ''}
                  placeholderTextColor={colors.textTertiary}
                  style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                />
              </View>
            ))}
          </>
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
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.md },
  body: { padding: 20, paddingBottom: 60 },
  label: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, marginBottom: 16,
  },
  catBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.md, marginBottom: 20,
  },
});
