import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api, Trip, DEMO_USER } from '../../src/api';

/**
 * 7-seater SUV layout:
 *   Seat 1 = driver (disabled)
 *   Row 1 (front passenger): 2
 *   Row 2 (middle, 3 seats): 3, 4, 5
 *   Row 3 (back, 2 seats): 6, 7
 * Total bookable seats = 6 (2..7). total_seats=6 mapped to indexes 1..6 in backend.
 * We map displaySeat -> backendSeat:
 *   displaySeat 2 -> backend 1
 *   displaySeat 3 -> backend 2
 *   displaySeat 4 -> backend 3
 *   displaySeat 5 -> backend 4
 *   displaySeat 6 -> backend 5
 *   displaySeat 7 -> backend 6
 */
const DISPLAY_TO_BACKEND: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 };
const BACKEND_TO_DISPLAY: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 };

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(DEMO_USER.name);
  const [phone, setPhone] = useState(DEMO_USER.phone);

  useEffect(() => {
    api.getTrip(id).then((t) => {
      setTrip(t);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, [id]);

  if (loading || !trip) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  const bookedDisplay = trip.booked_seats.map((s) => BACKEND_TO_DISPLAY[s]).filter(Boolean);

  const toggleSeat = (n: number) => {
    if (bookedDisplay.includes(n) || n === 1) return;
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const seatState = (n: number) => {
    if (n === 1) return 'driver';
    if (bookedDisplay.includes(n)) return 'booked';
    if (selected.includes(n)) return 'selected';
    return 'available';
  };

  const total = selected.length * trip.price;

  const book = async () => {
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      const backendSeats = selected.map((s) => DISPLAY_TO_BACKEND[s]);
      const booking = await api.createBooking({
        trip_id: trip.id,
        user_name: name,
        user_phone: phone,
        seat_numbers: backendSeats,
      });
      router.replace(`/ticket/${booking.id}`);
    } catch (e: any) {
      Alert.alert('Booking failed', e?.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSeat = (n: number) => {
    const state = seatState(n);
    const boxStyle =
      state === 'selected' ? styles.seatSelected :
      state === 'booked' ? styles.seatBooked :
      state === 'driver' ? styles.seatDriver : styles.seatAvailable;
    const textStyle =
      state === 'selected' ? styles.seatTxtSelected :
      state === 'booked' ? styles.seatTxtBooked :
      state === 'driver' ? styles.seatTxtDriver : styles.seatTxtAvailable;
    return (
      <TouchableOpacity
        key={`seat-${n}`}
        onPress={() => toggleSeat(n)}
        style={[styles.seat, boxStyle]}
        disabled={state === 'booked' || state === 'driver'}
        testID={`seat-${n}`}
      >
        {state === 'driver' ? (
          <MaterialCommunityIcons name="steering" size={18} color="#6B7280" />
        ) : (
          <Text style={textStyle}>{n}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]} testID="trip-detail-screen">
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <Feather name="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose a Seat</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.dateTxt}>{trip.date} • {trip.depart_time}</Text>
        <Text style={styles.routeTxt}>{trip.from_city} — {trip.to_city}</Text>

        {/* Vehicle info card */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIconBox}>
            <MaterialCommunityIcons name="car-estate" size={24} color={colors.greenDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleType}>{trip.vehicle_type}</Text>
            <Text style={styles.vehicleNumber}>{trip.vehicle_number}</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>per seat</Text>
            <Text style={styles.priceValue}>₹{trip.price}</Text>
          </View>
        </View>

        {/* Seats available indicator */}
        <View style={styles.availRow}>
          <Text style={styles.availHeading}>
            {trip.vehicle_type.split(' ')[0]} Seating
          </Text>
          <Text style={styles.availCount} testID="detail-seats-left">
            {trip.seats_left}/{trip.total_seats} available
          </Text>
        </View>

        {/* Seat map */}
        <View style={styles.seatContainer}>
          <View style={styles.row}>
            {renderSeat(1)}
            <View style={{ width: 40 }} />
            {renderSeat(2)}
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            {renderSeat(3)}
            {renderSeat(4)}
            {renderSeat(5)}
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <View style={{ width: 50 }} />
            {renderSeat(6)}
            {renderSeat(7)}
            <View style={{ width: 50 }} />
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.surface, borderColor: colors.border }]} />
            <Text style={styles.legendTxt}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.green, borderColor: colors.green }]} />
            <Text style={styles.legendTxt}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F3F4F6', borderColor: colors.border }]} />
            <Text style={styles.legendTxt}>Booked</Text>
          </View>
        </View>

        {/* Passenger details */}
        <Text style={styles.sectionHeading}>Passenger Details</Text>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.textMuted}
            testID="input-name"
          />
          <View style={styles.inputDivider} />
          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91..."
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
            testID="input-phone"
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={styles.footerPrice}>₹{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.footerMeta} testID="selected-count">
            {selected.length} seat{selected.length === 1 ? '' : 's'} selected
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, (selected.length === 0 || submitting) && styles.bookBtnDisabled]}
          disabled={selected.length === 0 || submitting}
          onPress={book}
          testID="book-btn"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.bookBtnTxt}>Book Now</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 20 },
  loader: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  dateTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  routeTxt: { fontFamily: fonts.heading, fontSize: 30, color: colors.textPrimary, letterSpacing: -0.8, marginBottom: 20 },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  vehicleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleType: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  vehicleNumber: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  priceLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary },
  priceValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  availRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24 },
  availHeading: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  availCount: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  seatContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 22,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', gap: 12 },
  rowDivider: { height: 16 },
  seat: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  seatAvailable: { backgroundColor: colors.surface, borderColor: colors.border },
  seatSelected: { backgroundColor: colors.green, borderColor: colors.green },
  seatBooked: { backgroundColor: '#F3F4F6', borderColor: colors.border, opacity: 0.7 },
  seatDriver: { backgroundColor: colors.borderSoft, borderColor: colors.border },
  seatTxtAvailable: { fontFamily: fonts.bodySemiBold, color: colors.textPrimary, fontSize: 14 },
  seatTxtSelected: { fontFamily: fonts.bodyBold, color: '#fff', fontSize: 14 },
  seatTxtBooked: { fontFamily: fonts.bodyMedium, color: colors.textMuted, fontSize: 14, textDecorationLine: 'line-through' },
  seatTxtDriver: { fontFamily: fonts.bodySemiBold, color: colors.textMuted, fontSize: 12 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  legendTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  sectionHeading: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, marginTop: 28, marginBottom: 10 },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary, paddingVertical: 8 },
  inputDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 6 },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerPrice: { fontFamily: fonts.heading, fontSize: 26, color: colors.textPrimary },
  footerMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  bookBtn: {
    backgroundColor: colors.green,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookBtnDisabled: { backgroundColor: '#9CA3AF' },
  bookBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
