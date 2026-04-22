import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';

const CITIES = ['Uttarkashi', 'Dehradun', 'Rishikesh'];

// generate next 7 dates
function next7(): { iso: string; day: string; date: string }[] {
  const out: { iso: string; day: string; date: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.getDate().toString(),
    });
  }
  return out;
}

const TIMES = [
  { label: '06:30 AM', dep: '06:30 AM', arr: '11:30 AM', dur: '5h 00m', ext: '-Dehradun' },
  { label: '08:00 AM', dep: '08:00 AM', arr: '12:30 PM', dur: '4h 30m' },
  { label: '10:00 AM', dep: '10:00 AM', arr: '02:30 PM', dur: '4h 30m' },
  { label: '02:00 PM', dep: '02:00 PM', arr: '07:00 PM', dur: '5h 00m' },
  { label: '04:00 PM', dep: '04:00 PM', arr: '08:30 PM', dur: '4h 30m' },
];

export default function Publish() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const dates = next7();
  const [from, setFrom] = useState('Uttarkashi');
  const [to, setTo] = useState('Dehradun');
  const [date, setDate] = useState(dates[0].iso);
  const [timeIdx, setTimeIdx] = useState(0);
  const [price, setPrice] = useState('450');
  const [seats, setSeats] = useState('6');
  const [loading, setLoading] = useState(false);

  const STANDS: Record<string, string> = {
    Uttarkashi: 'Uttarkashi Bus Stand',
    Dehradun: 'Dehradun ISBT',
    Rishikesh: 'Rishikesh Tapovan',
  };

  const publish = async () => {
    if (!user) return;
    if (from === to) return Alert.alert('Invalid', 'From and To cannot be same');
    const p = parseInt(price, 10);
    const s = parseInt(seats, 10);
    if (isNaN(p) || p <= 0) return Alert.alert('Invalid', 'Price must be a number');
    if (isNaN(s) || s < 1 || s > 8) return Alert.alert('Invalid', 'Seats must be 1-8');
    setLoading(true);
    try {
      const t = TIMES[timeIdx];
      await api.publishRide({
        driver_phone: user.phone,
        from_city: from, to_city: to,
        from_stand: STANDS[from], to_stand: STANDS[to],
        date, depart_time: t.dep, arrive_time: t.arr, duration: t.dur,
        price: p, total_seats: s,
      });
      Alert.alert('Published!', 'Your ride is now visible to users', [
        { text: 'OK', onPress: () => router.push('/(driver)/rides') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
        testID="publish-screen"
      >
        <Text style={styles.heading}>Publish a Ride</Text>
        <Text style={styles.subheading}>Set date, time & price. Users will request seats.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>From</Text>
          <View style={styles.row}>
            {CITIES.map(c => (
              <TouchableOpacity key={`f-${c}`} onPress={() => setFrom(c)}
                style={[styles.chip, from === c && styles.chipActive]} testID={`pub-from-${c}`}>
                <Text style={[styles.chipTxt, from === c && styles.chipTxtActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 18 }]}>To</Text>
          <View style={styles.row}>
            {CITIES.map(c => {
              const dis = c === from;
              return (
                <TouchableOpacity key={`t-${c}`} onPress={() => !dis && setTo(c)} disabled={dis}
                  style={[styles.chip, to === c && styles.chipActive, dis && { opacity: 0.35 }]} testID={`pub-to-${c}`}>
                  <Text style={[styles.chipTxt, to === c && styles.chipTxtActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {dates.map(d => {
            const active = d.iso === date;
            return (
              <TouchableOpacity key={d.iso} onPress={() => setDate(d.iso)}
                style={[styles.dateChip, active && styles.dateChipActive]} testID={`pub-date-${d.iso}`}>
                <Text style={[styles.dateChipDay, active && { color: '#fff' }]}>{d.day}</Text>
                <Text style={[styles.dateChipNum, active && { color: '#fff' }]}>{d.date}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Departure Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 24 }}>
          {TIMES.map((t, i) => {
            const active = timeIdx === i;
            return (
              <TouchableOpacity key={t.label} onPress={() => setTimeIdx(i)}
                style={[styles.timeChip, active && styles.timeChipActive]} testID={`pub-time-${i}`}>
                <Text style={[styles.timeChipTxt, active && { color: '#fff' }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.card, { marginTop: 20 }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Price per Seat (₹)</Text>
              <TextInput value={price} onChangeText={setPrice} keyboardType="number-pad"
                style={styles.input} testID="pub-price" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Total Seats</Text>
              <TextInput value={seats} onChangeText={setSeats} keyboardType="number-pad"
                style={styles.input} testID="pub-seats" />
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <MaterialCommunityIcons name="car-estate" size={18} color="#fff" />
            <Text style={styles.summaryTitle}>{user?.vehicle_type}</Text>
          </View>
          <Text style={styles.summaryNum}>{user?.vehicle_number}</Text>
          <View style={styles.summaryRoute}>
            <Text style={styles.summaryCity}>{from}</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
            <Text style={styles.summaryCity}>{to}</Text>
          </View>
          <Text style={styles.summaryMeta}>{date} • {TIMES[timeIdx].label} • {seats} seats × ₹{price}</Text>
        </View>

        <TouchableOpacity style={[styles.publishBtn, loading && { opacity: 0.6 }]} onPress={publish} disabled={loading} testID="publish-btn">
          {loading ? <ActivityIndicator color="#fff" /> : <>
            <Text style={styles.publishBtnTxt}>Publish Ride</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 34, color: colors.textPrimary, letterSpacing: -1 },
  subheading: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 18 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, borderWidth: 1, borderColor: colors.border },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.full, backgroundColor: colors.borderSoft },
  chipActive: { backgroundColor: colors.black },
  chipTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  chipTxtActive: { color: '#fff' },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, marginBottom: 10 },
  dateRow: { gap: 8, paddingRight: 24 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', minWidth: 56 },
  dateChipActive: { backgroundColor: colors.black, borderColor: colors.black },
  dateChipDay: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  dateChipNum: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginTop: 2 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  timeChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  timeChipTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  input: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12 },
  summaryCard: { backgroundColor: colors.black, borderRadius: radii.xl, padding: 18, marginTop: 22 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#fff' },
  summaryNum: { fontFamily: fonts.body, fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  summaryRoute: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  summaryCity: { fontFamily: fonts.heading, fontSize: 20, color: '#fff' },
  summaryMeta: { fontFamily: fonts.body, fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  publishBtn: { backgroundColor: colors.green, borderRadius: radii.full, paddingVertical: 15, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  publishBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 15 },
});
