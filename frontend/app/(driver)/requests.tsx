import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../../src/theme';
import { api, BookingRequest } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useRequests } from '../../src/hooks/useRequests';
import { Badge } from '../../src/components/Badge';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

const TABS: { key: BookingRequest['status'] | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'all', label: 'All' },
];

export default function Requests() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<typeof TABS[number]['key']>('pending');

  const { requests: items, loading, refreshing, onRefresh, reload } = useRequests(
    user ? { driver_phone: user.phone } : {},
  );

  const filtered = items.filter(i => tab === 'all' ? true : i.status === tab);
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const confirmedCount = items.filter(i => i.status === 'confirmed').length;

  const act = async (id: string, action: 'confirm' | 'reject') => {
    try {
      if (action === 'confirm') {
        if (!user?.phone) throw new Error('Driver phone not available');
        await api.confirmRequest(id, user.phone);
      }
      else await api.rejectRequest(id);
      reload();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
  };

  const confirm = (b: BookingRequest) => {
    Alert.alert('Confirm booking?', `Confirm ${b.user_name} for seat(s) ${b.seat_numbers.join(', ')}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => act(b.id, 'confirm') },
    ]);
  };
  const reject = (b: BookingRequest) => {
    Alert.alert('Reject booking?', `Reject request from ${b.user_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => act(b.id, 'reject') },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="requests-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heading}>Requests</Text>
        <Text style={styles.subheading}>Incoming booking requests from passengers</Text>

        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: colors.black }]}>
            <Text style={[styles.statLabel, { color: '#9CA3AF' }]}>Pending</Text>
            <Text style={[styles.statVal, { color: '#fff' }]}>{pendingCount}</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.greenLight }]}>
            <Text style={[styles.statLabel, { color: colors.greenDark }]}>Confirmed</Text>
            <Text style={[styles.statVal, { color: colors.greenDark }]}>{confirmedCount}</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
                style={[styles.tab, active && styles.tabActive]} testID={`req-tab-${t.key}`}>
                <Text style={[styles.tabTxt, active && { color: '#fff' }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? <LoadingSpinner /> :
         filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No {tab === 'all' ? '' : tab} requests</Text>
          </View>
         ) : filtered.map(b => (
          <View key={b.id} style={styles.card} testID={`request-${b.id}`}>
            <View style={styles.top}>
              <View>
                <Text style={styles.user}>{b.user_name}</Text>
                <Text style={styles.phone}>{b.user_phone}</Text>
              </View>
              <Badge status={b.status} />
            </View>
            <View style={styles.route}>
              <View><Text style={styles.city}>{b.from_city}</Text><Text style={styles.stand}>{b.depart_time}</Text></View>
              <View style={styles.arrow}><View style={styles.arrowLine} /><MaterialCommunityIcons name="car-side" size={14} color={colors.greenDark} /><View style={styles.arrowLine} /></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={styles.city}>{b.to_city}</Text><Text style={styles.stand}>{b.arrive_time}</Text></View>
            </View>
            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="car-seat" size={12} color={colors.greenDark} />
                <Text style={styles.metaTxt}>Seat {b.seat_numbers.join(', ')}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="calendar" size={11} color={colors.textSecondary} />
                <Text style={styles.metaTxt}>{b.date}</Text>
              </View>
              <Text style={styles.price}>₹{b.total_price}</Text>
            </View>
            {b.status === 'pending' && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(b)} testID={`reject-${b.id}`}>
                  <Feather name="x" size={14} color="#B91C1C" />
                  <Text style={styles.rejectTxt}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => confirm(b)} testID={`confirm-${b.id}`}>
                  <Feather name="check" size={14} color="#fff" />
                  <Text style={styles.confirmTxt}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
  subheading: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 18 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  stat: { flex: 1, borderRadius: radii.lg, padding: 16 },
  statLabel: { fontFamily: fonts.body, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal: { fontFamily: fonts.heading, fontSize: 28, marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.black, borderColor: colors.black },
  tabTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  user: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary },
  phone: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  city: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  stand: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  arrow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  arrowLine: { flex: 1, height: 1, backgroundColor: colors.border },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary },
  price: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginLeft: 'auto' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderWidth: 1, borderColor: '#FECACA', borderRadius: radii.full, backgroundColor: '#FEF2F2' },
  rejectTxt: { color: '#B91C1C', fontFamily: fonts.bodySemiBold, fontSize: 13 },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: radii.full, backgroundColor: colors.green },
  confirmTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginTop: 12 },
});
