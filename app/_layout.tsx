import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/useAppStore';
import '../global.css';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const PUBLIC_ROUTES = new Set(['index', 'onboarding', 'login', 'register', 'otp', 'forgot']);

function AuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { user, accessToken, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;

    const currentRoute = segments[0] as string | undefined;
    const isPublicRoute = !currentRoute || PUBLIC_ROUTES.has(currentRoute);
    const isAuthenticated = !!user && !!accessToken;

    if (isAuthenticated && isPublicRoute && currentRoute !== 'index') {
      router.replace('/home');
    } else if (!isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    }
  }, [user, accessToken, _hasHydrated, segments]);

  return null;
}

function AppShell() {
  const { isDark } = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
