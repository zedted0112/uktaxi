import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api, BookingRequest } from '../../src/api';

export default function Ticket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [b, setB] = useState<BookingRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setB(await api.getRequest(id)); } finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cancel = async () => {
    if (!b) return;
    Alert.alert('Cancel booking?', 'Allowed up to 30 min before departure.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: async () => {
        try { const nr = await api.cancelRequest(b.id); setB(nr); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
      }},
    ]);
  };

  if (loading || !b) return (
    <View style={styles.loader}><ActivityIndicator color={colors.green} /></View>
  );

  const statusColor =
    b.status === 'confirmed' ? colors.greenDark :
    b.status === 'pending' ? '#B45309' :
    b.status === 'rejected' ? '#B91C1C' : '#4B5563';
  const statusLabel =
    b.status === 'confirmed' ? 'Confirmed by Driver' :
    b.status === 'pending' ? 'Awaiting Driver Confirmation' :
    b.status === 'rejected' ? 'Rejected by Driver' : 'Cancelled';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="ticket-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="ticket-back">
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Ticket</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.dateTxt}>{b.date} • {b.depart_time}</Text>
        <Text style={styles.routeTxt}>{b.from_city} — {b.to_city}</Text>

        <View style={styles.ticket}>
          <View style={styles.notchL} /><View style={styles.notchR} />
          <Text style={styles.label}>Passenger</Text>
          <Text style={styles.name}>{b.user_name}</Text>

          <View style={styles.timelineRow}>
            <Text style={styles.timeTxt}>{b.depart_time}</Text>
            <Text style={styles.durationTxt}>{b.duration}</Text>
            <Text style={styles.timeTxt}>{b.arrive_time}</Text>
          </View>
          <View style={styles.timelineBar}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineLine} />
            <MaterialCommunityIcons name="car-side" size={16} color={colors.textPrimary} />
            <View style={styles.timelineLine} />
            <View style={styles.timelineDot} />
          </View>
          <View style={styles.timelineRow}>
            <View><Text style={styles.city}>{b.from_city}</Text><Text style={styles.stand}>{b.from_stand}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={styles.city}>{b.to_city}</Text><Text style={styles.stand}>{b.to_stand}</Text></View>
          </View>

          <View style={styles.dash} />
          <Text style={styles.label}>Booking Reference</Text>
          <Text style={styles.ref} testID="ticket-ref">{b.booking_ref}</Text>

          <View style={styles.grid}>
            <View style={styles.gridItem}><Text style={styles.label}>Vehicle</Text><Text style={styles.gridVal}>{b.vehicle_number}</Text></View>
            <View style={styles.gridItem}><Text style={styles.label}>Type</Text><Text style={styles.gridVal} numberOfLines={1}>{b.vehicle_type}</Text></View>
            <View style={styles.gridItem}><Text style={styles.label}>Seat(s)</Text><Text style={styles.gridVal}>{b.seat_numbers.join(', ')}</Text></View>
          </View>
          {(b.guest_passengers?.length || 0) > 0 && (
            <View style={styles.guestSection}>
              <Text style={styles.label}>Guest Passenger(s)</Text>
              {b.guest_passengers?.map((g) => (
                <Text key={`${g.seat_number}-${g.phone}`} style={styles.guestLine}>
                  Seat {g.seat_number}: {g.name} ({g.phone})
                </Text>
              ))}
            </View>
          )}

          <View style={styles.dash} />
          <View style={styles.barcodeWrap}>
            <Image source={{ uri: barcodeUri }} style={styles.barcode} resizeMode="stretch" />
            <Text style={styles.barcodeTxt}>{b.booking_ref}</Text>
          </View>
          <View style={styles.notchLb} /><View style={styles.notchRb} />
        </View>

        <View style={styles.statusCard} testID="ticket-status-card">
          <View>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={[styles.statusValue, { color: statusColor }]} testID="ticket-status">{statusLabel}</Text>
          </View>
          <MaterialCommunityIcons
            name={b.status === 'confirmed' ? 'check-circle' : b.status === 'rejected' ? 'close-circle' : 'clock-outline'}
            size={26}
            color={statusColor}
          />
        </View>

        <View style={styles.driverCard}>
          <View style={styles.driverAv}><Feather name="user" size={18} color={colors.greenDark} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverLabel}>Driver</Text>
            <Text style={styles.driverName}>{b.driver_name}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn}><Feather name="phone" size={16} color="#fff" /></TouchableOpacity>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{b.total_price.toLocaleString('en-IN')}</Text>
        </View>

        {(b.status === 'pending' || b.status === 'confirmed') && (
          <TouchableOpacity style={styles.cancelBtn} onPress={cancel} testID="cancel-ticket-btn">
            <Feather name="x" size={16} color="#fff" />
            <Text style={styles.cancelBtnTxt}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const barcodeSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='60' viewBox='0 0 300 60'>
${Array.from({ length: 60 }).map((_, i) => {
  const x = i * 5; const w = [1, 2, 3, 1, 2][i % 5];
  return `<rect x='${x}' y='0' width='${w}' height='60' fill='#fff'/>`;
}).join('')}</svg>`;
const barcodeUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(barcodeSvg);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  scroll: { paddingHorizontal: 24, paddingBottom: 50 },
  loader: { flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 15 },
  dateTxt: { fontFamily: fonts.body, fontSize: 12, color: '#9CA3AF' },
  routeTxt: { fontFamily: fonts.heading, fontSize: 30, color: '#fff', letterSpacing: -0.8, marginTop: 4, marginBottom: 20 },
  ticket: { backgroundColor: '#fff', borderRadius: 24, padding: 24, position: 'relative', overflow: 'hidden' },
  notchL: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.black, left: -12, top: '54%' },
  notchR: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.black, right: -12, top: '54%' },
  notchLb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.black, left: -12, top: '82%' },
  notchRb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.black, right: -12, top: '82%' },
  label: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  name: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.5, marginTop: 4, marginBottom: 14 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeTxt: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  durationTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  timelineBar: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.black },
  timelineLine: { flex: 1, height: 1.5, backgroundColor: colors.black, marginHorizontal: 4 },
  city: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  stand: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2, maxWidth: 130 },
  dash: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  ref: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textPrimary, marginTop: 4, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 8 },
  gridItem: { flex: 1 },
  gridVal: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginTop: 3 },
  guestSection: { marginTop: 12 },
  guestLine: { fontFamily: fonts.body, fontSize: 12, color: colors.textPrimary, marginTop: 4 },
  barcodeWrap: { alignItems: 'center' },
  barcode: { width: '100%', height: 50, backgroundColor: colors.black },
  barcodeTxt: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary, marginTop: 8, letterSpacing: 2 },
  statusCard: { backgroundColor: '#1f1f1f', borderRadius: radii.lg, padding: 16, marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontFamily: fonts.body, color: '#9CA3AF', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusValue: { fontFamily: fonts.bodySemiBold, fontSize: 14, marginTop: 2 },
  driverCard: { backgroundColor: '#1f1f1f', borderRadius: radii.lg, padding: 16, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverAv: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  driverLabel: { fontFamily: fonts.body, color: '#9CA3AF', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  driverName: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 14, marginTop: 2 },
  callBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  totalLabel: { fontFamily: fonts.body, color: '#9CA3AF', fontSize: 13 },
  totalValue: { fontFamily: fonts.heading, color: '#fff', fontSize: 26 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, paddingVertical: 14, borderRadius: radii.full, backgroundColor: '#7F1D1D' },
  cancelBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
