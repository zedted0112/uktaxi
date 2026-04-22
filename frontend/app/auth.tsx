import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../src/theme';
import { api, Vehicle } from '../src/api';
import { useAuth } from '../src/auth';

type Step = 'phone' | 'otp' | 'register';

export default function Auth() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'driver'>('user');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclePreset, setVehiclePreset] = useState('bolero');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.listVehicles().then(setVehicles).catch(() => {}); }, []);

  const formattedPhone = () => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('91') ? `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7, 12)}`
      : digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5, 10)}`
      : phone;
  };

  const sendOtp = async () => {
    const p = formattedPhone();
    if (p.replace(/\D/g, '').length < 12) return Alert.alert('Invalid', 'Enter a valid 10-digit number');
    setLoading(true);
    try {
      await api.requestOtp(p);
      setPhone(p);
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return Alert.alert('Invalid', 'Enter 6-digit OTP');
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp);
      if (res.user) {
        await signIn(res.user);
      } else {
        setStep('register');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const registerNow = async () => {
    if (!name.trim()) return Alert.alert('Missing', 'Please enter your name');
    if (role === 'driver' && (!vehiclePreset || !vehicleNumber.trim())) {
      return Alert.alert('Missing', 'Please pick a vehicle and enter its number');
    }
    setLoading(true);
    try {
      const u = await api.register({
        phone, name: name.trim(), role,
        vehicle_preset: role === 'driver' ? vehiclePreset : undefined,
        vehicle_number: role === 'driver' ? vehicleNumber.trim() : undefined,
      });
      await signIn(u);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoBox}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="car-estate" size={28} color="#fff" />
          </View>
          <Text style={styles.brand}>Uttarkashi Taxi Union</Text>
          <Text style={styles.tagline}>Your mountain travel, simplified</Text>
        </View>

        {step === 'phone' && (
          <View style={styles.card} testID="phone-step">
            <Text style={styles.heading}>Welcome</Text>
            <Text style={styles.sub}>Enter your phone to continue</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="98765 43210"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={15}
                testID="phone-input"
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={loading}
              testID="send-otp-btn"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <>
                <Text style={styles.primaryBtnTxt}>Send OTP</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>}
            </TouchableOpacity>
            <Text style={styles.legal}>By continuing you agree to our terms of service</Text>
          </View>
        )}

        {step === 'otp' && (
          <View style={styles.card} testID="otp-step">
            <TouchableOpacity onPress={() => setStep('phone')} style={styles.backInline} testID="back-to-phone">
              <Feather name="chevron-left" size={18} color={colors.textSecondary} />
              <Text style={styles.backTxt}>{phone}</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>Enter OTP</Text>
            <Text style={styles.sub}>Sent to your phone • Use 123456 in demo</Text>
            <TextInput
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="••••••"
              placeholderTextColor={colors.textMuted}
              style={styles.otpInput}
              maxLength={6}
              testID="otp-input"
            />
            <TouchableOpacity
              style={[styles.primaryBtn, (loading || otp.length !== 6) && styles.btnDisabled]}
              onPress={verifyOtp}
              disabled={loading || otp.length !== 6}
              testID="verify-otp-btn"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <>
                <Text style={styles.primaryBtnTxt}>Verify</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>}
            </TouchableOpacity>
          </View>
        )}

        {step === 'register' && (
          <View style={styles.card} testID="register-step">
            <Text style={styles.heading}>Almost done</Text>
            <Text style={styles.sub}>Tell us about yourself</Text>

            <Text style={styles.label}>Your name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              style={styles.inputSingle}
              testID="name-input"
            />

            <Text style={styles.label}>I am a</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleCard, role === 'user' && styles.roleCardActive]}
                onPress={() => setRole('user')}
                testID="role-user"
              >
                <Feather name="user" size={20} color={role === 'user' ? '#fff' : colors.textPrimary} />
                <Text style={[styles.roleTxt, role === 'user' && styles.roleTxtActive]}>Passenger</Text>
                <Text style={[styles.roleSub, role === 'user' && { color: '#D1FAE5' }]}>Book seats</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleCard, role === 'driver' && styles.roleCardActive]}
                onPress={() => setRole('driver')}
                testID="role-driver"
              >
                <MaterialCommunityIcons name="steering" size={22} color={role === 'driver' ? '#fff' : colors.textPrimary} />
                <Text style={[styles.roleTxt, role === 'driver' && styles.roleTxtActive]}>Driver</Text>
                <Text style={[styles.roleSub, role === 'driver' && { color: '#D1FAE5' }]}>Publish rides</Text>
              </TouchableOpacity>
            </View>

            {role === 'driver' && (
              <>
                <Text style={styles.label}>Choose your vehicle</Text>
                <View style={{ gap: 8 }}>
                  {vehicles.map(v => {
                    const active = vehiclePreset === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.vehicleCard, active && styles.vehicleCardActive]}
                        onPress={() => setVehiclePreset(v.id)}
                        testID={`veh-${v.id}`}
                      >
                        <View style={[styles.vehicleIcon, active && { backgroundColor: '#fff' }]}>
                          <MaterialCommunityIcons
                            name={v.id === 'eeco' ? 'van-passenger' : 'car-estate'}
                            size={22}
                            color={active ? colors.green : colors.textPrimary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.vehicleName, active && { color: '#fff' }]}>{v.name}</Text>
                          <Text style={[styles.vehicleMeta, active && { color: '#D1FAE5' }]}>
                            {v.total_seats} seats • {v.type}
                          </Text>
                        </View>
                        {active && <Feather name="check-circle" size={18} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.label, { marginTop: 14 }]}>Vehicle Number</Text>
                <TextInput
                  value={vehicleNumber}
                  onChangeText={(t) => setVehicleNumber(t.toUpperCase())}
                  placeholder="UK 07 TA 1234"
                  placeholderTextColor={colors.textMuted}
                  style={styles.inputSingle}
                  autoCapitalize="characters"
                  testID="vehicle-number-input"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled, { marginTop: 20 }]}
              onPress={registerNow}
              disabled={loading}
              testID="register-btn"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <>
                <Text style={styles.primaryBtnTxt}>Create Account</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.heroImgWrap}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1738482223844-7ff598553cf7?w=600&q=80' }}
            style={styles.heroImg}
          />
          <View style={styles.heroOverlay} />
          <Text style={styles.heroTxt}>Uttarkashi • Dehradun • Rishikesh</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24 },
  logoBox: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 60, height: 60, borderRadius: 20, backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  brand: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.5 },
  tagline: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.xl, padding: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  heading: { fontFamily: fonts.heading, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 18 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 4,
  },
  prefix: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginRight: 10 },
  input: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary, paddingVertical: 12 },
  otpInput: {
    fontFamily: fonts.bodyBold, fontSize: 24, letterSpacing: 8, textAlign: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingVertical: 14,
    color: colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: colors.green, borderRadius: radii.full, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18,
  },
  primaryBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  legal: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 14 },
  backInline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
  inputSingle: {
    fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleCard: {
    flex: 1, backgroundColor: colors.borderSoft, borderRadius: radii.lg,
    padding: 16, alignItems: 'flex-start', gap: 4,
  },
  roleCardActive: { backgroundColor: colors.green },
  roleTxt: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginTop: 6 },
  roleTxtActive: { color: '#fff' },
  roleSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  heroImgWrap: { marginTop: 28, borderRadius: radii.xl, overflow: 'hidden', height: 140, justifyContent: 'flex-end' },
  heroImg: { position: 'absolute', width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroTxt: { fontFamily: fonts.heading, color: '#fff', fontSize: 18, padding: 18, letterSpacing: -0.3 },
  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: radii.lg, backgroundColor: colors.borderSoft,
  },
  vehicleCardActive: { backgroundColor: colors.green },
  vehicleIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  vehicleMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
