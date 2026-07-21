import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

// Push notifications were removed from Expo Go in SDK 53.
// Skip all remote push code when running inside Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';

export function setupNotificationHandler(): void {
  if (isExpoGo) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E65100',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function syncPushToken(): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (!token) return;
    await api.post('/api/auth/device-token/', { expo_push_token: token });
  } catch {
    // Non-fatal
  }
}

export function addTapListener(onTap: () => void): () => void {
  if (isExpoGo) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener(onTap);
  return () => sub.remove();
}
