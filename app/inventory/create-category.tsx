import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { createCategory, type CustomFieldDef } from '../../src/services/inventoryService';

type FieldType = 'text' | 'number' | 'date';

export default function CreateCategoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  const { mutate, isPending } = useMutation({
    mutationFn: () => createCategory({ name: name.trim(), custom_field_defs: fields }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not create category. Try again.'),
  });

  const addField = () => {
    const n = newFieldName.trim();
    if (!n) return;
    if (fields.some(f => f.name.toLowerCase() === n.toLowerCase())) {
      Alert.alert('Duplicate', 'A field with that name already exists.');
      return;
    }
    setFields(prev => [...prev, { name: n, type: newFieldType }]);
    setNewFieldName('');
    setNewFieldType('text');
  };

  const removeField = (idx: number) =>
    setFields(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter a category name.');
      return;
    }
    mutate();
  };

  const typeColors: Record<FieldType, string> = {
    text: colors.primary,
    number: colors.success,
    date: '#E65100',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginLeft: 16 }}>
          New Category
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[s.saveBtn, { backgroundColor: colors.primary }]}
        >
          {isPending
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Text style={{ color: colors.white, fontWeight: '700', fontSize: FontSize.sm }}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Category Name *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Electronics, Clothing, Food..."
          placeholderTextColor={colors.textTertiary}
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        />

        {/* Default fields note */}
        <View style={[s.infoBox, { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={{ fontSize: FontSize.xs, color: colors.primary, marginLeft: 8, flex: 1, lineHeight: 18 }}>
            Every product automatically has <Text style={{ fontWeight: '700' }}>Name</Text>, <Text style={{ fontWeight: '700' }}>Price</Text>, and <Text style={{ fontWeight: '700' }}>Quantity</Text>. Add extra fields below if needed.
          </Text>
        </View>

        {/* Custom fields */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 20 }]}>Custom Fields (optional)</Text>

        {fields.map((f, i) => (
          <View key={i} style={[s.fieldRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.typePill, { backgroundColor: typeColors[f.type] + '20' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: typeColors[f.type], textTransform: 'uppercase' }}>{f.type}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.textPrimary, marginLeft: 10 }}>{f.name}</Text>
            <TouchableOpacity onPress={() => removeField(i)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add new field */}
        <View style={[s.addFieldBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={newFieldName}
            onChangeText={setNewFieldName}
            placeholder="Field name (e.g. Brand, SKU, Expiry)"
            placeholderTextColor={colors.textTertiary}
            style={[s.addFieldInput, { color: colors.textPrimary, borderBottomColor: colors.border }]}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {(['text', 'number', 'date'] as FieldType[]).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setNewFieldType(t)}
                style={[
                  s.typeBtn,
                  {
                    backgroundColor: newFieldType === t ? typeColors[t] : colors.background,
                    borderColor: typeColors[t],
                  },
                ]}
              >
                <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: newFieldType === t ? colors.white : typeColors[t] }}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={addField}
              style={[s.addBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: FontSize.xs, fontWeight: '700', marginLeft: 4 }}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.md },
  body: { padding: 20, paddingBottom: 60 },
  label: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 12, borderRadius: Radius.md, borderWidth: 1,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: Radius.md, borderWidth: 1, marginBottom: 8,
  },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  addFieldBox: { padding: 16, borderRadius: Radius.md, borderWidth: 1, marginTop: 8 },
  addFieldInput: { fontSize: FontSize.sm, paddingVertical: 6, borderBottomWidth: 1 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.sm, marginLeft: 'auto',
  },
});
