import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, radii } from '../../src/theme';
import { useAuth } from '../../src/auth';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const confirmLogout = () => {
    Alert.alert('Sign out?', 'You will need to login again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const rows: { icon: any; label: string; testID: string }[] = [
    { icon: 'user', label: 'Personal Details', testID: 'profile-personal' },
    { icon: 'bell', label: 'Notifications', testID: 'profile-notifications' },
    { icon: 'credit-card', label: 'Payment Methods', testID: 'profile-payment' },
    { icon: 'help-circle', label: 'Help & Support', testID: 'profile-help' },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="profile-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Profile</Text>

        <View style={styles.userCard}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/16702626/pexels-photo-16702626.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200' }}
            style={styles.avatar}
          />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
            <View style={styles.tag}>
              <Text style={styles.tagTxt}>PASSENGER</Text>
            </View>
          </View>
        </View>

        <View style={styles.list}>
          {rows.map((r, i) => (
            <TouchableOpacity key={r.testID} style={[styles.row, i < rows.length - 1 && styles.rowBorder]} testID={r.testID}>
              <View style={styles.rowIcon}>
                <Feather name={r.icon} size={18} color={colors.textPrimary} />
              </View>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} testID="logout-btn">
          <Feather name="log-out" size={16} color="#B91C1C" />
          <Text style={styles.logoutTxt}>Sign Out / Switch Account</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoHeading}>UKTaxi</Text>
          <Text style={styles.infoTxt}>
            A cooperative of licensed private taxi operators serving Uttarkashi, Dehradun & Rishikesh.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 36, color: colors.textPrimary, letterSpacing: -1, marginBottom: 22 },
  userCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.borderSoft },
  userName: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  userPhone: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  tag: { alignSelf: 'flex-start', backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full, marginTop: 8 },
  tagTxt: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.greenDark, letterSpacing: 0.8 },
  list: { backgroundColor: colors.surface, borderRadius: radii.xl, marginTop: 20, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#FECACA',
    borderRadius: radii.full, backgroundColor: '#FEF2F2',
  },
  logoutTxt: { color: '#B91C1C', fontFamily: fonts.bodySemiBold, fontSize: 14 },
  infoCard: { marginTop: 22, padding: 18, borderRadius: radii.lg, backgroundColor: colors.greenLight },
  infoHeading: { fontFamily: fonts.heading, fontSize: 18, color: colors.greenDark },
  infoTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.greenDark, marginTop: 6, lineHeight: 18 },
});
