import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors, fonts, radii } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const VARIANTS: Record<Variant, { bg: string; border: string; text: string }> = {
  primary:   { bg: colors.green,    border: colors.green,      text: '#fff' },
  secondary: { bg: colors.black,    border: colors.black,      text: '#fff' },
  ghost:     { bg: colors.surface,  border: colors.border,     text: colors.textPrimary },
  danger:    { bg: '#FEF2F2',       border: '#FECACA',         text: '#B91C1C' },
};

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, style, testID }: Props) {
  const v = VARIANTS[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      testID={testID}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={[styles.label, { color: v.text }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  disabled: { opacity: 0.5 },
});
