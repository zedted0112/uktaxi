import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { Ride } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useRides } from '../../src/hooks/useRides';
import { Badge } from '../../src/components/Badge';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';

export default function MyRides() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { rides, loading, refreshing, onRefresh } = useRides(
    user ? { driver_phone: user.phone } : {},
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="my-rides-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heading}>My Rides</Text>
        <Text style={styles.subheading}>Rides you have published</Text>

        {loading ? <LoadingSpinner /> :
         rides.length === 0 ? (
          <EmptyState
            icon="car-off"
            title="No rides yet"
            subtitle="Publish your first ride to get started"
            actionLabel="Publish Ride"
            onAction={() => router.push('/(driver)/publish')}
          />
         ) : rides.map(r => (
            <TouchableOpacity key={r.id} style={styles.card} onPress={() => router.push(`/ride/${r.id}`)} testID={`my-ride-${r.id}`}>
              <View style={styles.top}>
                <Text style={styles.date}>{r.date} • {r.depart_time}</Text>
                <Badge status={r.status} />
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
        ))}
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
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  city: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  arrow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  arrowLine: { flex: 1, height: 1, backgroundColor: colors.border },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  price: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
});
