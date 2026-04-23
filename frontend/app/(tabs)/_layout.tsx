import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../src/theme';
import { useAuth } from '../../src/auth';
import { useNotifications } from '../../src/hooks/useNotifications';

function BellIcon({ color, size }: { color: string; size: number }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user?.phone);
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

export default function UserTabs() {
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
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          height: Platform.OS === 'ios' ? 82 : 64,
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        tabBarButtonTestID: 'tab-home',
      }} />
      <Tabs.Screen name="bookings" options={{
        title: 'My Bookings',
        tabBarIcon: ({ color, size }) => <Feather name="list" size={size} color={color} />,
        tabBarButtonTestID: 'tab-bookings',
      }} />
      <Tabs.Screen name="notifications" options={{
        title: 'Alerts',
        tabBarIcon: ({ color, size }) => <BellIcon color={color} size={size} />,
        tabBarButtonTestID: 'tab-notifications',
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        tabBarButtonTestID: 'tab-profile',
      }} />
    </Tabs>
  );
}
