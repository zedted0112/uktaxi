import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api, BookingRequest } from '../../src/api';
import { useAuth } from '../../src/auth';

const STATUS_META: Record<BookingRequest['status'], { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'PENDING', color: '#B45309', bg: '#FEF3C7', icon: 'clock' },
  confirmed: { label: 'CONFIRMED', color: '#059669', bg: '#D1FAE5', icon: 'check-circle' },
  rejected: { label: 'REJECTED', color: '#B91C1C', bg: '#FEE2E2', icon: 'x-circle' },
  cancelled: { label: 'CANCELLED', color: '#4B5563', bg: '#E5E7EB', icon: 'slash' },
};

export default function Bookings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.listRequests({ user_phone: user.phone });
      setItems(data);
    } finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const cancel = async (b: BookingRequest) => {
    Alert.alert('Cancel booking?', `Cancel ${b.booking_ref}? Allowed up to 30 min before departure.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: async () => {
        try { await api.cancelRequest(b.id); await load(); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
      }},
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="bookings-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <Text style={styles.heading}>My Bookings</Text>
        <Text style={styles.subheading}>Your ride requests & tickets</Text>

        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="ticket-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyTxt}>Find a ride to send your first request</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)')} testID="browse-btn">
              <Text style={styles.emptyBtnTxt}>Find a Ride</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((b) => {
            const meta = STATUS_META[b.status];
            return (
              <View key={b.id} style={styles.card} testID={`booking-${b.id}`}>
                <TouchableOpacity onPress={() => router.push(`/ticket/${b.id}`)} activeOpacity={0.85}>
                  <View style={styles.top}>
                    <Text style={styles.ref}>{b.booking_ref}</Text>
                    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                      <Feather name={meta.icon} size={10} color={meta.color} />
                      <Text style={[styles.badgeTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                  <View style={styles.route}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.city}>{b.from_city}</Text>
                      <Text style={styles.time}>{b.depart_time}</Text>
                    </View>
                    <View style={styles.arrow}>
                      <View style={styles.arrowLine} />
                      <MaterialCommunityIcons name="car-side" size={16} color={colors.greenDark} />
                      <View style={styles.arrowLine} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.city}>{b.to_city}</Text>
                      <Text style={styles.time}>{b.arrive_time}</Text>
                    </View>
                  </View>
                  <View style={styles.meta}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="car-seat" size={11} color={colors.textSecondary} />
                      <Text style={styles.metaTxt}>Seat {b.seat_numbers.join(', ')}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Feather name="calendar" size={11} color={colors.textSecondary} />
                      <Text style={styles.metaTxt}>{b.date}</Text>
                    </View>
                    <Text style={styles.price}>₹{b.total_price}</Text>
                  </View>
                </TouchableOpacity>
                {(b.status === 'pending' || b.status === 'confirmed') && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(b)} testID={`cancel-${b.id}`}>
                    <Feather name="x" size={13} color="#B91C1C" />
                    <Text style={styles.cancelTxt}>Cancel booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  heading: { fontFamily: fonts.heading, fontSize: 36, color: colors.textPrimary, letterSpacing: -1 },
  subheading: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  ref: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textPrimary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.full },
  badgeTxt: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.5 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  city: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  arrow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  arrowLine: { flex: 1, height: 1, backgroundColor: colors.border },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  price: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginLeft: 'auto' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    marginTop: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#FEE2E2',
    borderRadius: radii.full, backgroundColor: '#FEF2F2',
  },
  cancelTxt: { color: '#B91C1C', fontFamily: fonts.bodySemiBold, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, marginTop: 12 },
  emptyTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 18 },
  emptyBtn: { backgroundColor: colors.black, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radii.full },
  emptyBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
