import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/useAppStore';
import { notificationService } from '../src/services/notificationService';
import { FontSize } from '../src/theme';
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

function BottomTabBar() {
  const segments = useSegments();
  const router   = useRouter();
  const { colors } = useTheme();
  const insets   = useSafeAreaInsets();
  const { user } = useAuthStore();

  const current = segments[0] as string | undefined;

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    enabled: !!user && !!current && !PUBLIC_ROUTES.has(current),
    refetchInterval: 60000,
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  if (!current || PUBLIC_ROUTES.has(current)) return null;

  const tabs = [
    { route: '/home',          icon: 'home',          label: 'Home'    },
    { route: '/history',       icon: 'time',          label: 'History' },
    { route: '/notifications', icon: 'notifications', label: 'Alerts'  },
    { route: '/profile',       icon: 'person',        label: 'Profile' },
  ] as const;

  return (
    <View style={[
      ts.bar,
      {
        backgroundColor: colors.tabBar,
        borderTopColor:  colors.tabBarBorder,
        paddingBottom:   Math.max(insets.bottom, 8),
      },
    ]}>
      {tabs.map((tab) => {
        const active = current === tab.route.slice(1);
        const tint   = active ? colors.tabActive : colors.tabInactive;
        const isAlerts = tab.route === '/notifications';
        return (
          <TouchableOpacity
            key={tab.route}
            onPress={() => router.replace(tab.route as any)}
            style={ts.tab}
            activeOpacity={0.7}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons
                name={(active ? tab.icon : `${tab.icon}-outline`) as any}
                size={24}
                color={tint}
              />
              {isAlerts && unreadCount > 0 && (
                <View style={[ts.badge, { backgroundColor: colors.error }]}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFF', lineHeight: 14 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: FontSize.xs, color: tint, fontWeight: active ? '700' : '400', marginTop: 2 }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ts = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
});

function AppShell() {
  const { isDark, colors } = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthGuard />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
      <BottomTabBar />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
