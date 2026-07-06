import { RegisterScreen } from '../src/AuthScreens';
import { useRouter } from 'expo-router';

export default function RegisterRoute() {
  const router = useRouter();

  return (
    <RegisterScreen
      onSuccess={(email, phone) =>
        router.push({ pathname: '/otp', params: { email, phone } })
      }
      onLogin={() => router.back()}
    />
  );
}
