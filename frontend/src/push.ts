import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api, PushPlatform } from './api';

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
  if (!ENABLE_PUSH) return null;
  if (!Device.isDevice) return null;
  if (Platform.OS === 'web') return null;

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
}

export async function unregisterPushForCurrentSession(tokenOverride?: string | null): Promise<void> {
  const token = tokenOverride || CURRENT_PUSH_TOKEN;
  if (!token) return;
  await api.unregisterPushToken(token).catch(() => {});
  CURRENT_PUSH_TOKEN = null;
}
