import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme';
import { ROUTES, hasRouteLeg } from '../data/unionRoutes';

type Picker = 'from' | 'to' | null;

type Props = {
  fromCity: string;
  toCity: string;
  onChange: (from: string, to: string) => void;
  /** Prefix for testIDs (e.g. home vs publish). */
  testIdPrefix?: string;
};

function tid(prefix: string, rest: string) {
  return `${prefix}-${rest}`.replace(/[^a-zA-Z0-9-]/g, '-');
}

export function RoutePickerCard({ fromCity, toCity, onChange, testIdPrefix = 'route' }: Props) {
  const [pickerFor, setPickerFor] = useState<Picker>(null);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const fromInputRef = useRef<TextInput>(null);
  const toInputRef = useRef<TextInput>(null);

  const closePickers = () => {
    setPickerFor(null);
    setFromSearch('');
    setToSearch('');
  };

  const applyRoute = (nextFrom: string, nextTo: string) => {
    if (nextFrom === nextTo) {
      Alert.alert('Invalid selection', 'From and To cannot be the same city.');
      return;
    }
    if (!hasRouteLeg(nextFrom, nextTo)) {
      Alert.alert('Route not available', 'This route is not available yet.');
      return;
    }
    onChange(nextFrom, nextTo);
    closePickers();
  };

  const openFromPicker = () => {
    setPickerFor((prev) => (prev === 'from' ? null : 'from'));
  };

  const openToPicker = () => {
    setPickerFor((prev) => (prev === 'to' ? null : 'to'));
  };

  const filteredFromRoutes = useMemo(() => {
    const q = fromSearch.trim().toLowerCase();
    if (!q) return [];
    return ROUTES.filter(
      (r) =>
        r.from.toLowerCase().includes(q) ||
        r.to.toLowerCase().includes(q) ||
        `${r.from} ${r.to}`.toLowerCase().includes(q),
    );
  }, [fromSearch]);

  const filteredToRoutes = useMemo(() => {
    const base = ROUTES.filter((r) => r.from === fromCity);
    const q = toSearch.trim().toLowerCase();
    if (!q) return [];
    return base.filter((r) => r.to.toLowerCase().includes(q));
  }, [fromCity, toSearch]);

  useEffect(() => {
    if (pickerFor === 'from') {
      setFromSearch('');
      setToSearch('');
      const t = setTimeout(() => fromInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    if (pickerFor === 'to') {
      setToSearch('');
      setFromSearch('');
      const t = setTimeout(() => toInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    setFromSearch('');
    setToSearch('');
  }, [pickerFor]);

  const reverseRoute = () => {
    if (fromCity === toCity) {
      Alert.alert('Invalid selection', 'From and To cannot be the same city.');
      return;
    }
    if (!hasRouteLeg(toCity, fromCity)) {
      Alert.alert('Route not available', 'Reverse direction is not available yet.');
      return;
    }
    onChange(toCity, fromCity);
    closePickers();
  };

  return (
    <View style={styles.routeCard}>
      <TouchableOpacity
        style={[styles.routeRow, pickerFor === 'from' && styles.routeRowActive]}
        activeOpacity={0.85}
        onPress={openFromPicker}
        testID={tid(testIdPrefix, 'from-picker-toggle')}
      >
        <View style={styles.dotGreenOutline} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.routeLabel}>From</Text>
          {pickerFor === 'from' ? (
            <TextInput
              ref={fromInputRef}
              value={fromSearch}
              onChangeText={setFromSearch}
              placeholder="Type city or route…"
              placeholderTextColor={colors.textMuted}
              style={styles.routeSearchInput}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              testID={tid(testIdPrefix, 'from-search-input')}
            />
          ) : (
            <Text style={styles.routeCity}>{fromCity}</Text>
          )}
        </View>
        <Feather
          name={pickerFor === 'from' ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {pickerFor === 'from' && fromSearch.trim().length > 0 && (
        <View style={styles.pickerList} testID={tid(testIdPrefix, 'from-picker-list')}>
          {filteredFromRoutes.length === 0 ? (
            <Text style={styles.pickerEmpty}>No routes match your search.</Text>
          ) : (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.pickerScroll}
              showsVerticalScrollIndicator={false}
            >
              {filteredFromRoutes.map((item) => {
                const active = item.from === fromCity && item.to === toCity;
                return (
                  <TouchableOpacity
                    key={`${item.from}-${item.to}`}
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    onPress={() => applyRoute(item.from, item.to)}
                    testID={tid(testIdPrefix, `from-route-${item.from}-${item.to}`)}
                  >
                    <Text style={[styles.pickerText, active && styles.pickerTextActive]}>
                      {item.from} → {item.to}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
      <View style={styles.routeDivider} />
      <View style={styles.swapWrap}>
        <TouchableOpacity
          style={styles.swapBtn}
          onPress={reverseRoute}
          testID={tid(testIdPrefix, 'route-reverse-btn')}
        >
          <Feather name="repeat" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.routeRow, pickerFor === 'to' && styles.routeRowActive]}
        activeOpacity={0.85}
        onPress={openToPicker}
        testID={tid(testIdPrefix, 'to-picker-toggle')}
      >
        <View style={styles.dotGreenFill} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.routeLabel}>To</Text>
          {pickerFor === 'to' ? (
            <TextInput
              ref={toInputRef}
              value={toSearch}
              onChangeText={setToSearch}
              placeholder="Type destination…"
              placeholderTextColor={colors.textMuted}
              style={styles.routeSearchInput}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              testID={tid(testIdPrefix, 'to-search-input')}
            />
          ) : (
            <Text style={styles.routeCity}>{toCity}</Text>
          )}
        </View>
        <Feather
          name={pickerFor === 'to' ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {pickerFor === 'to' && toSearch.trim().length > 0 && (
        <View style={styles.pickerList} testID={tid(testIdPrefix, 'to-picker-list')}>
          {filteredToRoutes.length === 0 ? (
            <Text style={styles.pickerEmpty}>No destinations match your search.</Text>
          ) : (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.pickerScroll}
              showsVerticalScrollIndicator={false}
            >
              {filteredToRoutes.map((item) => {
                const active = item.to === toCity;
                return (
                  <TouchableOpacity
                    key={`${item.from}-${item.to}`}
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    onPress={() => applyRoute(item.from, item.to)}
                    testID={tid(testIdPrefix, `to-route-${item.from}-${item.to}`)}
                  >
                    <Text style={[styles.pickerText, active && styles.pickerTextActive]}>{item.to}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  routeCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, borderWidth: 1, borderColor: colors.border },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeRowActive: {
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginTop: -4,
    marginBottom: -4,
    borderRadius: radii.md,
    backgroundColor: colors.borderSoft,
  },
  pickerList: {
    marginTop: 10,
    marginLeft: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  pickerScroll: { maxHeight: 220 },
  pickerEmpty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  pickerItemActive: { backgroundColor: colors.greenLight },
  pickerText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textPrimary },
  pickerTextActive: { color: colors.greenDark, fontFamily: fonts.bodySemiBold },
  routeLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  routeCity: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.textPrimary, marginTop: 2 },
  routeSearchInput: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 2,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 22,
  },
  routeDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 12, marginLeft: 28 },
  swapWrap: { alignItems: 'center', marginTop: -4, marginBottom: 8 },
  swapBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotGreenOutline: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: colors.green, backgroundColor: colors.surface },
  dotGreenFill: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green },
});
