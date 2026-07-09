import { useState } from 'react';
import {
  View, Text, StatusBar, KeyboardAvoidingView,
  Platform, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { thriftService, type OrgType } from '../../../src/services/thriftService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Button, Input, LoadingOverlay, feedback } from '../../../src/components';

const ORG_TYPES: { value: OrgType; label: string; desc: string }[] = [
  { value: 'mfb',         label: 'Microfinance Bank', desc: 'Licensed MFB employing collectors' },
  { value: 'cooperative', label: 'Cooperative',        desc: 'Member-owned savings cooperative' },
  { value: 'bank',        label: 'Bank',               desc: 'Commercial or community bank' },
  { value: 'other',       label: 'Other',              desc: 'Any other thrift organisation' },
];

export default function CreateOrgRoute() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName]     = useState('');
  const [orgType, setOrgType] = useState<OrgType>('other');
  const [regNumber, setReg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => thriftService.createOrg({ name: name.trim(), org_type: orgType, registration_number: regNumber.trim() }),
    onSuccess: (org) => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-orgs'] });
      router.replace(`/thrift/org/${org.id}` as any);
    },
    onError: (err: any) => {
      feedback('error');
      const d = err.response?.data ?? {};
      setErrors({ name: d.name?.[0] ?? '', general: d.detail ?? 'Something went wrong.' });
    },
  });

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Organisation name is required.';
    if (Object.keys(e).length) { setErrors(e); feedback('error'); return; }
    setErrors({});
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={mutation.isPending} message="Creating organisation…" />

      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>New Organisation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[s.infoBox, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="business-outline" size={18} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.primary, marginLeft: 8, lineHeight: 18 }}>
            Creating an organisation lets you manage multiple collectors, monitor all their groups and payments, and receive reports about collector misconduct.
          </Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Input
            label="Organisation name"
            placeholder="e.g. Lagos MFB Thrift"
            value={name}
            onChangeText={(v) => { setName(v); setErrors((p) => ({ ...p, name: '' })); }}
            error={errors.name}
            leftIcon={<Ionicons name="business-outline" size={18} color={colors.primary} />}
          />
        </View>

        <Input
          label="Registration number (optional)"
          placeholder="e.g. RC123456"
          value={regNumber}
          onChangeText={setReg}
          autoCapitalize="characters"
          style={{ marginTop: 16 }}
          leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.primary} />}
        />

        <Text style={[s.label, { color: colors.textPrimary, marginTop: 24 }]}>Organisation type</Text>
        {ORG_TYPES.map((t) => {
          const active = orgType === t.value;
          return (
            <TouchableOpacity key={t.value} onPress={() => setOrgType(t.value)} activeOpacity={0.8}
              style={[s.optionRow, { backgroundColor: active ? colors.primaryTint : colors.surface, borderColor: active ? colors.primary : colors.border, ...Shadow.card(colors.black) }]}
            >
              <View style={[s.dot, { backgroundColor: active ? colors.primary : colors.border }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? colors.primary : colors.textPrimary }}>{t.label}</Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{t.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {errors.general ? (
          <Text style={{ color: colors.error, fontSize: FontSize.sm, marginTop: 12, textAlign: 'center' }}>{errors.general}</Text>
        ) : null}

        <Button label="Create Organisation" onPress={handleSubmit} loading={mutation.isPending} style={{ marginTop: 32 }} />
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
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: Radius.md },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: Radius.md, borderWidth: 1.5, marginBottom: 10,
  },
  dot: { width: 18, height: 18, borderRadius: 9 },
});
