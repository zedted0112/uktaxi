import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api, PushPlatform } from './api';

let Notifications: any = null;
try {
  // Expo Go SDK 53 throws on Android when importing this
  Notifications = require('expo-notifications');
} catch (e) {
  console.log('expo-notifications not available in this environment');
}

const ENABLE_PUSH =
  String(process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS || '').toLowerCase() === 'true';

let CURRENT_PUSH_TOKEN: string | null = null;

function getPushPlatform(): PushPlatform {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
}

export function getRegisteredPushToken(): string | null {
  return CURRENT_PUSH_TOKEN;
}

export async function registerPushForCurrentSession(): Promise<string | null> {
  if (!ENABLE_PUSH || !Notifications) return null;
  if (!Device.isDevice) return null;
  if (Platform.OS === 'web') return null;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#16A34A',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
    const tokenRes = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = tokenRes.data;
    if (!token) return null;

    await api.registerPushToken({
      token,
      platform: getPushPlatform(),
      app_version: String(Constants.expoConfig?.version || ''),
    });
    CURRENT_PUSH_TOKEN = token;
    return token;
  } catch (e) {
    console.log('Failed to register push token:', e);
    return null;
  }
}

export async function unregisterPushForCurrentSession(tokenOverride?: string | null): Promise<void> {
  const token = tokenOverride || CURRENT_PUSH_TOKEN;
  if (!token) return;
  await api.unregisterPushToken(token).catch(() => {});
  CURRENT_PUSH_TOKEN = null;
}
