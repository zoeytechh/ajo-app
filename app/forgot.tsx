import { ForgotPasswordScreen } from '../src/AuthScreens';
import { useRouter } from 'expo-router';

export default function ForgotRoute() {
  const router = useRouter();
  
  return (
    <ForgotPasswordScreen
      onBack={() => router.back()}
      onSuccess={() => router.back()}
    />
  );
}