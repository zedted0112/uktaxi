import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api, Booking } from '../../src/api';

const BACKEND_TO_DISPLAY: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 };

export default function Ticket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBooking(id).then((b) => { setBooking(b); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading || !booking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  const displaySeats = booking.seat_numbers.map(s => BACKEND_TO_DISPLAY[s] ?? s).join(', ');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="ticket-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/bookings')}
            style={styles.backBtn}
            testID="ticket-back-btn"
          >
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Ticket</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.dateTxt}>{booking.date} • {booking.depart_time}</Text>
        <Text style={styles.routeTxt}>{booking.from_city} — {booking.to_city}</Text>

        {/* The signature black ticket card */}
        <View style={styles.ticket}>
          {/* top notches */}
          <View style={styles.notchLeft} />
          <View style={styles.notchRight} />

          {/* Passenger */}
          <Text style={styles.label}>Passenger</Text>
          <Text style={styles.name}>{booking.user_name}</Text>

          {/* Timeline */}
          <View style={styles.timelineRow}>
            <Text style={styles.timeTxt}>{booking.depart_time}</Text>
            <Text style={styles.durationTxt}>{booking.duration}</Text>
            <Text style={styles.timeTxt}>{booking.arrive_time}</Text>
          </View>
          <View style={styles.timelineBar}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineLineWhite} />
            <MaterialCommunityIcons name="car-side" size={16} color="#fff" />
            <View style={styles.timelineLineDashed} />
            <View style={styles.timelineDot} />
          </View>
          <View style={styles.timelineRow}>
            <View>
              <Text style={styles.city}>{booking.from_city}</Text>
              <Text style={styles.stand}>{booking.from_stand}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.city}>{booking.to_city}</Text>
              <Text style={styles.stand}>{booking.to_stand}</Text>
            </View>
          </View>

          {/* Booking reference */}
          <View style={styles.divDashed} />
          <Text style={styles.label}>Booking Reference</Text>
          <Text style={styles.ref} testID="ticket-ref">{booking.booking_ref}</Text>

          {/* Details grid */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Vehicle</Text>
              <Text style={styles.gridVal}>{booking.vehicle_number}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.gridVal} numberOfLines={1}>{booking.vehicle_type}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Seat(s)</Text>
              <Text style={styles.gridVal}>{displaySeats}</Text>
            </View>
          </View>

          {/* Barcode */}
          <View style={styles.divDashed} />
          <View style={styles.barcodeWrap}>
            <Image
              source={{ uri: barcodeDataUri }}
              style={styles.barcode}
              resizeMode="stretch"
            />
            <Text style={styles.barcodeTxt}>{booking.booking_ref}</Text>
          </View>

          {/* bottom notches */}
          <View style={styles.notchLeftBottom} />
          <View style={styles.notchRightBottom} />
        </View>

        {/* Status & driver */}
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusLabel}>Status</Text>
            <Text
              style={[
                styles.statusValue,
                { color: booking.status === 'confirmed' ? colors.greenDark : '#B45309' },
              ]}
              testID="ticket-status"
            >
              {booking.status === 'confirmed' ? 'Confirmed by Driver' : 'Awaiting Driver Confirmation'}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={booking.status === 'confirmed' ? 'check-circle' : 'clock-outline'}
            size={26}
            color={booking.status === 'confirmed' ? colors.greenDark : '#B45309'}
          />
        </View>

        <View style={styles.driverCard}>
          <View style={styles.driverAv}>
            <Feather name="user" size={18} color={colors.greenDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverLabel}>Driver</Text>
            <Text style={styles.driverName}>{booking.driver_name}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn} testID="call-driver">
            <Feather name="phone" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Paid</Text>
          <Text style={styles.totalValue}>₹{booking.total_price.toLocaleString('en-IN')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Simple SVG-ish barcode rendered as data URI (horizontal bars PNG). We'll use a 1x1 solid image
// and rely on styling instead. For realism, use a placeholder barcode image from unsplash? Easier: inline SVG.
const barcodeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='60' viewBox='0 0 300 60'>
${Array.from({ length: 60 }).map((_, i) => {
  const x = i * 5;
  const w = [1, 2, 3, 1, 2][i % 5];
  return `<rect x='${x}' y='0' width='${w}' height='60' fill='#fff'/>`;
}).join('')}
</svg>`;
const barcodeDataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(barcodeSvg);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  scroll: { paddingHorizontal: 24, paddingBottom: 50 },
  loader: { flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 22 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 15 },
  dateTxt: { fontFamily: fonts.body, fontSize: 12, color: '#9CA3AF' },
  routeTxt: { fontFamily: fonts.heading, fontSize: 32, color: '#fff', letterSpacing: -1, marginTop: 4, marginBottom: 22 },
  ticket: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 26,
    position: 'relative',
    overflow: 'hidden',
  },
  notchLeft: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.black, left: -12, top: '54%' },
  notchRight: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.black, right: -12, top: '54%' },
  notchLeftBottom: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.black, left: -12, top: '82%' },
  notchRightBottom: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.black, right: -12, top: '82%' },
  label: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  name: { fontFamily: fonts.heading, fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5, marginTop: 4, marginBottom: 16 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeTxt: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  durationTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  timelineBar: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.black },
  timelineLineWhite: { flex: 1, height: 1.5, backgroundColor: colors.black, marginHorizontal: 4 },
  timelineLineDashed: { flex: 1, height: 1.5, backgroundColor: colors.border, marginHorizontal: 4 },
  city: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textPrimary },
  stand: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2, maxWidth: 130 },
  divDashed: { height: 1, backgroundColor: colors.border, marginVertical: 18, borderStyle: 'dashed', borderWidth: 0.5, borderColor: colors.border },
  ref: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textPrimary, marginTop: 4, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 8 },
  gridItem: { flex: 1 },
  gridVal: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginTop: 3 },
  barcodeWrap: { alignItems: 'center', marginTop: 4 },
  barcode: { width: '100%', height: 56, backgroundColor: colors.black },
  barcodeTxt: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary, marginTop: 8, letterSpacing: 2 },
  statusCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: radii.lg,
    padding: 16,
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: { fontFamily: fonts.body, color: '#9CA3AF', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusValue: { fontFamily: fonts.bodySemiBold, fontSize: 15, marginTop: 2 },
  driverCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: radii.lg,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  driverAv: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: colors.greenLight,
    alignItems: 'center', justifyContent: 'center',
  },
  driverLabel: { fontFamily: fonts.body, color: '#9CA3AF', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  driverName: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 14, marginTop: 2 },
  callBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  totalLabel: { fontFamily: fonts.body, color: '#9CA3AF', fontSize: 13 },
  totalValue: { fontFamily: fonts.heading, color: '#fff', fontSize: 28 },
});
