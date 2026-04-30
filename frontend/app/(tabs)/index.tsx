import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { Ride } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useRides } from '../../src/hooks/useRides';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { formatDate } from '../../src/utils/date';

const ROUTES = [
  { from: 'Uttarkashi', to: 'Dehradun' },
  { from: 'Dehradun', to: 'Uttarkashi' },
  { from: 'Uttarkashi', to: 'Rishikesh' },
  { from: 'Rishikesh', to: 'Uttarkashi' },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [routeIdx, setRouteIdx] = useState(0);

  const { from, to } = ROUTES[routeIdx];
  const { rides, loading, refreshing, onRefresh } = useRides({ from_city: from, to_city: to });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="home-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.userRow}>
            <Image
              source={{ uri: 'https://images.pexels.com/photos/16702626/pexels-photo-16702626.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=120&w=120' }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.welcomeTxt}>Welcome back</Text>
              <Text style={styles.userTxt}>{user?.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} testID="notifications-btn">
            <Feather name="bell" size={18} color={colors.black} />
          </TouchableOpacity>
        </View>

        <Text style={styles.heading}>Find a Taxi</Text>
        <Text style={styles.subheading}>Rides published by UKTaxi drivers</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
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

        <View style={styles.routeCard}>
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
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Published Rides</Text>
          <View style={styles.filterBtn}>
            <Feather name="calendar" size={13} color={colors.textSecondary} />
            <Text style={styles.filterTxt}>All dates</Text>
          </View>
        </View>

        {loading ? (
          <LoadingSpinner />
        ) : rides.length === 0 ? (
          <EmptyState
            icon="car-off"
            title="No rides published yet"
            subtitle="Pull to refresh or try another route"
          />
        ) : (
          rides.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.rideCard, r.seats_left === 0 && { opacity: 0.6 }]}
              onPress={() => router.push(`/ride/${r.id}`)}
              activeOpacity={0.85}
              disabled={r.seats_left === 0}
              testID={`ride-card-${r.id}`}
            >
              <View style={styles.rideTopRow}>
                <View style={styles.rideBadge}>
                  <MaterialCommunityIcons name="car" size={14} color={colors.greenDark} />
                  <Text style={styles.rideBadgeTxt}>{formatDate(r.date)}</Text>
                </View>
                <Text style={styles.rideVehicle} numberOfLines={1}>{r.vehicle_type}</Text>
              </View>
              <View style={styles.timelineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineTime}>{r.depart_time}</Text>
                  <Text style={styles.timelineCity}>{r.from_city}</Text>
                </View>
                <View style={styles.timelineCenter}>
                  <View style={styles.dot} />
                  <View style={styles.line} />
                  <MaterialCommunityIcons name="car-side" size={16} color={colors.greenDark} />
                  <View style={styles.line} />
                  <View style={styles.dot} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.timelineTime}>{r.arrive_time}</Text>
                  <Text style={styles.timelineCity}>{r.to_city}</Text>
                </View>
              </View>
              <View style={styles.rideBottomRow}>
                <View style={styles.driverInfo}>
                  <Feather name="user" size={11} color={colors.textSecondary} />
                  <Text style={styles.driverTxt}>{r.driver_name}</Text>
                </View>
                <View style={styles.seatsPill}>
                  <MaterialCommunityIcons name="car-seat" size={13} color={colors.greenDark} />
                  <Text style={styles.seatsPillTxt}>{r.seats_left}/{r.total_seats} seats</Text>
                </View>
                <View style={styles.priceBox}>
                  <Text style={styles.priceValue}>₹{r.price}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: colors.borderSoft },
  welcomeTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  userTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  bellBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  heading: { fontFamily: fonts.heading, fontSize: 40, color: colors.textPrimary, letterSpacing: -1.5, marginBottom: 4 },
  subheading: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginBottom: 18 },
  chipsRow: { paddingRight: 24, gap: 8, paddingVertical: 4, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.full, marginRight: 8 },
  chipActive: { backgroundColor: colors.black },
  chipInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipTextActive: { color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextInactive: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 13 },
  routeCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, borderWidth: 1, borderColor: colors.border },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  routeCity: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.textPrimary, marginTop: 2 },
  routeDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 12, marginLeft: 28 },
  dotGreenOutline: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: colors.green, backgroundColor: colors.surface },
  dotGreenFill: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.5 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border },
  filterTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  rideCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  rideTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  rideBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.greenLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  rideBadgeTxt: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.greenDark },
  rideVehicle: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  timelineCenter: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  line: { flex: 1, height: 1.5, backgroundColor: colors.green, marginHorizontal: 4 },
  timelineTime: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  timelineCity: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rideBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 12, gap: 8 },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  driverTxt: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  seatsPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radii.full },
  seatsPillTxt: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.greenDark },
  priceBox: {},
  priceValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
});
