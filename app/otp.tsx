import { OTPScreen } from '../src/AuthScreens';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function OTPRoute() {
  const router = useRouter();
  const { email, phone, is_org } = useLocalSearchParams<{ email?: string; phone?: string; is_org?: string }>();

  return (
    <OTPScreen
      email={email}
      phone_number={phone}
      onSuccess={() => router.replace({ pathname: '/login', params: { is_org: is_org ?? 'false' } })}
      onBack={() => router.back()}
    />
  );
}
