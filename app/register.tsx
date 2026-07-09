import { RegisterScreen } from '../src/AuthScreens';
import { useRouter } from 'expo-router';

export default function RegisterRoute() {
  const router = useRouter();

  return (
    <RegisterScreen
      onSuccess={(email, phone, isOrg) =>
        router.push({ pathname: '/otp', params: { email, phone, is_org: isOrg ? 'true' : 'false' } })
      }
      onLogin={() => router.back()}
    />
  );
}
