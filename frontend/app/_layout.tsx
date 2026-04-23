import { Stack, useRouter, useSegments } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { colors } from '../src/theme';
import { AuthProvider, useAuth } from '../src/auth';

// Push notifications are unavailable in Expo Go on Android from SDK 53+.
// The library throws at import time, so we use lazy require() instead of
// a static import and only load it when push is actually supported.
const pushSupported = !(isRunningInExpoGo() && Platform.OS === 'android');

if (pushSupported) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const notifListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'auth';
    const inUser = segments[0] === '(tabs)';
    const inDriver = segments[0] === '(driver)';

    if (!user && !inAuth) {
      router.replace('/auth');
    } else if (user && inAuth) {
      router.replace(user.role === 'driver' ? '/(driver)/publish' : '/(tabs)');
    } else if (user && user.role === 'driver' && inUser) {
      router.replace('/(driver)/publish');
    } else if (user && user.role === 'user' && inDriver) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  // Set up notification tap-to-navigate (only where push is supported)
  useEffect(() => {
    if (!pushSupported) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');

    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notification received while app is in foreground — banner shown automatically
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data) return;
      const { type } = data;
      if (!user) return;

      if (type === 'new_request' && user.role === 'driver') {
        router.push('/(driver)/requests');
      } else if ((type === 'booking_confirmed' || type === 'booking_rejected') && user.role === 'user') {
        router.push('/(tabs)/bookings');
      } else if (type === 'booking_cancelled' && user.role === 'driver') {
        router.push('/(driver)/requests');
      } else if (type === 'ride_cancelled' && user.role === 'user') {
        router.push('/(tabs)/bookings');
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(driver)" />
      <Stack.Screen name="ride/[id]" />
      <Stack.Screen name="ticket/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
