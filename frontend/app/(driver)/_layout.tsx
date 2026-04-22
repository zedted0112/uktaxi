import { Tabs } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colors, fonts } from '../../src/theme';

export default function DriverTabs() {
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
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        tabBarButtonTestID: 'dtab-profile',
      }} />
    </Tabs>
  );
}
