import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAppStore';
import { Button } from '../src/components';
import { Colors, FontSize } from '../src/theme';

export default function HomeRoute() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <View style={s.container}>
      <Text style={s.greeting}>Hello, {user?.first_name ?? 'there'} 👋</Text>
      <Text style={s.headline}>Ajo Home</Text>
      <Text style={s.sub}>Your savings dashboard is coming soon.</Text>
      <Button label="Log Out" onPress={handleLogout} variant="outline" style={{ marginTop: 32 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  greeting:  { fontSize: FontSize.base, color: Colors.textSecondary, marginBottom: 8 },
  headline:  { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.primary, marginBottom: 12, letterSpacing: -0.5 },
  sub:       { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center' },
});
