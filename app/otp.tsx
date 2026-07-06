import { OTPScreen } from '../src/AuthScreens';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function OTPRoute() {
  const router = useRouter();
  const { email, phone } = useLocalSearchParams<{ email?: string; phone?: string }>();

  return (
    <OTPScreen
      email={email}
      phone_number={phone}
      onSuccess={() => router.replace('/login')}
      onBack={() => router.back()}
    />
  );
}
