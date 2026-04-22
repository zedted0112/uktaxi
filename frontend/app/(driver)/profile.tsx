import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../../src/theme';
import { useAuth } from '../../src/auth';
import { SeatMap } from '../../src/SeatMap';

export default function DriverProfile() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const confirmLogout = () =>
    Alert.alert('Sign out?', 'You will need to login again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="driver-profile">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Driver Profile</Text>

        <View style={styles.userCard}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/16702626/pexels-photo-16702626.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200' }}
            style={styles.avatar}
          />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
            <View style={styles.tag}><Text style={styles.tagTxt}>DRIVER</Text></View>
          </View>
        </View>

        <View style={styles.vehicleCard}>
          <View style={styles.vIconBox}>
            <MaterialCommunityIcons name="car-estate" size={22} color={colors.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vLabel}>My Vehicle</Text>
            <Text style={styles.vName}>{user?.vehicle_type || 'Not set'}</Text>
            <Text style={styles.vNum}>{user?.vehicle_number || ''}</Text>
            {user?.total_seats != null && (
              <View style={styles.vPill}>
                <MaterialCommunityIcons name="car-seat" size={12} color={colors.greenDark} />
                <Text style={styles.vPillTxt}>{user.total_seats} seats</Text>
              </View>
            )}
          </View>
        </View>

        {user?.seat_layout && (
          <View style={styles.layoutPreview}>
            <Text style={styles.layoutTitle}>Seat Layout</Text>
            <SeatMap
              layout={user.seat_layout}
              statusOf={() => 'available'}
              compact
            />
          </View>
        )}

        <View style={styles.list}>
          {[
            { i: 'user', l: 'Personal Details' },
            { i: 'credit-card', l: 'Earnings' },
            { i: 'bell', l: 'Notifications' },
            { i: 'help-circle', l: 'Help & Support' },
          ].map((r, idx, arr) => (
            <TouchableOpacity key={r.l} style={[styles.row, idx < arr.length - 1 && styles.rowBorder]} testID={`dp-${r.i}`}>
              <View style={styles.rowIcon}><Feather name={r.i as any} size={18} color={colors.textPrimary} /></View>
              <Text style={styles.rowLabel}>{r.l}</Text>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} testID="driver-logout">
          <Feather name="log-out" size={16} color="#B91C1C" />
          <Text style={styles.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 34, color: colors.textPrimary, letterSpacing: -1, marginBottom: 22 },
  userCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.borderSoft },
  userName: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  userPhone: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  tag: { alignSelf: 'flex-start', backgroundColor: colors.black, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full, marginTop: 8 },
  tagTxt: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: '#fff', letterSpacing: 0.8 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radii.xl, padding: 16, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  vIconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  vLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  vName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginTop: 2 },
  vNum: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  vPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full, marginTop: 6 },
  vPillTxt: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.greenDark, letterSpacing: 0.3 },
  layoutPreview: { marginTop: 14 },
  layoutTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { backgroundColor: colors.surface, borderRadius: radii.xl, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#FECACA', borderRadius: radii.full, backgroundColor: '#FEF2F2' },
  logoutTxt: { color: '#B91C1C', fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
