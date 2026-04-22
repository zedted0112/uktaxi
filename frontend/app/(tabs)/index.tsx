import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radii, spacing } from '../../src/theme';
import { api, Trip, DEMO_USER } from '../../src/api';

const ROUTES = [
  { from: 'Uttarkashi', to: 'Dehradun' },
  { from: 'Dehradun', to: 'Uttarkashi' },
  { from: 'Uttarkashi', to: 'Rishikesh' },
  { from: 'Rishikesh', to: 'Uttarkashi' },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routeIdx, setRouteIdx] = useState(0);

  const load = useCallback(async () => {
    try {
      const { from, to } = ROUTES[routeIdx];
      const data = await api.listTrips(from, to);
      setTrips(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeIdx]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="home-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userRow}>
            <Image
              source={{
                uri: 'https://images.pexels.com/photos/16702626/pexels-photo-16702626.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=120&w=120',
              }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.welcomeTxt}>Welcome back</Text>
              <Text style={styles.userTxt} testID="home-user-name">{DEMO_USER.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} testID="notifications-btn">
            <Feather name="bell" size={18} color={colors.black} />
          </TouchableOpacity>
        </View>

        {/* Big serif heading */}
        <Text style={styles.heading}>Book a Seat</Text>
        <Text style={styles.subheading}>
          Private taxis by Uttarkashi Taxi Union
        </Text>

        {/* Route selector chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {ROUTES.map((r, i) => {
            const active = i === routeIdx;
            return (
              <TouchableOpacity
                key={`${r.from}-${r.to}`}
                onPress={() => setRouteIdx(i)}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                testID={`route-chip-${i}`}
              >
                <Text style={active ? styles.chipTextActive : styles.chipTextInactive}>
                  {r.from} → {r.to}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* From/To card */}
        <View style={styles.routeCard} testID="route-card">
          <View style={styles.routeRow}>
            <View style={styles.dotGreenOutline} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.routeLabel}>From</Text>
              <Text style={styles.routeCity}>{ROUTES[routeIdx].from}</Text>
            </View>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <View style={styles.dotGreenFill} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.routeLabel}>To</Text>
              <Text style={styles.routeCity}>{ROUTES[routeIdx].to}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.swapBtn} testID="swap-btn" onPress={() => {
            // swap with matching reverse route if exists
            const cur = ROUTES[routeIdx];
            const reverseIdx = ROUTES.findIndex(r => r.from === cur.to && r.to === cur.from);
            if (reverseIdx >= 0) setRouteIdx(reverseIdx);
          }}>
            <Feather name="repeat" size={18} color={colors.greenDark} />
          </TouchableOpacity>
        </View>

        {/* Section heading */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Available Taxis</Text>
          <View style={styles.filterBtn}>
            <Feather name="sliders" size={14} color={colors.textSecondary} />
            <Text style={styles.filterTxt}>Today</Text>
          </View>
        </View>

        {/* Trips */}
        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
        ) : trips.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="car-off" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTxt}>No taxis on this route today</Text>
          </View>
        ) : (
          trips.map((t) => <TripCard key={t.id} trip={t} onPress={() => router.push(`/trip/${t.id}`)} />)
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const soldOut = trip.seats_left === 0;
  return (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={soldOut}
      testID={`trip-card-${trip.id}`}
    >
      <View style={styles.tripTopRow}>
        <View style={styles.tripBadge}>
          <MaterialCommunityIcons name="car" size={14} color={colors.greenDark} />
          <Text style={styles.tripBadgeTxt}>UTK+</Text>
        </View>
        <Text style={styles.tripVehicle} numberOfLines={1}>
          {trip.vehicle_type}
        </Text>
      </View>

      <View style={styles.timelineRow}>
        <View style={styles.timelineSide}>
          <Text style={styles.timelineTime}>{trip.depart_time}</Text>
          <Text style={styles.timelineCity}>{trip.from_city}</Text>
        </View>

        <View style={styles.timelineCenter}>
          <View style={styles.timelineDotGreen} />
          <View style={styles.timelineLine} />
          <MaterialCommunityIcons name="car-side" size={18} color={colors.greenDark} />
          <View style={styles.timelineLineDashed} />
          <View style={styles.timelineDotGreen} />
        </View>

        <View style={[styles.timelineSide, { alignItems: 'flex-end' }]}>
          <Text style={styles.timelineTime}>{trip.arrive_time}</Text>
          <Text style={styles.timelineCity}>{trip.to_city}</Text>
        </View>
      </View>

      <View style={styles.tripBottomRow}>
        <View style={styles.seatsPill}>
          <MaterialCommunityIcons name="car-seat" size={14} color={colors.greenDark} />
          <Text style={styles.seatsPillTxt} testID={`trip-seats-left-${trip.id}`}>
            {trip.seats_left}/{trip.total_seats} seats left
          </Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceCurrency}>₹</Text>
          <Text style={styles.priceValue}>{trip.price}</Text>
          <Text style={styles.priceSuffix}>/seat</Text>
        </View>
      </View>

      {soldOut && (
        <View style={styles.soldOutBanner} testID={`trip-sold-out-${trip.id}`}>
          <Text style={styles.soldOutTxt}>Sold Out</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: colors.borderSoft },
  welcomeTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  userTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 42,
    color: colors.textPrimary,
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  chipsRow: { paddingRight: 24, gap: 8, paddingVertical: 4, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.full, marginRight: 8 },
  chipActive: { backgroundColor: colors.black },
  chipInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipTextActive: { color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextInactive: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 13 },
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  routeCity: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.textPrimary, marginTop: 2 },
  routeDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 14, marginLeft: 28 },
  dotGreenOutline: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: colors.green,
    backgroundColor: colors.surface,
  },
  dotGreenFill: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green },
  swapBtn: {
    position: 'absolute',
    right: 18,
    top: '50%',
    transform: [{ translateY: -18 }],
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.5 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  tripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  tripBadgeTxt: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.greenDark },
  tripVehicle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, flex: 1 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  timelineSide: { flex: 1 },
  timelineCenter: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  timelineDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  timelineLine: { flex: 1, height: 1.5, backgroundColor: colors.green, marginHorizontal: 4 },
  timelineLineDashed: { flex: 1, height: 1.5, backgroundColor: colors.border, marginHorizontal: 4, borderStyle: 'dashed' },
  timelineTime: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.textPrimary },
  timelineCity: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  tripBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 14 },
  seatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  seatsPillTxt: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.greenDark },
  priceBox: { flexDirection: 'row', alignItems: 'baseline' },
  priceCurrency: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  priceValue: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary, marginLeft: 2 },
  priceSuffix: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginLeft: 3 },
  soldOutBanner: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  soldOutTxt: { color: '#B91C1C', fontFamily: fonts.bodySemiBold, fontSize: 11 },
  emptyBox: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTxt: { fontFamily: fonts.body, color: colors.textSecondary, fontSize: 14 },
});
