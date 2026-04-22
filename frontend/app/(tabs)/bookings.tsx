import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api, Booking, DEMO_USER } from '../../src/api';

const BACKEND_TO_DISPLAY: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 };

export default function Bookings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listBookings(DEMO_USER.phone);
      setBookings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="bookings-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>My Bookings</Text>
        <Text style={styles.subheading}>Your upcoming & past trips</Text>

        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
        ) : bookings.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="ticket-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyTxt}>Book your first taxi seat to see it here</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)')} testID="empty-book-btn">
              <Text style={styles.emptyBtnTxt}>Browse Taxis</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookings.map((b) => <BookingCard key={b.id} booking={b} onPress={() => router.push(`/ticket/${b.id}`)} />)
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const statusColor =
    booking.status === 'confirmed' ? colors.greenDark : booking.status === 'cancelled' ? '#B91C1C' : '#B45309';
  const statusBg =
    booking.status === 'confirmed' ? colors.greenLight : booking.status === 'cancelled' ? '#FEE2E2' : '#FEF3C7';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85} testID={`booking-card-${booking.id}`}>
      <View style={styles.cardTop}>
        <Text style={styles.ref}>{booking.booking_ref}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusTxt, { color: statusColor }]}>{booking.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardRoute}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardCity}>{booking.from_city}</Text>
          <Text style={styles.cardTime}>{booking.depart_time}</Text>
        </View>
        <View style={styles.arrow}>
          <View style={styles.arrowLine} />
          <MaterialCommunityIcons name="car-side" size={18} color={colors.greenDark} />
          <View style={styles.arrowLine} />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.cardCity}>{booking.to_city}</Text>
          <Text style={styles.cardTime}>{booking.arrive_time}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="car-seat" size={13} color={colors.textSecondary} />
          <Text style={styles.metaTxt}>
            Seat {booking.seat_numbers.map((s) => BACKEND_TO_DISPLAY[s] ?? s).join(', ')}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={12} color={colors.textSecondary} />
          <Text style={styles.metaTxt}>{booking.date}</Text>
        </View>
        <Text style={styles.price}>₹{booking.total_price}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  heading: { fontFamily: fonts.heading, fontSize: 36, color: colors.textPrimary, letterSpacing: -1 },
  subheading: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  ref: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.5 },
  cardRoute: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardCity: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  cardTime: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  arrow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  arrowLine: { flex: 1, height: 1, backgroundColor: colors.border },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 14,
    gap: 12,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  price: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, marginLeft: 'auto' },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, marginTop: 12 },
  emptyTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  emptyBtn: { backgroundColor: colors.black, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radii.full },
  emptyBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
