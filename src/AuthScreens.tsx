import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, KeyboardAvoidingView,
  Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius } from './theme';
import { Button, Input, Divider, OTPBox, LoadingOverlay, Bouncy, feedback } from './components';
import Svg, { Path } from 'react-native-svg';
import { authService } from './services/authService';
import { useAuthStore } from './store/useAppStore';

// ─── Logo Mark ────────────────────────────────────────────────────────────────
const SmallLogo = () => (
  <View style={{ alignItems: 'center', marginBottom: 12 }}>
    <Svg width={56} height={60} viewBox="0 0 220 240">
      <Path
        d="M110 12 L196 42 L196 118 C196 162 154 195 110 215 C66 195 24 162 24 118 L24 42 Z"
        fill={Colors.primaryTint}
        stroke={Colors.primary}
        strokeWidth="10"
      />
      <Path
        d="M84 110 L102 128 L138 92"
        stroke={Colors.primary}
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
);

// ─── Auth Header ──────────────────────────────────────────────────────────────
const AuthHeader: React.FC<{ title: string; subtitle: string; showLogo?: boolean }> = ({
  title, subtitle, showLogo = true,
}) => (
  <View style={s.authHeader}>
    {showLogo && <SmallLogo />}
    <Text style={s.authTitle}>{title}</Text>
    <Text style={s.authSubtitle}>{subtitle}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER SCREEN
// ─────────────────────────────────────────────────────────────────────────────
interface RegisterProps {
  onSuccess: (email: string, phone: string) => void;
  onLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterProps> = ({ onSuccess, onLogin }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    const nameParts = form.name.trim().split(/\s+/);
    if (nameParts.length < 2 || !nameParts[1]) e.name     = 'Enter your first and last name';
    if (!form.email.includes('@'))              e.email    = 'Enter a valid email';
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid phone number';
    if (form.password.length < 8)               e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm)         e.confirm  = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length > 0) feedback('error');
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    setServerError('');
    try {
      const nameParts = form.name.trim().split(/\s+/);
      await authService.register({
        first_name:   nameParts[0],
        last_name:    nameParts.slice(1).join(' '),
        email:        form.email,
        phone_number: form.phone,
        password:     form.password,
      });
      feedback('success');
      onSuccess(form.email, form.phone);
    } catch (err: any) {
      feedback('error');
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const keyMap: Record<string, string> = { phone_number: 'phone', first_name: 'name', last_name: 'name' };
        const fieldErrors: Record<string, string> = {};
        let general = '';
        for (const [key, val] of Object.entries(data)) {
          const msg = Array.isArray(val) ? (val[0] as string) : String(val);
          if (key === 'non_field_errors' || key === 'detail') {
            general = msg;
          } else {
            fieldErrors[keyMap[key] ?? key] = msg;
          }
        }
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
        setServerError(general || (Object.keys(fieldErrors).length === 0 ? 'Registration failed. Please try again.' : ''));
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LoadingOverlay visible={loading} message="Creating your account..." />
      <ScrollView style={s.screen} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <AuthHeader title="Create account" subtitle="Join Ajo — your circle, your record." />

        {serverError ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>⚠️  {serverError}</Text>
          </View>
        ) : null}

        <Input
          label="Full Name" placeholder="Ada Okonkwo" value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })} error={errors.name}
          autoCapitalize="words" leftIcon={<Ionicons name="person-outline" size={18} color={Colors.primary} />}
        />
        <Input
          label="Email Address" placeholder="ada@email.com" value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })} error={errors.email}
          keyboardType="email-address" autoCapitalize="none"
          leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.primary} />}
        />
        <Input
          label="Phone Number" placeholder="+234 800 000 0000" value={form.phone}
          onChangeText={(v) => setForm({ ...form, phone: v })} error={errors.phone}
          keyboardType="phone-pad" leftIcon={<Ionicons name="call-outline" size={18} color={Colors.primary} />}
        />
        <Input
          label="Password" placeholder="Minimum 8 characters" value={form.password}
          onChangeText={(v) => setForm({ ...form, password: v })} error={errors.password}
          secureTextEntry={!showPass} leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />}
          rightIcon={
            <TouchableOpacity onPress={() => { feedback('light'); setShowPass(!showPass); }}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          }
        />
        <Input
          label="Confirm Password" placeholder="Repeat your password" value={form.confirm}
          onChangeText={(v) => setForm({ ...form, confirm: v })} error={errors.confirm}
          secureTextEntry={!showPass} leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />}
        />

        <Text style={s.terms}>
          By creating an account, you agree to Ajo's{' '}
          <Text style={s.link}>Terms of Service</Text> and{' '}
          <Text style={s.link}>Privacy Policy</Text>.
        </Text>

        <Button label="Create Account" onPress={handleRegister} loading={loading} />

        <Divider label="or" />

        <Bouncy onPress={onLogin} style={s.switchRow}>
          <Text style={s.switchText}>
            Already have an account?{' '}
            <Text style={s.switchAction}>Log in</Text>
          </Text>
        </Bouncy>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
interface LoginProps {
  onSuccess: (user: any) => void;
  onRegister: () => void;
  onForgot: () => void;
}

export const LoginScreen: React.FC<LoginProps> = ({ onSuccess, onRegister, onForgot }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      feedback('error');
      setServerError('Please fill in all fields');
      return;
    }
    setServerError('');
    setLoading(true);
    try {
      const { user } = await authService.login({ email: form.email, password: form.password });
      feedback('success');
      onSuccess(user);
    } catch (err: any) {
      feedback('error');
      const data = err.response?.data;
      const msg = data?.detail || data?.non_field_errors?.[0] || 'Invalid email or password';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LoadingOverlay visible={loading} message="Logging you in..." />
      <ScrollView style={s.screen} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <AuthHeader title="Welcome back" subtitle="Log in to your Ajo account." />

        {serverError ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>⚠️  {serverError}</Text>
          </View>
        ) : null}

        <Input
          label="Email Address" placeholder="ada@email.com" value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
          keyboardType="email-address" autoCapitalize="none"
          leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.primary} />}
        />
        <Input
          label="Password" placeholder="Your password" value={form.password}
          onChangeText={(v) => setForm({ ...form, password: v })}
          secureTextEntry={!showPass} leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />}
          rightIcon={
            <TouchableOpacity onPress={() => { feedback('light'); setShowPass(!showPass); }}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          }
        />

        <Bouncy onPress={onForgot} style={{ alignSelf: 'flex-end', marginTop: -8, marginBottom: 20 }}>
          <Text style={s.link}>Forgot password?</Text>
        </Bouncy>

        <Button label="Log In" onPress={handleLogin} loading={loading} />

        <Divider label="or" />

        <Bouncy onPress={onRegister} style={s.switchRow}>
          <Text style={s.switchText}>
            Don't have an account?{' '}
            <Text style={s.switchAction}>Sign up</Text>
          </Text>
        </Bouncy>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OTP VERIFICATION SCREEN
// ─────────────────────────────────────────────────────────────────────────────

type OTPChannel = 'email' | 'whatsapp';

interface OTPProps {
  email?: string;
  phone_number?: string;
  onSuccess: () => void;
  onBack: () => void;
}

const maskEmail = (email: string) =>
  email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c);

const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;
  return phone.slice(0, 4) + '*'.repeat(Math.max(phone.length - 8, 3)) + phone.slice(-4);
};

export const OTPScreen: React.FC<OTPProps> = ({ email, phone_number, onSuccess, onBack }) => {
  const user = useAuthStore((state) => state.user);
  const resolvedEmail = email || user?.email || '';
  const resolvedPhone = phone_number || user?.phone_number || '';

  const [channel, setChannel] = useState<OTPChannel>('email');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [focusIdx, setFocusIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(59);
  const inputs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setTimer(59);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setTimer((p) => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; }),
      1000,
    );
  };

  React.useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleChannelChange = async (next: OTPChannel) => {
    if (next === channel || switching) return;
    setSwitching(true);
    setOtp(['', '', '', '', '', '']);
    setError('');
    try {
      await authService.resendOtp(resolvedEmail, next === 'email' ? 'email' : 'phone');
      feedback('medium');
      setChannel(next);
      startTimer();
    } catch {
      feedback('error');
      setError('Could not send code. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  const handleChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    feedback('light');
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      inputs.current[idx + 1]?.focus();
      setFocusIdx(idx + 1);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    setError('');
    try {
      if (channel === 'email') {
        await authService.verifyEmail(resolvedEmail, code);
      } else {
        await authService.verifyPhone(resolvedEmail, code);
      }
      feedback('success');
      onSuccess();
    } catch (err: any) {
      feedback('error');
      const data = err.response?.data;
      const msg = data?.detail || data?.code?.[0] || data?.non_field_errors?.[0] || 'Invalid or expired code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || !resolvedEmail) return;
    try {
      await authService.resendOtp(resolvedEmail, channel === 'email' ? 'email' : 'phone');
      feedback('medium');
      setOtp(['', '', '', '', '', '']);
      setError('');
      startTimer();
    } catch {
      feedback('error');
    }
  };

  const contactDisplay = channel === 'email'
    ? (resolvedEmail ? maskEmail(resolvedEmail) : 'your email')
    : (resolvedPhone ? maskPhone(resolvedPhone) : 'your WhatsApp number');

  return (
    <View style={s.screen}>
      <LoadingOverlay visible={loading || switching} message={switching ? 'Sending code…' : 'Verifying…'} />
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Bouncy onPress={onBack} style={s.backBtn}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          <Text style={[s.backText, { marginLeft: 4 }]}>Back</Text>
        </View>
      </Bouncy>

      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.scrollContent, { paddingTop: 88 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="Verify your account" subtitle="Choose how you want to receive your code." />

        {/* ── Channel toggle ── */}
        <View style={s.channelRow}>
          <Bouncy
            onPress={() => handleChannelChange('email')}
            style={[s.channelBtn, channel === 'email' && s.channelBtnActive]}
            disabled={switching}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={channel === 'email' ? Colors.white : Colors.textSecondary}
            />
            <Text style={[s.channelLabel, channel === 'email' && s.channelLabelActive]}>Email</Text>
          </Bouncy>

          <Bouncy
            onPress={() => handleChannelChange('whatsapp')}
            style={[s.channelBtn, channel === 'whatsapp' && s.channelBtnActive, !resolvedPhone && s.channelBtnDisabled]}
            disabled={switching || !resolvedPhone}
          >
            <Ionicons
              name="logo-whatsapp"
              size={18}
              color={channel === 'whatsapp' ? Colors.white : !resolvedPhone ? Colors.textDisabled : Colors.textSecondary}
            />
            <Text style={[s.channelLabel, channel === 'whatsapp' && s.channelLabelActive, !resolvedPhone && s.channelLabelDisabled]}>
              WhatsApp
            </Text>
          </Bouncy>
        </View>

        {/* ── Sent-to label ── */}
        <View style={s.sentToRow}>
          <Ionicons
            name={channel === 'email' ? 'mail' : 'logo-whatsapp'}
            size={15}
            color={Colors.textSecondary}
          />
          <Text style={s.sentToText}>
            {'  '}Code sent to <Text style={s.sentToContact}>{contactDisplay}</Text>
          </Text>
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>⚠️  {error}</Text>
          </View>
        ) : null}

        {/* ── OTP boxes ── */}
        <View style={s.otpRow}>
          {otp.map((digit, idx) => (
            <View key={idx} style={{ position: 'relative' }}>
              <OTPBox value={digit} focused={focusIdx === idx} />
              <TextInput
                ref={(r) => { inputs.current[idx] = r; }}
                style={s.hiddenInput} value={digit}
                onChangeText={(v) => handleChange(v, idx)}
                onFocus={() => { feedback('light'); setFocusIdx(idx); }}
                keyboardType="numeric" maxLength={1} caretHidden
              />
            </View>
          ))}
        </View>

        <Button
          label="Verify"
          onPress={handleVerify}
          loading={loading}
          disabled={otp.join('').length < 6}
          style={{ marginTop: 32, marginBottom: 20 }}
        />

        <Bouncy onPress={handleResend} disabled={timer > 0} style={s.switchRow}>
          <Text style={s.switchText}>
            {timer > 0
              ? `Resend code in 0:${timer.toString().padStart(2, '0')}`
              : <Text style={s.switchAction}>Resend code</Text>}
          </Text>
        </Bouncy>
      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD SCREEN
// ─────────────────────────────────────────────────────────────────────────────
interface ForgotPasswordProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      feedback('error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resendOtp(email.trim().toLowerCase(), 'email');
    } catch {
      // Intentionally swallow — don't reveal whether the email exists
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          title="Reset Password"
          subtitle={
            sent
              ? 'If that email is registered, a code has been sent. Contact support with the code to reset your password.'
              : "Enter your registered email and we'll send you a verification code."
          }
        />

        {!sent ? (
          <>
            {!!error && (
              <View style={s.errorBanner}>
                <Text style={s.errorBannerText}>{error}</Text>
              </View>
            )}
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@example.com"
              leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.textDisabled} />}
            />
            <Button label="Send Code" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 12 }}>
            <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
            <Button label="Back to Login" onPress={onBack} variant="outline" style={{ marginTop: 28 }} />
          </View>
        )}
      </ScrollView>
      <LoadingOverlay visible={loading} />
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.white },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 24 },
  authHeader:    { alignItems: 'center', marginBottom: 28, paddingTop: 12 },
  authTitle:     { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary, textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  authSubtitle:  { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  terms:         { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 20, marginTop: 4 },
  link:          { color: Colors.primary, fontWeight: '600' },
  switchRow:     { alignItems: 'center', marginTop: 8 },
  switchText:    { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  switchAction:  { color: Colors.primary, fontWeight: '700' },
  errorBanner:     { backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: Colors.error },
  errorBannerText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: '500' },
  backBtn:  { position: 'absolute', top: 52, left: 20, zIndex: 10, paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: '600' },
  otpRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 },
  hiddenInput: { position: 'absolute', opacity: 0, width: 54, height: 58 },
  // Channel toggle
  channelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  channelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  channelBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  channelBtnDisabled: {
    opacity: 0.45,
  },
  channelLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  channelLabelActive: {
    color: Colors.white,
  },
  channelLabelDisabled: {
    color: Colors.textDisabled,
  },
  // Sent-to
  sentToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sentToText:    { fontSize: FontSize.sm, color: Colors.textSecondary },
  sentToContact: { fontWeight: '700', color: Colors.textPrimary },
});
