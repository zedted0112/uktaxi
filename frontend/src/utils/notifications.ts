import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '../api';

/**
 * Request permission, obtain the Expo Push Token, and save it to our
 * backend so the server can reach this device.
 *
 * Silently no-ops on simulators or when permission is denied.
 */
export async function registerPushToken(phone: string): Promise<void> {
  if (!Device.isDevice) return; // simulators can't receive push notifications

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  if (!token) return;

  await api.savePushToken(phone, token).catch(() => {
    // Non-fatal — the app still works without push tokens
  });

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}
