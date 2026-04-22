import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api, Ride } from '../../src/api';
import { useAuth } from '../../src/auth';
import { SeatMap, SeatLegend, SeatStatus } from '../../src/SeatMap';

export default function RideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [pendingSeats, setPendingSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.getRide(id);
      setRide(r);
      try {
        const reqs = await api.listRequests({ driver_phone: r.driver_phone });
        const ps = new Set<number>();
        reqs.filter(x => x.ride_id === r.id && x.status === 'pending').forEach(x => x.seat_numbers.forEach(s => ps.add(s)));
        setPendingSeats(Array.from(ps));
      } catch {}
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || !ride) return (
    <View style={styles.loader}><ActivityIndicator color={colors.green} /></View>
  );

  const isDriver = user?.role === 'driver' && user.phone === ride.driver_phone;
  const offlineSet = new Set(ride.offline_seats || []);
  const confirmedOnlineSet = new Set((ride.booked_seats || []).filter(s => !offlineSet.has(s)));
  const pendingSet = new Set(pendingSeats);

  const statusOf = (n: number): SeatStatus => {
    if (offlineSet.has(n)) return 'offline';
    if (confirmedOnlineSet.has(n)) return 'booked';
    if (pendingSet.has(n)) return 'pending';
    if (selected.includes(n)) return 'selected';
    return 'available';
  };

  const toggleSeat = (n: number) => {
    if (isDriver) return;
    const st = statusOf(n);
    if (st !== 'available' && st !== 'selected') return;
    setSelected(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  };

  const total = selected.length * ride.price;

  const request = async () => {
    if (!user || selected.length === 0) return;
    setSubmitting(true);
    try {
      const req = await api.createRequest({
        ride_id: ride.id, user_phone: user.phone, seat_numbers: selected,
      });
      router.replace(`/ticket/${req.id}`);
    } catch (e: any) {
      Alert.alert('Request failed', e?.message || 'Try again');
    } finally { setSubmitting(false); }
  };

  const cancelRide = async () => {
    Alert.alert('Cancel this ride?', 'All pending & confirmed bookings will be cancelled. Allowed up to 30 min before departure.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel ride', style: 'destructive', onPress: async () => {
        try { await api.cancelRide(ride.id); router.back(); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]} testID="ride-detail">
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <Feather name="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isDriver ? 'Ride Details' : 'Choose a Seat'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.dateTxt}>{ride.date} • {ride.depart_time}</Text>
        <Text style={styles.routeTxt}>{ride.from_city} — {ride.to_city}</Text>

        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIconBox}>
            <MaterialCommunityIcons name="car-estate" size={24} color={colors.greenDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleType}>{ride.vehicle_type}</Text>
            <Text style={styles.vehicleNumber}>{ride.vehicle_number}</Text>
            <Text style={styles.driverLine}>Driver: {ride.driver_name}</Text>
          </View>
          <View>
            <Text style={styles.priceLabel}>per seat</Text>
            <Text style={styles.priceValue}>₹{ride.price}</Text>
          </View>
        </View>

        <View style={styles.availRow}>
          <Text style={styles.availHeading}>Seat Map</Text>
          <Text style={styles.availCount} testID="seats-left">{ride.seats_left}/{ride.total_seats} available</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <SeatMap layout={ride.seat_layout} statusOf={statusOf} onPress={toggleSeat} />
        </View>

        <SeatLegend items={['available', 'selected', 'booked', 'pending', 'offline']} />

        <View style={{ height: isDriver ? 40 : 120 }} />

        {isDriver && ride.status === 'published' && (
          <TouchableOpacity style={styles.cancelRideBtn} onPress={cancelRide} testID="cancel-ride-btn">
            <Feather name="x-circle" size={16} color="#B91C1C" />
            <Text style={styles.cancelRideTxt}>Cancel this ride</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {!isDriver && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <View>
            <Text style={styles.footerPrice}>₹{total.toLocaleString('en-IN')}</Text>
            <Text style={styles.footerMeta}>{selected.length} seat{selected.length === 1 ? '' : 's'} selected</Text>
          </View>
          <TouchableOpacity
            style={[styles.bookBtn, (selected.length === 0 || submitting) && styles.bookBtnDisabled]}
            onPress={request}
            disabled={selected.length === 0 || submitting}
            testID="request-btn"
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <>
              <Text style={styles.bookBtnTxt}>Send Request</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 20 },
  loader: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  dateTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  routeTxt: { fontFamily: fonts.heading, fontSize: 30, color: colors.textPrimary, letterSpacing: -0.8, marginBottom: 18 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 },
  vehicleIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  vehicleType: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  vehicleNumber: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  driverLine: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  priceLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary, textAlign: 'right' },
  priceValue: { fontFamily: fonts.heading, fontSize: 22, color: colors.textPrimary },
  availRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 22 },
  availHeading: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  availCount: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 14, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerPrice: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary },
  footerMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  bookBtn: { backgroundColor: colors.green, paddingHorizontal: 22, paddingVertical: 14, borderRadius: radii.full, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookBtnDisabled: { backgroundColor: '#9CA3AF' },
  bookBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 14 },
  cancelRideBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingVertical: 13, borderWidth: 1, borderColor: '#FECACA', borderRadius: radii.full, backgroundColor: '#FEF2F2' },
  cancelRideTxt: { color: '#B91C1C', fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
