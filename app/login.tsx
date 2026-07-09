import { LoginScreen } from '../src/AuthScreens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { AjoUser } from '../src/store/useAppStore';

export default function LoginRoute() {
  const router = useRouter();
  const { is_org } = useLocalSearchParams<{ is_org?: string }>();

  const handleSuccess = (user: AjoUser) => {
    if (user.is_email_verified) {
      router.replace(is_org === 'true' ? '/thrift/org/create' : '/home');
    } else {
      router.replace({ pathname: '/otp', params: { email: user.email, is_org: is_org ?? 'false' } });
    }
  };

  return (
    <LoginScreen
      onSuccess={handleSuccess}
      onRegister={() => router.push('/register')}
      onForgot={() => router.push('/forgot')}
    />
  );
}
