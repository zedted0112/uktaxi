import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { api, BookingRequest } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useRequests } from '../../src/hooks/useRequests';
import { Badge } from '../../src/components/Badge';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';

export default function Bookings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { requests: items, loading, refreshing, onRefresh, reload } = useRequests(
    user ? { user_phone: user.phone } : {},
  );

  const cancel = async (b: BookingRequest) => {
    Alert.alert('Cancel booking?', `Cancel ${b.booking_ref}? Allowed up to 30 min before departure.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: async () => {
        try { await api.cancelRequest(b.id); reload(); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
      }},
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="bookings-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heading}>My Bookings</Text>
        <Text style={styles.subheading}>Your ride requests & tickets</Text>

        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <EmptyState
            icon="ticket-outline"
            title="No bookings yet"
            subtitle="Find a ride to send your first request"
            actionLabel="Find a Ride"
            onAction={() => router.push('/(tabs)')}
          />
        ) : (
          items.map((b) => {
            return (
              <View key={b.id} style={styles.card} testID={`booking-${b.id}`}>
                <TouchableOpacity onPress={() => router.push(`/ticket/${b.id}`)} activeOpacity={0.85}>
                  <View style={styles.top}>
                    <Text style={styles.ref}>{b.booking_ref}</Text>
                    <Badge status={b.status} showIcon />
                  </View>
                  <View style={styles.route}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.city}>{b.from_city}</Text>
                      <Text style={styles.time}>{b.depart_time}</Text>
                    </View>
                    <View style={styles.arrow}>
                      <View style={styles.arrowLine} />
                      <MaterialCommunityIcons name="car-side" size={16} color={colors.greenDark} />
                      <View style={styles.arrowLine} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.city}>{b.to_city}</Text>
                      <Text style={styles.time}>{b.arrive_time}</Text>
                    </View>
                  </View>
                  <View style={styles.meta}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="car-seat" size={11} color={colors.textSecondary} />
                      <Text style={styles.metaTxt}>Seat {b.seat_numbers.join(', ')}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Feather name="calendar" size={11} color={colors.textSecondary} />
                      <Text style={styles.metaTxt}>{b.date}</Text>
                    </View>
                    <Text style={styles.price}>₹{b.total_price}</Text>
                  </View>
                  {(b.guest_passengers?.length || 0) > 0 && (
                    <Text style={styles.guestTxt}>
                      Guests: {b.guest_passengers?.map(g => `${g.name} (Seat ${g.seat_number})`).join(', ')}
                    </Text>
                  )}
                </TouchableOpacity>
                {(b.status === 'pending' || b.status === 'confirmed') && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(b)} testID={`cancel-${b.id}`}>
                    <Feather name="x" size={13} color="#B91C1C" />
                    <Text style={styles.cancelTxt}>Cancel booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  heading: { fontFamily: fonts.heading, fontSize: 36, color: colors.textPrimary, letterSpacing: -1 },
  subheading: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  ref: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textPrimary },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  city: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  arrow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  arrowLine: { flex: 1, height: 1, backgroundColor: colors.border },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  price: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginLeft: 'auto' },
  guestTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 8 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    marginTop: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#FEE2E2',
    borderRadius: radii.full, backgroundColor: '#FEF2F2',
  },
  cancelTxt: { color: '#B91C1C', fontFamily: fonts.bodySemiBold, fontSize: 12 },
});
