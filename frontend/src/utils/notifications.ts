import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { api } from '../api';

/**
 * Request permission, obtain the Expo Push Token, and save it to our
 * backend so the server can reach this device.
 *
 * Silently no-ops on:
 * - simulators / emulators (no push support)
 * - Expo Go on Android (removed in SDK 53 — requires a development build)
 * The in-app notification inbox still works regardless.
 */
export async function registerPushToken(phone: string): Promise<void> {
  // Expo Go on Android throws at import time since SDK 53 — skip entirely
  if (isRunningInExpoGo() && Platform.OS === 'android') return;

  if (!Device.isDevice) return;

  // Lazy require so the module is never loaded in Expo Go on Android
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require('expo-notifications');

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  if (!token) return;

  await api.savePushToken(phone, token).catch(() => {});

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}
