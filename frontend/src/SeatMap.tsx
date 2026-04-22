import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radii } from './theme';

export type SeatStatus = 'available' | 'selected' | 'booked' | 'pending' | 'offline';

export type SeatMapProps = {
  layout: number[][];
  statusOf: (seat: number) => SeatStatus;
  onPress?: (seat: number) => void;
  showDriver?: boolean;       // default true
  compact?: boolean;          // smaller seats
};

export function SeatMap({ layout, statusOf, onPress, showDriver = true, compact = false }: SeatMapProps) {
  const size = compact ? 38 : 44;
  const gap = compact ? 8 : 10;

  const styleForStatus = (s: SeatStatus) => {
    switch (s) {
      case 'selected': return [styles.seatBase, { backgroundColor: colors.green, borderColor: colors.green }];
      case 'booked':   return [styles.seatBase, { backgroundColor: '#F3F4F6', borderColor: colors.border, opacity: 0.65 }];
      case 'pending':  return [styles.seatBase, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }];
      case 'offline':  return [styles.seatBase, { backgroundColor: '#E0E7FF', borderColor: '#818CF8' }];
      default:         return [styles.seatBase, { backgroundColor: colors.surface, borderColor: colors.border }];
    }
  };
  const textForStatus = (s: SeatStatus) => {
    switch (s) {
      case 'selected': return [styles.seatTxt, { color: '#fff', fontFamily: fonts.bodyBold }];
      case 'booked':   return [styles.seatTxt, { color: colors.textMuted, textDecorationLine: 'line-through' as const }];
      case 'pending':  return [styles.seatTxt, { color: '#B45309' }];
      case 'offline':  return [styles.seatTxt, { color: '#3730A3' }];
      default:         return [styles.seatTxt, { color: colors.textPrimary }];
    }
  };

  return (
    <View style={[styles.wrap, { padding: compact ? 14 : 20 }]}>
      {/* Hood */}
      <View style={styles.hood} />
      {showDriver && (
        <View style={[styles.row, { gap, marginBottom: 14 }]}>
          <View style={[{ width: size, height: size }, styles.seatBase, { backgroundColor: colors.borderSoft, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
            <MaterialCommunityIcons name="steering" size={compact ? 14 : 18} color={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }} />
        </View>
      )}
      {layout.map((row, ri) => (
        <View key={`row-${ri}`} style={[styles.row, { gap, marginBottom: ri === layout.length - 1 ? 0 : 14, justifyContent: 'center' }]}>
          {row.map((seat) => {
            const st = statusOf(seat);
            const touchable = !!onPress && (st === 'available' || st === 'selected');
            const Comp: any = touchable ? TouchableOpacity : View;
            return (
              <Comp
                key={`seat-${seat}`}
                onPress={touchable ? () => onPress!(seat) : undefined}
                style={[styleForStatus(st), { width: size, height: size }]}
                testID={`seat-${seat}`}
              >
                <Text style={textForStatus(st)}>{seat}</Text>
              </Comp>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function SeatLegend({ items = ['available', 'selected', 'booked'] as SeatStatus[] }: { items?: SeatStatus[] }) {
  const meta: Record<SeatStatus, { bg: string; border: string; label: string }> = {
    available: { bg: colors.surface, border: colors.border, label: 'Available' },
    selected:  { bg: colors.green, border: colors.green, label: 'Selected' },
    booked:    { bg: '#F3F4F6', border: colors.border, label: 'Booked' },
    pending:   { bg: '#FEF3C7', border: '#FCD34D', label: 'Pending' },
    offline:   { bg: '#E0E7FF', border: '#818CF8', label: 'Offline' },
  };
  return (
    <View style={styles.legendRow}>
      {items.map(k => (
        <View key={k} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: meta[k].bg, borderColor: meta[k].border }]} />
          <Text style={styles.legendTxt}>{meta[k].label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface, borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  hood: { height: 4, width: 60, borderRadius: 4, backgroundColor: colors.borderSoft, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  seatBase: { borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  seatTxt: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  legendTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
});
