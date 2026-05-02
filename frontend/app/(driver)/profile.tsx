import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../../src/theme';
import { useAuth } from '../../src/auth';
import { SeatMap } from '../../src/SeatMap';
import { api } from '../../src/api';

export default function DriverProfile() {
  const insets = useSafeAreaInsets();
  const { user, signOut, refresh } = useAuth();
  const [openPersonal, setOpenPersonal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [preferredStand, setPreferredStand] = useState(user?.preferred_taxi_stand || '');
  const [emergencyName, setEmergencyName] = useState(user?.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergency_contact_phone || '');
  const [language, setLanguage] = useState<'en' | 'hi'>((user?.preferred_language as 'en' | 'hi') || 'en');
  const [notifyBooking, setNotifyBooking] = useState(user?.notify_booking_updates ?? true);
  const [notifyPromos, setNotifyPromos] = useState(user?.notify_promotions ?? false);

  const confirmLogout = () =>
    Alert.alert('Sign out?', 'You will need to login again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  const comingSoon = (label: string) =>
    Alert.alert('Coming Soon', `${label} will be available in a later update.`);

  const savePersonal = async () => {
    if (!user?.phone) return;
    if (!name.trim()) return Alert.alert('Missing', 'Please enter your name');
    setSaving(true);
    try {
      await api.updateMe(user.phone, {
        name: name.trim(),
        preferred_taxi_stand: preferredStand.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        preferred_language: language,
        notify_booking_updates: notifyBooking,
        notify_promotions: notifyPromos,
      });
      await refresh();
      Alert.alert('Saved', 'Personal details updated.');
      setOpenPersonal(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save profile details');
    } finally {
      setSaving(false);
    }
  };

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
          <TouchableOpacity
            style={[styles.row, openPersonal && styles.rowBorder]}
            testID="dp-user"
            onPress={() => setOpenPersonal((p) => !p)}
          >
            <View style={styles.rowIcon}><Feather name="user" size={18} color={colors.textPrimary} /></View>
            <Text style={styles.rowLabel}>Personal Details</Text>
            <Feather name={openPersonal ? 'chevron-up' : 'chevron-right'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          {openPersonal && (
            <View style={styles.personalWrap}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} testID="driver-profile-name-input" />
              <Text style={styles.fieldLabel}>Phone (read-only)</Text>
              <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{user?.phone}</Text></View>

              <Text style={styles.fieldLabel}>Vehicle Preset (read-only)</Text>
              <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{user?.vehicle_preset || '—'}</Text></View>
              <Text style={styles.fieldLabel}>Vehicle Number (read-only)</Text>
              <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{user?.vehicle_number || '—'}</Text></View>
              <Text style={styles.fieldLabel}>Driving License (read-only)</Text>
              <View style={styles.readonlyBox}><Text style={styles.readonlyText}>{user?.driving_license || '—'}</Text></View>
              <Text style={styles.readonlyHint}>Need changes? Please request via Help & Support.</Text>

              <Text style={styles.fieldLabel}>Preferred Taxi Stand</Text>
              <TextInput value={preferredStand} onChangeText={setPreferredStand} style={styles.input} testID="driver-profile-stand-input" />
              <Text style={styles.fieldLabel}>Emergency Contact Name</Text>
              <TextInput value={emergencyName} onChangeText={setEmergencyName} style={styles.input} testID="driver-profile-emg-name-input" />
              <Text style={styles.fieldLabel}>Emergency Contact Phone</Text>
              <TextInput value={emergencyPhone} onChangeText={setEmergencyPhone} style={styles.input} keyboardType="phone-pad" testID="driver-profile-emg-phone-input" />

              <Text style={styles.fieldLabel}>Language</Text>
              <View style={styles.langRow}>
                <TouchableOpacity style={[styles.langChip, language === 'en' && styles.langChipActive]} onPress={() => setLanguage('en')} testID="driver-profile-lang-en">
                  <Text style={[styles.langChipTxt, language === 'en' && styles.langChipTxtActive]}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.langChip, language === 'hi' && styles.langChipActive]} onPress={() => setLanguage('hi')} testID="driver-profile-lang-hi">
                  <Text style={[styles.langChipTxt, language === 'hi' && styles.langChipTxtActive]}>Hindi</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Booking Updates</Text>
                <Switch value={notifyBooking} onValueChange={setNotifyBooking} trackColor={{ true: colors.green, false: colors.border }} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Promotional Notifications</Text>
                <Switch value={notifyPromos} onValueChange={setNotifyPromos} trackColor={{ true: colors.green, false: colors.border }} />
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={savePersonal} disabled={saving} testID="driver-profile-save-btn">
                <Text style={styles.saveBtnTxt}>{saving ? 'Saving...' : 'Save Details'}</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={[styles.row, styles.rowBorder]} testID="dp-credit-card" onPress={() => comingSoon('Earnings')}>
            <View style={styles.rowIcon}><Feather name="credit-card" size={18} color={colors.textPrimary} /></View>
            <Text style={styles.rowLabel}>Earnings</Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, styles.rowBorder]} testID="dp-bell" onPress={() => comingSoon('Notifications section')}>
            <View style={styles.rowIcon}><Feather name="bell" size={18} color={colors.textPrimary} /></View>
            <Text style={styles.rowLabel}>Notifications</Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} testID="dp-help-circle" onPress={() => comingSoon('Help & Support')}>
            <View style={styles.rowIcon}><Feather name="help-circle" size={18} color={colors.textPrimary} /></View>
            <Text style={styles.rowLabel}>Help & Support</Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} testID="driver-logout">
          <Feather name="log-out" size={16} color="#B91C1C" />
          <Text style={styles.logoutTxt}>Sign Out / Switch Account</Text>
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
  personalWrap: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  readonlyBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.borderSoft, paddingHorizontal: 12, paddingVertical: 10 },
  readonlyText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  readonlyHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  langRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  langChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  langChipActive: { backgroundColor: colors.black, borderColor: colors.black },
  langChipTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  langChipTxtActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  switchLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  saveBtn: { marginTop: 12, backgroundColor: colors.green, borderRadius: radii.full, paddingVertical: 13, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#FECACA', borderRadius: radii.full, backgroundColor: '#FEF2F2' },
  logoutTxt: { color: '#B91C1C', fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
