import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts, radii } from '../theme';

export type BadgeStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'published' | 'departed' | 'completed';

const STATUS_CONFIG: Record<BadgeStatus, { label: string; color: string; bg: string; icon?: React.ComponentProps<typeof Feather>['name'] }> = {
  pending:   { label: 'PENDING',   color: '#B45309', bg: '#FEF3C7', icon: 'clock' },
  confirmed: { label: 'CONFIRMED', color: '#059669', bg: '#D1FAE5', icon: 'check-circle' },
  rejected:  { label: 'REJECTED',  color: '#B91C1C', bg: '#FEE2E2', icon: 'x-circle' },
  cancelled: { label: 'CANCELLED', color: '#4B5563', bg: '#E5E7EB', icon: 'slash' },
  published: { label: 'PUBLISHED', color: '#059669', bg: '#D1FAE5' },
  departed:  { label: 'DEPARTED',  color: '#B45309', bg: '#FEF3C7', icon: 'clock' },
  completed: { label: 'COMPLETED', color: '#4B5563', bg: '#E5E7EB' },
};

interface Props {
  status: BadgeStatus;
  showIcon?: boolean;
}

export function Badge({ status, showIcon = false }: Props) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      {showIcon && cfg.icon ? (
        <Feather name={cfg.icon} size={10} color={cfg.color} />
      ) : null}
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.full },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.5 },
});
