import { useState } from 'react';
import {
  View, Text, StatusBar, KeyboardAvoidingView,
  Platform, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { thriftService, type ThriftFrequency, type ThriftCycleType } from '../../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { Button, Input, LoadingOverlay, feedback } from '../../src/components';

const FREQUENCIES: { value: ThriftFrequency; label: string; desc: string }[] = [
  { value: 'daily',   label: 'Daily',   desc: 'Payers contribute every day' },
  { value: 'weekly',  label: 'Weekly',  desc: 'Payers contribute every week' },
  { value: 'monthly', label: 'Monthly', desc: 'Payers contribute every month' },
];

const CYCLE_TYPES: { value: ThriftCycleType; label: string; desc: string; icon: string }[] = [
  { value: 'rolling', label: 'Rolling / Open-ended', desc: 'No end date — runs continuously until you stop it', icon: 'infinite-outline' },
  { value: 'fixed',   label: 'Fixed Cycle',          desc: 'Set a start and end date; restart each new cycle',  icon: 'calendar-outline' },
];

export default function CreateThriftRoute() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [frequency, setFrequency] = useState<ThriftFrequency>('daily');
  const [cycleType, setCycleType] = useState<ThriftCycleType>('rolling');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => thriftService.createGroup({
      name: name.trim(),
      description: description.trim(),
      frequency,
      cycle_type: cycleType,
      start_date: cycleType === 'fixed' ? startDate || null : null,
      end_date:   cycleType === 'fixed' ? endDate   || null : null,
    }),
    onSuccess: (group) => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-groups'] });
      router.replace(`/thrift/${group.id}` as any);
    },
    onError: (err: any) => {
      feedback('error');
      const d = err.response?.data ?? {};
      setErrors({
        name:       d.name?.[0]       ?? '',
        start_date: d.start_date?.[0] ?? d.start_date ?? '',
        end_date:   d.end_date?.[0]   ?? d.end_date   ?? '',
        general:    d.detail ?? d.non_field_errors?.[0] ?? 'Something went wrong.',
      });
    },
  });

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Group name is required.';
    if (cycleType === 'fixed') {
      if (!startDate) e.start_date = 'Start date is required for fixed cycles.';
      if (!endDate)   e.end_date   = 'End date is required for fixed cycles.';
      if (startDate && endDate && endDate <= startDate)
        e.end_date = 'End date must be after start date.';
    }
    if (Object.keys(e).length) { setErrors(e); feedback('error'); return; }
    setErrors({});
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={mutation.isPending} message="Creating group…" />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>New Contribution Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Input
          label="Group name"
          placeholder="e.g. Market Women Thrift 2025"
          value={name}
          onChangeText={(v) => { setName(v); setErrors((p) => ({ ...p, name: '' })); }}
          error={errors.name}
          leftIcon={<Ionicons name="wallet-outline" size={18} color={colors.success} />}
        />

        <Input
          label="Description (optional)"
          placeholder="What is this group for?"
          value={description}
          onChangeText={setDesc}
          multiline
          numberOfLines={3}
          style={{ marginTop: 16 }}
        />

        {/* Frequency */}
        <Text style={[s.label, { color: colors.textPrimary, marginTop: 24 }]}>Collection frequency</Text>
        {FREQUENCIES.map((f) => {
          const active = frequency === f.value;
          return (
            <TouchableOpacity key={f.value} onPress={() => setFrequency(f.value)} activeOpacity={0.8}
              style={[s.optionRow, { backgroundColor: active ? colors.successLight : colors.surface, borderColor: active ? colors.success : colors.border, ...Shadow.card(colors.black) }]}
            >
              <View style={[s.dot, { backgroundColor: active ? colors.success : colors.border }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? colors.success : colors.textPrimary }}>{f.label}</Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{f.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Cycle type */}
        <Text style={[s.label, { color: colors.textPrimary, marginTop: 24 }]}>Cycle type</Text>
        {CYCLE_TYPES.map((c) => {
          const active = cycleType === c.value;
          return (
            <TouchableOpacity key={c.value} onPress={() => setCycleType(c.value)} activeOpacity={0.8}
              style={[s.optionRow, { backgroundColor: active ? colors.primaryTint : colors.surface, borderColor: active ? colors.primary : colors.border, ...Shadow.card(colors.black) }]}
            >
              <Ionicons name={c.icon as any} size={20} color={active ? colors.primary : colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? colors.primary : colors.textPrimary }}>{c.label}</Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{c.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Fixed-cycle date inputs */}
        {cycleType === 'fixed' && (
          <View style={{ marginTop: 16 }}>
            <Input
              label="Start date"
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChangeText={(v) => { setStartDate(v); setErrors((p) => ({ ...p, start_date: '' })); }}
              keyboardType="numbers-and-punctuation"
              error={errors.start_date}
              leftIcon={<Ionicons name="play-circle-outline" size={18} color={colors.primary} />}
            />
            <View style={{ marginTop: 12 }}>
              <Input
                label="End date"
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChangeText={(v) => { setEndDate(v); setErrors((p) => ({ ...p, end_date: '' })); }}
                keyboardType="numbers-and-punctuation"
                error={errors.end_date}
                leftIcon={<Ionicons name="stop-circle-outline" size={18} color={colors.primary} />}
              />
            </View>
          </View>
        )}

        {errors.general ? (
          <Text style={{ color: colors.error, fontSize: FontSize.sm, marginTop: 12, textAlign: 'center' }}>{errors.general}</Text>
        ) : null}

        <Button label="Create Group" onPress={handleSubmit} loading={mutation.isPending} style={{ marginTop: 32, backgroundColor: colors.success }} />
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
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.md, borderWidth: 1.5, marginBottom: 10,
  },
  dot: { width: 18, height: 18, borderRadius: 9 },
});
