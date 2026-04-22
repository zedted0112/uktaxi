import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api, Trip } from '../../src/api';

const CITIES = ['Uttarkashi', 'Dehradun', 'Rishikesh'];

export default function Find() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [from, setFrom] = useState('Uttarkashi');
  const [to, setTo] = useState('Dehradun');
  const [passengers, setPassengers] = useState(1);
  const [results, setResults] = useState<Trip[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (from === to) return;
    setLoading(true);
    try {
      const data = await api.listTrips(from, to);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]} testID="find-screen">
        <Text style={styles.heading}>Find a Taxi</Text>
        <Text style={styles.subheading}>Search for available union taxis</Text>

        <View style={styles.card}>
          <Text style={styles.label}>From</Text>
          <View style={styles.citiesRow}>
            {CITIES.map((c) => {
              const active = c === from;
              return (
                <TouchableOpacity
                  key={`from-${c}`}
                  onPress={() => setFrom(c)}
                  style={[styles.cityChip, active && styles.cityChipActive]}
                  testID={`from-${c}`}
                >
                  <Text style={[styles.cityChipTxt, active && styles.cityChipTxtActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 20 }]}>To</Text>
          <View style={styles.citiesRow}>
            {CITIES.map((c) => {
              const active = c === to;
              const disabled = c === from;
              return (
                <TouchableOpacity
                  key={`to-${c}`}
                  onPress={() => !disabled && setTo(c)}
                  style={[
                    styles.cityChip,
                    active && styles.cityChipActive,
                    disabled && styles.cityChipDisabled,
                  ]}
                  testID={`to-${c}`}
                  disabled={disabled}
                >
                  <Text style={[styles.cityChipTxt, active && styles.cityChipTxtActive, disabled && styles.cityChipTxtDisabled]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 20 }]}>Passengers</Text>
          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setPassengers(Math.max(1, passengers - 1))}
              testID="passengers-decrement"
            >
              <Feather name="minus" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.counterTxt} testID="passengers-count">{passengers}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setPassengers(Math.min(6, passengers + 1))}
              testID="passengers-increment"
            >
              <Feather name="plus" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={search} testID="search-btn">
          <Feather name="search" size={18} color="#fff" />
          <Text style={styles.searchBtnTxt}>Search Taxis</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator color={colors.green} style={{ marginTop: 30 }} />}

        {results !== null && !loading && (
          <View style={{ marginTop: 28 }}>
            <Text style={styles.resultsHeading}>
              {results.length} taxi{results.length === 1 ? '' : 's'} found
            </Text>
            {results.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.resultCard}
                onPress={() => router.push(`/trip/${t.id}`)}
                testID={`result-${t.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTime}>
                    {t.depart_time} → {t.arrive_time}
                  </Text>
                  <Text style={styles.resultVehicle}>{t.vehicle_type}</Text>
                  <View style={styles.resultMeta}>
                    <MaterialCommunityIcons name="car-seat" size={12} color={colors.greenDark} />
                    <Text style={styles.resultMetaTxt}>
                      {t.seats_left}/{t.total_seats} seats
                    </Text>
                    <Text style={styles.dot}>•</Text>
                    <Feather name="clock" size={11} color={colors.textSecondary} />
                    <Text style={styles.resultMetaTxt}>{t.duration}</Text>
                  </View>
                </View>
                <View style={styles.resultPrice}>
                  <Text style={styles.resultPriceTxt}>₹{t.price}</Text>
                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 36, color: colors.textPrimary, letterSpacing: -1 },
  subheading: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 20, borderWidth: 1, borderColor: colors.border },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  citiesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.borderSoft,
  },
  cityChipActive: { backgroundColor: colors.black },
  cityChipDisabled: { opacity: 0.35 },
  cityChipTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  cityChipTxtActive: { color: '#fff' },
  cityChipTxtDisabled: { color: colors.textMuted },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterTxt: { fontFamily: fonts.bodySemiBold, fontSize: 18, color: colors.textPrimary, minWidth: 24, textAlign: 'center' },
  searchBtn: {
    backgroundColor: colors.green,
    borderRadius: radii.full,
    paddingVertical: 16,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  searchBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 15 },
  resultsHeading: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, marginBottom: 12 },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultTime: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  resultVehicle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  resultMetaTxt: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  dot: { color: colors.textMuted, fontSize: 12 },
  resultPrice: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultPriceTxt: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
});
