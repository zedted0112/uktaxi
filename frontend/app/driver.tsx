import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, fonts, radii } from '../src/theme';
import { api, DriverTripBundle } from '../src/api';

const BACKEND_TO_DISPLAY: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 };

export default function Driver() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<DriverTripBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.driverAll();
      setData(d);
      if (!expandedTripId && d.length > 0) {
        // auto-expand first trip with bookings
        const firstWithBookings = d.find(b => b.bookings.length > 0);
        if (firstWithBookings) setExpandedTripId(firstWithBookings.trip.id);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [expandedTripId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const onConfirm = async (bookingId: string) => {
    try {
      await api.confirmBooking(bookingId);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to confirm');
    }
  };

  const totalPending = data.reduce((sum, b) => sum + b.bookings.filter(x => x.status === 'pending').length, 0);
  const totalConfirmed = data.reduce((sum, b) => sum + b.bookings.filter(x => x.status === 'confirmed').length, 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="driver-screen">
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="driver-back">
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Portal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <Text style={styles.heading}>Today&apos;s Trips</Text>
        <Text style={styles.subheading}>Confirm passenger bookings</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.black }]}>
            <Text style={[styles.statLabel, { color: '#9CA3AF' }]}>Pending</Text>
            <Text style={[styles.statValue, { color: '#fff' }]} testID="stat-pending">{totalPending}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.greenLight }]}>
            <Text style={[styles.statLabel, { color: colors.greenDark }]}>Confirmed</Text>
            <Text style={[styles.statValue, { color: colors.greenDark }]} testID="stat-confirmed">{totalConfirmed}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
        ) : data.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: colors.textSecondary, fontFamily: fonts.body }}>
            No trips assigned
          </Text>
        ) : (
          data.map((bundle) => {
            const expanded = expandedTripId === bundle.trip.id;
            return (
              <View key={bundle.trip.id} style={styles.tripBlock} testID={`driver-trip-${bundle.trip.id}`}>
                <TouchableOpacity
                  onPress={() => setExpandedTripId(expanded ? null : bundle.trip.id)}
                  style={styles.tripHeader}
                  testID={`driver-trip-toggle-${bundle.trip.id}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripRoute}>
                      {bundle.trip.from_city} → {bundle.trip.to_city}
                    </Text>
                    <View style={styles.tripMetaRow}>
                      <Feather name="clock" size={11} color={colors.textSecondary} />
                      <Text style={styles.tripMeta}>{bundle.trip.depart_time}</Text>
                      <Text style={styles.dot}>•</Text>
                      <MaterialCommunityIcons name="car-seat" size={12} color={colors.textSecondary} />
                      <Text style={styles.tripMeta}>
                        {bundle.trip.seats_left}/{bundle.trip.total_seats} left
                      </Text>
                    </View>
                    <Text style={styles.tripDriver}>Driver: {bundle.trip.driver_name}</Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeTxt}>{bundle.bookings.length}</Text>
                  </View>
                  <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.bookingsList}>
                    {bundle.bookings.length === 0 ? (
                      <Text style={styles.noBookings}>No bookings for this trip yet</Text>
                    ) : (
                      bundle.bookings.map((b) => {
                        const seats = b.seat_numbers.map((s) => BACKEND_TO_DISPLAY[s] ?? s).join(', ');
                        return (
                          <View key={b.id} style={styles.bookingRow} testID={`driver-booking-${b.id}`}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.bookingName}>{b.user_name}</Text>
                              <Text style={styles.bookingPhone}>{b.user_phone}</Text>
                              <View style={styles.bookingMetaRow}>
                                <MaterialCommunityIcons name="car-seat" size={11} color={colors.greenDark} />
                                <Text style={styles.bookingMeta}>Seat {seats}</Text>
                                <Text style={styles.dot}>•</Text>
                                <Text style={styles.bookingMeta}>{b.booking_ref}</Text>
                              </View>
                            </View>
                            {b.status === 'confirmed' ? (
                              <View style={styles.confirmedPill}>
                                <Feather name="check" size={12} color={colors.greenDark} />
                                <Text style={styles.confirmedPillTxt}>Confirmed</Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={() => onConfirm(b.id)}
                                testID={`confirm-btn-${b.id}`}
                              >
                                <Text style={styles.confirmBtnTxt}>Confirm</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
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
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 10 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  headerTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 32, color: colors.textPrimary, letterSpacing: -1, marginTop: 6 },
  subheading: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  statCard: { flex: 1, borderRadius: radii.lg, padding: 18 },
  statLabel: { fontFamily: fonts.body, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontFamily: fonts.heading, fontSize: 32, marginTop: 4 },
  tripBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tripHeader: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 10 },
  tripRoute: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3 },
  tripMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  tripMeta: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  dot: { color: colors.textMuted, fontSize: 12 },
  tripDriver: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 6 },
  countBadge: {
    minWidth: 28, height: 28, paddingHorizontal: 8,
    borderRadius: 14, backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  countBadgeTxt: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 12 },
  bookingsList: { borderTopWidth: 1, borderTopColor: colors.borderSoft, padding: 14 },
  noBookings: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 12, textAlign: 'center', padding: 12 },
  bookingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, backgroundColor: colors.borderSoft, borderRadius: radii.md, marginBottom: 8,
  },
  bookingName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  bookingPhone: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  bookingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  bookingMeta: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  confirmBtn: {
    backgroundColor: colors.green, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.full,
  },
  confirmBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 12 },
  confirmedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.greenLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.full,
  },
  confirmedPillTxt: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.greenDark },
});
