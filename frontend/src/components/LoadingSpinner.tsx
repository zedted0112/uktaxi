import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  size?: 'small' | 'large';
  style?: object;
}

export function LoadingSpinner({ size = 'large', style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator color={colors.green} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
});
