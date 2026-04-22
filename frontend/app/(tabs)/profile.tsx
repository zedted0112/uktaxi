import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radii } from '../../src/theme';
import { DEMO_USER } from '../../src/api';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const rows: { icon: any; label: string; onPress?: () => void; testID: string; iconLib?: 'feather' | 'mcc' }[] = [
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
            source={{
              uri: 'https://images.pexels.com/photos/16702626/pexels-photo-16702626.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200',
            }}
            style={styles.avatar}
          />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.userName}>{DEMO_USER.name}</Text>
            <Text style={styles.userPhone}>{DEMO_USER.phone}</Text>
            <View style={styles.demoTag}>
              <Text style={styles.demoTagTxt}>DEMO ACCOUNT</Text>
            </View>
          </View>
        </View>

        {/* Driver Portal banner */}
        <TouchableOpacity
          style={styles.driverBanner}
          onPress={() => router.push('/driver')}
          activeOpacity={0.9}
          testID="driver-portal-btn"
        >
          <View style={styles.driverIconBox}>
            <MaterialCommunityIcons name="steering" size={22} color={colors.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverTitle}>Driver Portal</Text>
            <Text style={styles.driverSub}>Confirm passenger bookings</Text>
          </View>
          <Feather name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.list}>
          {rows.map((r, i) => (
            <TouchableOpacity
              key={r.testID}
              style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
              testID={r.testID}
            >
              <View style={styles.rowIcon}>
                <Feather name={r.icon} size={18} color={colors.textPrimary} />
              </View>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoHeading}>Uttarkashi Taxi Union</Text>
          <Text style={styles.infoTxt}>
            A registered cooperative of licensed private taxi operators serving Uttarkashi, Dehradun & Rishikesh. All
            bookings are direct with verified union drivers.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 36, color: colors.textPrimary, letterSpacing: -1, marginBottom: 24 },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.borderSoft },
  userName: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  userPhone: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  demoTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginTop: 8,
  },
  demoTagTxt: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.greenDark, letterSpacing: 0.8 },
  driverBanner: {
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
  },
  driverIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverTitle: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 15 },
  driverSub: { color: '#9CA3AF', fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  infoCard: {
    marginTop: 24,
    padding: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.greenLight,
  },
  infoHeading: { fontFamily: fonts.heading, fontSize: 18, color: colors.greenDark },
  infoTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.greenDark, marginTop: 6, lineHeight: 18 },
});
