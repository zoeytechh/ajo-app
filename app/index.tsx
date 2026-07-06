import SplashScreen from '../screen/AjoSplashScreen';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAppStore';

export default function Index() {
  const router = useRouter();
  const { user, accessToken, _hasHydrated } = useAuthStore();

  const handleComplete = () => {
    if (_hasHydrated && user && accessToken) {
      router.replace('/home');
    } else {
      router.replace('/onboarding');
    }
  };

  return <SplashScreen onComplete={handleComplete} />;
}
