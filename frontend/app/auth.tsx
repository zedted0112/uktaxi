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

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'role_select' | 'phone' | 'otp' | 'onboard_driver' | 'onboard_passenger';

type DemoAccount = {
  phone: string;
  name: string;
  role: 'user' | 'driver';
  vehicle_preset?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  driving_license?: string | null;
  total_seats?: number | null;
};

// ─── Local demo accounts (shown offline) ─────────────────────────────────────

const LOCAL_DEMOS: DemoAccount[] = [
  {
    phone: '+91 98765 43210', name: 'Rakesh Negi', role: 'driver',
    vehicle_preset: 'bolero', vehicle_type: 'Mahindra Bolero',
    vehicle_number: 'UK 07 TA 1234', total_seats: 9,
  },
  {
    phone: '+91 98123 45678', name: 'Suresh Rana', role: 'driver',
    vehicle_preset: 'innova', vehicle_type: 'Toyota Innova Crysta',
    vehicle_number: 'UK 07 TA 5678', total_seats: 7,
  },
  {
    phone: '+91 99887 76655', name: 'Mohan Rawat', role: 'driver',
    vehicle_preset: 'swift', vehicle_type: 'Maruti Swift Dzire',
    vehicle_number: 'UK 07 TA 9999', total_seats: 5,
  },
  { phone: '+91 98765 00001', name: 'Aarav Sharma', role: 'user' },
  { phone: '+91 98765 00002', name: 'Priya Nautiyal', role: 'user' },
];

const HERO_SLIDES = [
  require('../assets/images/home-carousel/Slide_1.jpg'),
  require('../assets/images/home-carousel/Slide_2.jpg'),
  require('../assets/images/home-carousel/slide_show_3.jpg'),
  require('../assets/images/home-carousel/Slide_4.jpeg'),
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Auth() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const forceDemoOtp = String(process.env.EXPO_PUBLIC_FORCE_DEMO_OTP || '').toLowerCase() === 'true';

  // Navigation state
  const [step, setStep] = useState<Step>('role_select');
  const [driverSubStep, setDriverSubStep] = useState<1 | 2 | 3 | 4>(1);

  // Form fields
  const [role, setRole] = useState<'user' | 'driver'>('user');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [vehiclePreset, setVehiclePreset] = useState('bolero');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');

  // Remote data & loading
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  /** Backend `demo_mode`, or forced on via EXPO_PUBLIC_FORCE_DEMO_OTP (Expo Go + prod-like API). */
  const [demoUiEnabled, setDemoUiEnabled] = useState(forceDemoOtp);
  const [demoAccts, setDemoAccts] = useState<DemoAccount[]>([...LOCAL_DEMOS]);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    api.listVehicles().then(setVehicles).catch(() => {});
    let cancelled = false;
    (async () => {
      try {
        const root = await api.getApiRoot();
        if (cancelled) return;
        const enabled = forceDemoOtp || root.demo_mode === true;
        setDemoUiEnabled(enabled);
        if (!enabled) {
          setDemoAccts([]);
          return;
        }
        try {
          const remote = await api.demoAccounts();
          if (cancelled) return;
          const merged = new Map<string, DemoAccount>();
          LOCAL_DEMOS.forEach((d) => merged.set(d.phone, d));
          remote.forEach((r) => merged.set(r.phone, { ...merged.get(r.phone), ...r }));
          setDemoAccts(Array.from(merged.values()));
        } catch {
          if (!cancelled) setDemoAccts([...LOCAL_DEMOS]);
        }
      } catch {
        if (!cancelled) {
          setDemoUiEnabled(forceDemoOtp);
          setDemoAccts(forceDemoOtp ? [...LOCAL_DEMOS] : []);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forceDemoOtp]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formattedPhone = () => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('91')
      ? `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7, 12)}`
      : digits.length === 10
      ? `+91 ${digits.slice(0, 5)} ${digits.slice(5, 10)}`
      : phone;
  };

  const selectedVehicle = vehicles.find((v) => v.id === vehiclePreset);

  // ── Actions ──────────────────────────────────────────────────────────────

  const quickSignIn = async (acct: DemoAccount) => {
    setQuickLoading(acct.phone);
    try {
      let u;
      try { u = await api.me(acct.phone); }
      catch {
        u = await api.register({
          phone: acct.phone, name: acct.name, role: acct.role,
          vehicle_preset: acct.role === 'driver' ? (acct.vehicle_preset ?? undefined) : undefined,
          vehicle_number: acct.role === 'driver' ? (acct.vehicle_number ?? undefined) : undefined,
          driving_license: acct.role === 'driver' ? (acct.driving_license ?? undefined) : undefined,
        });
      }
      await signIn(u);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to sign in');
    } finally { setQuickLoading(null); }
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
    if (otp.length !== 6) {
      return Alert.alert(
        'Invalid OTP',
        demoUiEnabled
          ? 'Please enter the 6-digit code (try 123456 in demo)'
          : 'Please enter the 6-digit code sent to your phone',
      );
    }
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp);
      if (res.user) {
        await signIn(res.user);
      } else {
        // New number — go to role-specific onboarding
        setDriverSubStep(1);
        setStep(role === 'driver' ? 'onboard_driver' : 'onboard_passenger');
      }
    } catch (e: any) {
      Alert.alert(
        'Verification failed',
        e?.message ||
          (demoUiEnabled ? 'Please try OTP 123456' : 'Check the code and try again'),
      );
    } finally { setLoading(false); }
  };

  const registerDriver = async () => {
    setLoading(true);
    try {
      const u = await api.register({
        phone, name: name.trim(), role: 'driver',
        vehicle_preset: vehiclePreset,
        vehicle_number: vehicleNumber.trim(),
        driving_license: drivingLicense.trim().toUpperCase(),
      });
      await signIn(u);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const registerPassenger = async () => {
    if (!name.trim()) return Alert.alert('Missing', 'Please enter your name');
    setLoading(true);
    try {
      const u = await api.register({ phone, name: name.trim(), role: 'user' });
      await signIn(u);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    } finally { setLoading(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo ── */}
        <View style={styles.logoBox}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="car-estate" size={28} color="#fff" />
          </View>
          <Text style={styles.brand}>UKTaxi</Text>
          <Text style={styles.tagline}>Your mountain travel, simplified</Text>
        </View>

        {/* ══════════════════════════════════════════════
            STEP 1 — ROLE SELECT
        ══════════════════════════════════════════════ */}
        {step === 'role_select' && (
          <View style={styles.card} testID="role-select-step">

            {demoUiEnabled && (
              <>
                <View style={styles.demoToggleRow}>
                  <Text style={styles.demoToggleLabel}>Quick Demo Access</Text>
                  <TouchableOpacity
                    onPress={() => setShowDemo((p) => !p)}
                    style={[styles.demoToggleBtn, showDemo && styles.demoToggleBtnActive]}
                    testID="demo-toggle-btn"
                  >
                    <Text style={[styles.demoToggleBtnTxt, showDemo && styles.demoToggleBtnTxtActive]}>
                      {showDemo ? 'Hide' : 'Demo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showDemo && demoAccts.length > 0 && (
                  <View style={styles.demoBox} testID="demo-box">
                    <View style={styles.demoHead}>
                      <MaterialCommunityIcons name="flash-outline" size={16} color={colors.greenDark} />
                      <Text style={styles.demoHeadTxt}>Demo · tap to sign in instantly</Text>
                    </View>
                    {demoAccts.map((a) => (
                      <TouchableOpacity
                        key={a.phone}
                        style={styles.demoRow}
                        disabled={quickLoading !== null}
                        onPress={() => quickSignIn(a)}
                        testID={`demo-${a.phone.replace(/\D/g, '')}`}
                      >
                        <View style={[styles.demoAvatar, a.role === 'driver' && { backgroundColor: colors.black }]}>
                          {a.role === 'driver'
                            ? <MaterialCommunityIcons name="steering" size={16} color="#fff" />
                            : <Feather name="user" size={16} color={colors.textPrimary} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.demoName}>{a.name}</Text>
                          <Text style={styles.demoMeta}>
                            {a.role === 'driver' ? `${a.vehicle_type} • ${a.total_seats} seats` : 'Passenger'}
                          </Text>
                        </View>
                        {quickLoading === a.phone
                          ? <ActivityIndicator color={colors.green} size="small" />
                          : <Feather name="arrow-right" size={16} color={colors.textMuted} />}
                      </TouchableOpacity>
                    ))}
                    <View style={styles.dividerWrap}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerTxt}>OR CONTINUE BELOW</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  </View>
                )}
              </>
            )}

            <Text style={styles.heading}>Welcome</Text>
            <Text style={styles.sub}>How would you like to continue?</Text>

            <View style={styles.roleRow}>
              {/* Driver card */}
              <TouchableOpacity
                style={styles.roleSelectCard}
                onPress={() => { setRole('driver'); setStep('phone'); }}
                testID="select-driver"
                activeOpacity={0.85}
              >
                <View style={styles.roleSelectIconWrap}>
                  <MaterialCommunityIcons name="steering" size={30} color={colors.black} />
                </View>
                <Text style={styles.roleSelectTitle}>Driver</Text>
                <Text style={styles.roleSelectSub}>Publish rides{'\n'}& earn</Text>
                <View style={styles.roleSelectArrow}>
                  <Feather name="arrow-right" size={14} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Passenger card */}
              <TouchableOpacity
                style={styles.roleSelectCard}
                onPress={() => { setRole('user'); setStep('phone'); }}
                testID="select-passenger"
                activeOpacity={0.85}
              >
                <View style={[styles.roleSelectIconWrap, { backgroundColor: colors.greenLight }]}>
                  <Feather name="user" size={26} color={colors.greenDark} />
                </View>
                <Text style={styles.roleSelectTitle}>Passenger</Text>
                <Text style={styles.roleSelectSub}>Find rides{'\n'}& book seats</Text>
                <View style={styles.roleSelectArrow}>
                  <Feather name="arrow-right" size={14} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.legal}>By continuing you agree to our terms of service</Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════
            STEP 2 — PHONE
        ══════════════════════════════════════════════ */}
        {step === 'phone' && (
          <View style={styles.card} testID="phone-step">
            <TouchableOpacity onPress={() => setStep('role_select')} style={styles.backInline} testID="back-to-role">
              <Feather name="chevron-left" size={18} color={colors.textSecondary} />
              <View style={[styles.rolePill, role === 'driver' ? styles.rolePillDriver : styles.rolePillPassenger]}>
                {role === 'driver'
                  ? <MaterialCommunityIcons name="steering" size={11} color="#fff" />
                  : <Feather name="user" size={11} color={colors.greenDark} />}
                <Text style={[styles.rolePillTxt, role === 'driver' ? { color: '#fff' } : { color: colors.greenDark }]}>
                  {role === 'driver' ? 'Driver' : 'Passenger'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.heading}>Enter your number</Text>
            <Text style={styles.sub}>We'll send you a 6-digit OTP to verify</Text>

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
          </View>
        )}

        {/* ══════════════════════════════════════════════
            STEP 3 — OTP
        ══════════════════════════════════════════════ */}
        {step === 'otp' && (
          <View style={styles.card} testID="otp-step">
            <TouchableOpacity onPress={() => setStep('phone')} style={styles.backInline} testID="back-to-phone">
              <Feather name="chevron-left" size={18} color={colors.textSecondary} />
              <Text style={styles.backTxt}>{phone}</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>Enter OTP</Text>
            <Text style={styles.sub}>
              {demoUiEnabled ? (
                <>
                  Sent to your phone · Use{' '}
                  <Text style={{ color: colors.greenDark, fontFamily: fonts.bodySemiBold }}>123456</Text> in demo
                </>
              ) : (
                'Enter the 6-digit code sent to your phone'
              )}
            </Text>
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

        {/* ══════════════════════════════════════════════
            STEP 4a — DRIVER ONBOARDING (multi-step)
        ══════════════════════════════════════════════ */}
        {step === 'onboard_driver' && (
          <View style={styles.card} testID="onboard-driver-step">

            {/* Progress dots */}
            <View style={styles.progressRow}>
              {([1, 2, 3, 4] as const).map((n) => (
                <View
                  key={n}
                  style={[styles.progressDot, driverSubStep >= n && styles.progressDotActive]}
                />
              ))}
            </View>

            {/* Back / context header */}
            <TouchableOpacity
              onPress={() => {
                if (driverSubStep === 1) setStep('otp');
                else setDriverSubStep((driverSubStep - 1) as 1 | 2 | 3 | 4);
              }}
              style={styles.backInline}
              testID="driver-back"
            >
              <Feather name="chevron-left" size={18} color={colors.textSecondary} />
              <Text style={styles.backTxt}>
                {driverSubStep === 1 ? 'Back' : `Step ${driverSubStep - 1} of 4`}
              </Text>
            </TouchableOpacity>

            {/* ── Sub-step 1: Name ── */}
            {driverSubStep === 1 && (
              <>
                <Text style={styles.heading}>Your name</Text>
                <Text style={styles.sub}>How should passengers address you?</Text>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Rakesh Negi"
                  placeholderTextColor={colors.textMuted}
                  style={styles.inputSingle}
                  autoCapitalize="words"
                  testID="driver-name-input"
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, !name.trim() && styles.btnDisabled, { marginTop: 20 }]}
                  onPress={() => {
                    if (!name.trim()) return Alert.alert('Missing', 'Please enter your full name');
                    setDriverSubStep(2);
                  }}
                  disabled={!name.trim()}
                  testID="driver-next-1"
                >
                  <Text style={styles.primaryBtnTxt}>Next</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {/* ── Sub-step 2: Vehicle type ── */}
            {driverSubStep === 2 && (
              <>
                <Text style={styles.heading}>Your vehicle</Text>
                <Text style={styles.sub}>Choose the type that matches your car</Text>
                <View style={{ gap: 8, marginTop: 4 }}>
                  {vehicles.map((v) => {
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
                            {v.total_seats} seats · {v.type}
                          </Text>
                        </View>
                        {active && <Feather name="check-circle" size={18} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 20 }]}
                  onPress={() => setDriverSubStep(3)}
                  testID="driver-next-2"
                >
                  <Text style={styles.primaryBtnTxt}>Next</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {/* ── Sub-step 3: Vehicle & license ── */}
            {driverSubStep === 3 && (
              <>
                <Text style={styles.heading}>Vehicle number</Text>
                <Text style={styles.sub}>Enter your vehicle plate and driving license</Text>
                <Text style={styles.label}>Plate number</Text>
                <TextInput
                  value={vehicleNumber}
                  onChangeText={(t) => setVehicleNumber(t.toUpperCase())}
                  placeholder="UK 07 TA 1234"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.inputSingle, { letterSpacing: 2 }]}
                  autoCapitalize="characters"
                  testID="vehicle-number-input"
                />
                <Text style={styles.hintTxt}>Format: UK 07 TA 1234</Text>
                <Text style={styles.label}>Driving license number</Text>
                <TextInput
                  value={drivingLicense}
                  onChangeText={(t) => setDrivingLicense(t.toUpperCase())}
                  placeholder="e.g. UK-0620111234567"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.inputSingle, { letterSpacing: 1 }]}
                  autoCapitalize="characters"
                  testID="driver-license-input"
                />
                <Text style={styles.hintTxt}>Enter your valid DL number (uppercase)</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, (!vehicleNumber.trim() || !drivingLicense.trim()) && styles.btnDisabled, { marginTop: 20 }]}
                  onPress={() => {
                    if (!vehicleNumber.trim()) return Alert.alert('Missing', 'Please enter your vehicle number');
                    if (!drivingLicense.trim()) return Alert.alert('Missing', 'Please enter your driving license number');
                    setDriverSubStep(4);
                  }}
                  disabled={!vehicleNumber.trim() || !drivingLicense.trim()}
                  testID="driver-next-3"
                >
                  <Text style={styles.primaryBtnTxt}>Next</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {/* ── Sub-step 4: Review ── */}
            {driverSubStep === 4 && (
              <>
                <Text style={styles.heading}>Looks good?</Text>
                <Text style={styles.sub}>Review your details before creating your account</Text>

                <View style={styles.reviewCard}>
                  <ReviewRow icon="user" label="Name" value={name} />
                  <View style={styles.reviewDivider} />
                  <ReviewRow
                    icon="car-estate"
                    label="Vehicle"
                    value={selectedVehicle?.name ?? vehiclePreset}
                    isMCI
                  />
                  <View style={styles.reviewDivider} />
                  <ReviewRow icon="credit-card" label="Plate" value={vehicleNumber} />
                  <View style={styles.reviewDivider} />
                  <ReviewRow icon="file-text" label="License" value={drivingLicense} />
                  <View style={styles.reviewDivider} />
                  <ReviewRow icon="phone" label="Phone" value={phone} />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled, { marginTop: 20 }]}
                  onPress={registerDriver}
                  disabled={loading}
                  testID="driver-create-account"
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <>
                    <Text style={styles.primaryBtnTxt}>Create Account</Text>
                    <Feather name="check" size={18} color="#fff" />
                  </>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════
            STEP 4b — PASSENGER ONBOARDING
        ══════════════════════════════════════════════ */}
        {step === 'onboard_passenger' && (
          <View style={styles.card} testID="onboard-passenger-step">
            <TouchableOpacity onPress={() => setStep('otp')} style={styles.backInline} testID="passenger-back">
              <Feather name="chevron-left" size={18} color={colors.textSecondary} />
              <Text style={styles.backTxt}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.heading}>Almost done</Text>
            <Text style={styles.sub}>Just one thing before you start booking</Text>

            <Text style={styles.label}>Your name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Aarav Sharma"
              placeholderTextColor={colors.textMuted}
              style={styles.inputSingle}
              autoCapitalize="words"
              testID="passenger-name-input"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (loading || !name.trim()) && styles.btnDisabled, { marginTop: 20 }]}
              onPress={registerPassenger}
              disabled={loading || !name.trim()}
              testID="passenger-create-account"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <>
                <Text style={styles.primaryBtnTxt}>Start Booking</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Hero image ── */}
        <View style={styles.heroImgWrap}>
          <Image
            source={HERO_SLIDES[heroIndex]}
            style={styles.heroImg}
          />
          <View style={styles.heroOverlay} />
          <Text style={styles.heroTxt}>Uttarkashi · Dehradun · Rishikesh</Text>
          <View style={styles.heroDots} testID="hero-carousel-dots">
            {HERO_SLIDES.map((_, idx) => (
              <View
                key={`dot-${idx}`}
                style={[styles.heroDot, idx === heroIndex && styles.heroDotActive]}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────

function ReviewRow({
  icon, label, value, isMCI,
}: { icon: string; label: string; value: string; isMCI?: boolean }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewIconWrap}>
        {isMCI
          ? <MaterialCommunityIcons name={icon as any} size={14} color={colors.textSecondary} />
          : <Feather name={icon as any} size={14} color={colors.textSecondary} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24 },

  // Logo
  logoBox: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 60, height: 60, borderRadius: 20, backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  brand: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.5 },
  tagline: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // Card
  card: {
    backgroundColor: colors.surface, borderRadius: radii.xl, padding: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  heading: { fontFamily: fonts.heading, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 18 },
  label: {
    fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8,
  },
  hintTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 6 },

  // Role select cards
  roleRow: { flexDirection: 'row', gap: 10 },
  roleSelectCard: {
    flex: 1, backgroundColor: colors.borderSoft, borderRadius: radii.lg,
    padding: 18, borderWidth: 1, borderColor: colors.border,
  },
  roleSelectIconWrap: {
    width: 50, height: 50, borderRadius: 14, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  roleSelectTitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.textPrimary },
  roleSelectSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  roleSelectArrow: { marginTop: 16 },

  // Role pill (shown in phone step header)
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full,
  },
  rolePillDriver: { backgroundColor: colors.black },
  rolePillPassenger: { backgroundColor: colors.greenLight },
  rolePillTxt: { fontFamily: fonts.bodySemiBold, fontSize: 11 },

  // Inputs
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 4,
  },
  prefix: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textPrimary, marginRight: 10 },
  input: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary, paddingVertical: 12 },
  inputSingle: {
    fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  otpInput: {
    fontFamily: fonts.bodyBold, fontSize: 24, letterSpacing: 8, textAlign: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingVertical: 14,
    color: colors.textPrimary,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.green, borderRadius: radii.full, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryBtnTxt: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 15 },
  btnDisabled: { opacity: 0.5 },

  // Navigation
  backInline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },

  // Progress dots
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderSoft, borderWidth: 1, borderColor: colors.border },
  progressDotActive: { backgroundColor: colors.green, borderColor: colors.green },

  // Vehicle cards
  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: radii.lg, backgroundColor: colors.borderSoft,
  },
  vehicleCardActive: { backgroundColor: colors.green },
  vehicleIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleName: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  vehicleMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  // Review card
  reviewCard: {
    backgroundColor: colors.borderSoft, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, padding: 4, marginTop: 4,
  },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  reviewIconWrap: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  reviewLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewValue: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textPrimary, marginTop: 1 },
  reviewDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12 },

  // Demo
  demoBox: { marginBottom: 4 },
  demoHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  demoHeadTxt: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.greenDark, letterSpacing: 0.6, textTransform: 'uppercase' },
  demoToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  demoToggleLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase' },
  demoToggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, backgroundColor: colors.borderSoft, borderWidth: 1, borderColor: colors.border },
  demoToggleBtnActive: { backgroundColor: colors.greenLight, borderColor: colors.green },
  demoToggleBtnTxt: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textPrimary },
  demoToggleBtnTxtActive: { color: colors.greenDark },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: colors.surface, borderRadius: radii.md, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  demoAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  demoName: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textPrimary },
  demoMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  dividerWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerTxt: { fontFamily: fonts.bodySemiBold, fontSize: 9, color: colors.textMuted, letterSpacing: 0.8 },

  // Legal & hero
  legal: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 16 },
  heroImgWrap: { marginTop: 28, borderRadius: radii.xl, overflow: 'hidden', height: 140, justifyContent: 'flex-end' },
  heroImg: { position: 'absolute', width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroTxt: {
    fontFamily: fonts.heading,
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    letterSpacing: -0.3,
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  heroDots: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  heroDotActive: {
    width: 18,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
