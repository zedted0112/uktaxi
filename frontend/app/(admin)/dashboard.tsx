import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { colors, fonts, radii, spacing } from '../../src/theme';

// ─── Stat Card with icon ──────────────────────────────────────────────────────
function StatCard({ icon, iconBg, value, label, sub }: {
  icon: string; iconBg: string; value: number; label: string; sub: string;
}) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIconWrap, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color="#fff" />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

// ─── Passenger row ────────────────────────────────────────────────────────────
function PassengerRow({ p }: { p: any }) {
  return (
    <View style={s.passengerRow}>
      <View style={[s.seatBadge, p.is_online ? s.seatBadgeOnline : s.seatBadgeOffline]}>
        <Text style={s.seatBadgeText}>{p.seat_number}</Text>
      </View>
      <View style={s.passengerInfo}>
        <Text style={[s.passengerName, !p.is_online && s.offlineNameText]}>{p.name}</Text>
        {p.phone ? <Text style={s.passengerPhone}>{p.phone}</Text> : null}
      </View>
      <View style={[s.typePill, p.is_online ? s.onlinePill : s.offlinePill]}>
        <View style={[s.typeDot, { backgroundColor: p.is_online ? colors.green : colors.textMuted }]} />
        <Text style={[s.typePillText, !p.is_online && { color: colors.textMuted }]}>
          {p.is_online ? 'Online' : 'Offline'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { signOut, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sr, rr] = await Promise.all([api.adminStats(), api.adminRides(selectedDate)]);
      setStats(sr);
      setRides(rr.rides);
    } catch (e) { console.error('Admin fetch failed', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(true); };

  // Date navigation helpers
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const formatDateDisplay = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (loading && !stats) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={s.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Dashboard</Text>
          <Text style={s.headerSub}>Welcome, {user?.name || 'Admin'}</Text>
        </View>
        <TouchableOpacity style={s.signOutBtn} onPress={signOut} activeOpacity={0.7}>
          <Feather name="log-out" size={15} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatCard icon="check-circle-outline" iconBg={colors.greenDark} value={stats?.completed_rides_today || 0} label="Completed" sub="Rides today" />
          <StatCard icon="access-point" iconBg="#3B82F6" value={stats?.total_online_seats_today || 0} label="Online" sub="Seats today" />
          <StatCard icon="account-outline" iconBg="#F59E0B" value={stats?.total_offline_seats_today || 0} label="Offline" sub="Seats today" />
        </View>

        {/* ── Date Navigator ── */}
        <View style={s.dateNav}>
          <TouchableOpacity onPress={() => shiftDate(-1)} style={s.dateArrow} activeOpacity={0.6}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => !isToday && setSelectedDate(new Date().toISOString().split('T')[0])} activeOpacity={0.7}>
            <View style={s.datePill}>
              <Feather name="calendar" size={14} color={colors.greenDark} />
              <Text style={s.dateText}>{isToday ? 'Today' : formatDateDisplay(selectedDate)}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => shiftDate(1)} style={s.dateArrow} activeOpacity={0.6} disabled={isToday}>
            <Feather name="chevron-right" size={20} color={isToday ? colors.textMuted : colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Section Title ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Rides</Text>
          <Text style={s.sectionCount}>{rides.length} {rides.length === 1 ? 'ride' : 'rides'}</Text>
        </View>

        {/* ── Rides ── */}
        {rides.length === 0 ? (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="car-off" size={40} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No rides found</Text>
            <Text style={s.emptyDesc}>There are no rides for {isToday ? 'today' : formatDateDisplay(selectedDate)}</Text>
          </View>
        ) : (
          rides.map((ride) => {
            const expanded = expandedRideId === ride.ride_id;
            const totalSeats = ride.online_seats_count + ride.offline_seats_count;
            return (
              <TouchableOpacity
                key={ride.ride_id} style={s.rideCard} activeOpacity={0.85}
                onPress={() => setExpandedRideId(expanded ? null : ride.ride_id)}
              >
                {/* Status accent bar */}
                <View style={[s.rideAccent, ride.status === 'completed' ? s.accentGreen : ride.status === 'departed' ? s.accentBlue : s.accentGray]} />

                <View style={s.rideBody}>
                  {/* Top row */}
                  <View style={s.rideTopRow}>
                    <View style={s.vehicleBadge}>
                      <MaterialCommunityIcons name="car-estate" size={14} color={colors.greenDark} />
                      <Text style={s.vehicleText}>{ride.vehicle_number}</Text>
                    </View>
                    <View style={[s.statusPill,
                      ride.status === 'completed' && { backgroundColor: colors.greenLight },
                      ride.status === 'departed' && { backgroundColor: '#DBEAFE' },
                      ride.status === 'cancelled' && { backgroundColor: '#FEE2E2' },
                    ]}>
                      <Text style={[s.statusText,
                        ride.status === 'completed' && { color: colors.greenDark },
                        ride.status === 'departed' && { color: '#2563EB' },
                        ride.status === 'cancelled' && { color: '#DC2626' },
                      ]}>{ride.status}</Text>
                    </View>
                  </View>

                  {/* Driver */}
                  <View style={s.driverRow}>
                    <View style={s.driverAvatar}>
                      <MaterialCommunityIcons name="steering" size={14} color="#fff" />
                    </View>
                    <View>
                      <Text style={s.driverName}>{ride.driver_name}</Text>
                      <Text style={s.driverPhone}>{ride.driver_phone}</Text>
                    </View>
                  </View>

                  {/* Time */}
                  <View style={s.timeRow}>
                    <View style={s.timeBlock}>
                      <Text style={s.timeLabel}>DEPART</Text>
                      <Text style={s.timeValue}>{ride.depart_time}</Text>
                    </View>
                    <View style={s.timeLine}>
                      <View style={s.timeDot} />
                      <View style={s.timeDash} />
                      <View style={s.timeDot} />
                    </View>
                    <View style={[s.timeBlock, { alignItems: 'flex-end' }]}>
                      <Text style={s.timeLabel}>ARRIVE</Text>
                      <Text style={s.timeValue}>{ride.arrive_time}</Text>
                    </View>
                  </View>

                  {/* Seat summary */}
                  <View style={s.seatSummary}>
                    <View style={s.seatChip}>
                      <View style={[s.seatChipDot, { backgroundColor: '#3B82F6' }]} />
                      <Text style={s.seatChipText}>{ride.online_seats_count} online</Text>
                    </View>
                    <View style={s.seatChip}>
                      <View style={[s.seatChipDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={s.seatChipText}>{ride.offline_seats_count} offline</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                  </View>
                </View>

                {/* Expanded passengers */}
                {expanded && (
                  <View style={s.passengersWrap}>
                    <Text style={s.passengersTitle}>
                      Passengers · {ride.passengers.length} of {totalSeats} seats
                    </Text>
                    {ride.passengers.length === 0 ? (
                      <Text style={s.noPax}>No passenger records yet.</Text>
                    ) : (
                      ride.passengers.map((p: any, i: number) => <PassengerRow key={i} p={p} />)
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 12 },
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: 26, color: colors.textPrimary },
  headerSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  signOutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center',
  },

  scroll: { padding: 20, paddingBottom: 50 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: radii.lg, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.borderSoft,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  statValue: { fontFamily: fonts.heading, fontSize: 28, color: colors.textPrimary, lineHeight: 32 },
  statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textPrimary, marginTop: 2 },
  statSub: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginTop: 1 },

  // Date nav
  dateNav: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 24,
  },
  dateArrow: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.greenLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.full,
  },
  dateText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.greenDark },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  sectionCount: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },

  // Empty
  emptyState: {
    alignItems: 'center', paddingVertical: 48, backgroundColor: '#fff',
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft,
  },
  emptyTitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.textPrimary, marginTop: 12 },
  emptyDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 4 },

  // Ride card
  rideCard: {
    backgroundColor: '#fff', borderRadius: radii.lg, marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderSoft,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  rideAccent: { height: 3 },
  accentGreen: { backgroundColor: colors.green },
  accentBlue: { backgroundColor: '#3B82F6' },
  accentGray: { backgroundColor: colors.border },
  rideBody: { padding: 16 },

  // Top row
  rideTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vehicleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.greenLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm,
  },
  vehicleText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.greenDark },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.full, backgroundColor: colors.bg },
  statusText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },

  // Driver
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  driverAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.black,
    justifyContent: 'center', alignItems: 'center',
  },
  driverName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  driverPhone: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  // Time
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  timeBlock: { flex: 1 },
  timeLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.textMuted, letterSpacing: 0.8 },
  timeValue: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary, marginTop: 2 },
  timeLine: { flexDirection: 'row', alignItems: 'center', gap: 0, marginHorizontal: 12, flex: 1 },
  timeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  timeDash: { flex: 1, height: 1.5, backgroundColor: colors.border, marginHorizontal: 2 },

  // Seat summary
  seatSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  seatChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  seatChipDot: { width: 7, height: 7, borderRadius: 4 },
  seatChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },

  // Passengers
  passengersWrap: { padding: 16, backgroundColor: '#FAFBFA', borderTopWidth: 1, borderTopColor: colors.borderSoft },
  passengersTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 12 },
  noPax: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  passengerRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    backgroundColor: '#fff', padding: 10, borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  seatBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  seatBadgeOnline: { backgroundColor: '#3B82F6' },
  seatBadgeOffline: { backgroundColor: colors.textMuted },
  seatBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: '#fff' },
  passengerInfo: { flex: 1 },
  passengerName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  offlineNameText: { color: colors.textMuted, fontStyle: 'italic' },
  passengerPhone: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
  onlinePill: { backgroundColor: '#EFF6FF' },
  offlinePill: { backgroundColor: '#F3F4F6' },
  typeDot: { width: 5, height: 5, borderRadius: 3 },
  typePillText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: '#3B82F6' },
});
