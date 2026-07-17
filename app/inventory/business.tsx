import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { getBusiness, saveBusiness, type InventoryBusiness } from '../../src/services/inventoryService';

const INV = '#E65100';

export default function BusinessProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: biz, isLoading } = useQuery({
    queryKey: ['inventory-business'],
    queryFn: getBusiness,
  });

  const [name, setName]       = useState('');
  const [type, setType]       = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone]     = useState('');

  useEffect(() => {
    if (biz) {
      setName(biz.name ?? '');
      setType(biz.business_type ?? '');
      setAddress(biz.address ?? '');
      setPhone(biz.phone ?? '');
    }
  }, [biz]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => saveBusiness({ name: name.trim(), business_type: type.trim(), address: address.trim(), phone: phone.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-business'] });
      Alert.alert('Saved', 'Business profile updated.');
    },
    onError: () => Alert.alert('Error', 'Could not save. Please try again.'),
  });

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter your business name.');
    mutate();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={INV} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Business Profile</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Appears on receipts and reports</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Field label="Business Name *" value={name} onChangeText={setName} placeholder="e.g. Mama Ngozi Provisions" colors={colors} />
        <Field label="Business Type" value={type} onChangeText={setType} placeholder="e.g. Retail Store, Pharmacy, Restaurant" colors={colors} />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="Shop address or location" colors={colors} multiline />
        <Field label="Business Phone" value={phone} onChangeText={setPhone} placeholder="+234…" keyboardType="phone-pad" colors={colors} />

        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          activeOpacity={0.85}
          style={[s.saveBtn, { backgroundColor: INV, opacity: isPending ? 0.6 : 1 }]}
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Save Profile</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, colors, multiline, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        style={[s.input, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          color: colors.textPrimary,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18, borderBottomWidth: 1,
  },
  input: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.md,
  },
  saveBtn: {
    paddingVertical: 16, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
});
