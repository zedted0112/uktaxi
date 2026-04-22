import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api, Ride } from '../../src/api';
import { useAuth } from '../../src/auth';

export default function MyRides() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.listRides({ driver_phone: user.phone });
      setRides(data);
    } finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const statusBadge = (s: Ride['status']) => {
    if (s === 'published') return { bg: colors.greenLight, fg: colors.greenDark, label: 'PUBLISHED' };
    if (s === 'cancelled') return { bg: '#FEE2E2', fg: '#B91C1C', label: 'CANCELLED' };
    return { bg: '#E5E7EB', fg: '#4B5563', label: 'COMPLETED' };
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="my-rides-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <Text style={styles.heading}>My Rides</Text>
        <Text style={styles.subheading}>Rides you have published</Text>

        {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} /> :
         rides.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="car-off" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No rides yet</Text>
            <Text style={styles.emptyTxt}>Publish your first ride to get started</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(driver)/publish')} testID="go-publish">
              <Text style={styles.emptyBtnTxt}>Publish Ride</Text>
            </TouchableOpacity>
          </View>
         ) : rides.map(r => {
          const sb = statusBadge(r.status);
          return (
            <TouchableOpacity key={r.id} style={styles.card} onPress={() => router.push(`/ride/${r.id}`)} testID={`my-ride-${r.id}`}>
              <View style={styles.top}>
                <Text style={styles.date}>{r.date} • {r.depart_time}</Text>
                <View style={[styles.badge, { backgroundColor: sb.bg }]}>
                  <Text style={[styles.badgeTxt, { color: sb.fg }]}>{sb.label}</Text>
                </View>
              </View>
              <View style={styles.route}>
                <View style={{ flex: 1 }}><Text style={styles.city}>{r.from_city}</Text></View>
                <View style={styles.arrow}>
                  <View style={styles.arrowLine} />
                  <MaterialCommunityIcons name="car-side" size={16} color={colors.greenDark} />
                  <View style={styles.arrowLine} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}><Text style={styles.city}>{r.to_city}</Text></View>
              </View>
              <View style={styles.meta}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="car-seat" size={12} color={colors.greenDark} />
                  <Text style={styles.metaTxt}>{r.seats_left}/{r.total_seats} left</Text>
                </View>
                <Text style={styles.price}>₹{r.price}/seat</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 34, color: colors.textPrimary, letterSpacing: -1 },
  subheading: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.full },
  badgeTxt: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.5 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  city: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  arrow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  arrowLine: { flex: 1, height: 1, backgroundColor: colors.border },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  price: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, marginTop: 12 },
  emptyTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 18 },
  emptyBtn: { backgroundColor: colors.green, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radii.full },
  emptyBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
