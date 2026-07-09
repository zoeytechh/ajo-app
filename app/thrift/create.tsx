import React, { useState } from 'react';
import {
  View, Text, StatusBar, KeyboardAvoidingView,
  Platform, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { thriftService, type ThriftFrequency } from '../../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { Button, Input, LoadingOverlay, feedback } from '../../src/components';

const FREQUENCIES: { value: ThriftFrequency; label: string; desc: string }[] = [
  { value: 'daily',   label: 'Daily',   desc: 'Payers contribute every day' },
  { value: 'weekly',  label: 'Weekly',  desc: 'Payers contribute every week' },
  { value: 'monthly', label: 'Monthly', desc: 'Payers contribute every month' },
];

export default function CreateThriftRoute() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [frequency, setFrequency] = useState<ThriftFrequency>('daily');
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => thriftService.createGroup({ name: name.trim(), description: description.trim(), frequency }),
    onSuccess: (group) => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-groups'] });
      router.replace(`/thrift/${group.id}` as any);
    },
    onError: (err: any) => {
      feedback('error');
      const d = err.response?.data ?? {};
      setErrors({
        name: d.name?.[0] ?? '',
        general: d.detail ?? d.non_field_errors?.[0] ?? 'Something went wrong.',
      });
    },
  });

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Group name is required.';
    if (Object.keys(e).length) { setErrors(e); feedback('error'); return; }
    setErrors({});
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={mutation.isPending} message="Creating thrift group…" />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>New Thrift Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Input
          label="Group name"
          placeholder="e.g. Office Thrift 2025"
          value={name}
          onChangeText={(v) => { setName(v); setErrors((p) => ({ ...p, name: '' })); }}
          error={errors.name}
          leftIcon={<Ionicons name="wallet-outline" size={18} color={colors.primary} />}
        />

        <Input
          label="Description (optional)"
          placeholder="What is this thrift group for?"
          value={description}
          onChangeText={setDesc}
          multiline
          numberOfLines={3}
          style={{ marginTop: 16 }}
        />

        {/* Frequency picker */}
        <Text style={[s.label, { color: colors.textPrimary, marginTop: 24 }]}>Collection frequency</Text>
        {FREQUENCIES.map((f) => {
          const active = frequency === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFrequency(f.value)}
              activeOpacity={0.8}
              style={[
                s.freqRow,
                {
                  backgroundColor: active ? colors.primaryTint : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  ...Shadow.card(colors.black),
                },
              ]}
            >
              <View style={[s.freqDot, { backgroundColor: active ? colors.primary : colors.border }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? colors.primary : colors.textPrimary }}>
                  {f.label}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{f.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {errors.general ? (
          <Text style={{ color: colors.error, fontSize: FontSize.sm, marginTop: 12, textAlign: 'center' }}>{errors.general}</Text>
        ) : null}

        <Button label="Create Thrift Group" onPress={handleSubmit} loading={mutation.isPending} style={{ marginTop: 32 }} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  body: { paddingHorizontal: 24, paddingTop: 24 },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 10 },
  freqRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.md, borderWidth: 1.5, marginBottom: 10,
  },
  freqDot: { width: 18, height: 18, borderRadius: 9 },
});
