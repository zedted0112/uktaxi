import { Tabs } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../src/theme';
import { useAuth } from '../../src/auth';
import { useNotifications } from '../../src/hooks/useNotifications';

function BellIcon({ color, size }: { color: string; size: number }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user?.phone, { includeList: false, pollMs: 60_000 });
  return (
    <View>
      <Feather name="bell" size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: colors.green, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontFamily: fonts.bodySemiBold },
});

export default function DriverTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: bottomInset + (Platform.OS === 'ios' ? 6 : 8),
          height: 54 + bottomInset,
        },
      }}
    >
      <Tabs.Screen name="publish" options={{
        title: 'Publish',
        tabBarIcon: ({ color, size }) => <Feather name="plus-circle" size={size} color={color} />,
        tabBarButtonTestID: 'dtab-publish',
      }} />
      <Tabs.Screen name="rides" options={{
        title: 'My Rides',
        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="steering" size={size} color={color} />,
        tabBarButtonTestID: 'dtab-rides',
      }} />
      <Tabs.Screen name="requests" options={{
        title: 'Requests',
        tabBarIcon: ({ color, size }) => <Feather name="inbox" size={size} color={color} />,
        tabBarButtonTestID: 'dtab-requests',
      }} />
      <Tabs.Screen name="notifications" options={{
        title: 'Alerts',
        tabBarIcon: ({ color, size }) => <BellIcon color={color} size={size} />,
        tabBarButtonTestID: 'dtab-notifications',
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        tabBarButtonTestID: 'dtab-profile',
      }} />
    </Tabs>
  );
}
