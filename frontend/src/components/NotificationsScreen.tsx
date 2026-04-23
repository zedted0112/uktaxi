import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme';
import { AppNotification } from '../api';
import { useNotifications } from '../hooks/useNotifications';

const TYPE_ICON: Record<string, { name: string; bg: string; color: string }> = {
  new_request:       { name: 'user-plus',    bg: '#EFF6FF', color: '#3B82F6' },
  booking_confirmed: { name: 'check-circle', bg: '#D1FAE5', color: '#059669' },
  booking_rejected:  { name: 'x-circle',     bg: '#FEE2E2', color: '#DC2626' },
  booking_cancelled: { name: 'x-circle',     bg: '#FEF3C7', color: '#D97706' },
  ride_cancelled:    { name: 'alert-circle', bg: '#FEE2E2', color: '#DC2626' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (id: string) => void;
}) {
  const meta = TYPE_ICON[item.type] ?? { name: 'bell', bg: colors.borderSoft, color: colors.textSecondary };
  return (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
        <Feather name={meta.name as any} size={18} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {!item.read && <View style={styles.dot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ phone }: { phone: string }) {
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, loading, refresh, markRead, markAllRead } = useNotifications(phone);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllTxt}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NotifRow item={item} onPress={markRead} />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.green} />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Feather name="bell-off" size={36} color={colors.textMuted} />
              <Text style={styles.emptyTxt}>No notifications yet</Text>
              <Text style={styles.emptySubTxt}>
                When a driver accepts or rejects your booking, you'll see it here.
              </Text>
            </View>
          )
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: insets.bottom + 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  heading: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.5 },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full,
    backgroundColor: colors.greenLight,
  },
  markAllTxt: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.greenDark },

  row: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowUnread: { backgroundColor: '#F0FDF4' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, flex: 1 },
  body: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyTxt: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.textSecondary },
  emptySubTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
