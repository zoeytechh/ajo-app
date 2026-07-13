import { LoginScreen } from '../src/AuthScreens';
import { useRouter } from 'expo-router';
import type { AjoUser } from '../src/store/useAppStore';

export default function LoginRoute() {
  const router = useRouter();

  const handleSuccess = (user: AjoUser) => {
    if (user.is_email_verified) {
      router.replace('/home');
    } else {
      router.replace({ pathname: '/otp', params: { email: user.email } });
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
