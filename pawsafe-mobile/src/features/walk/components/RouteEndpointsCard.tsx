import { StyleSheet, Text, View } from 'react-native';
import type { Place } from '@/src/api/contracts';
import { AppCard } from '@/src/components/common/AppCard';
import { colors, spacing, typography } from '@/src/theme/theme';

export function RouteEndpointsCard({ origin, destination }: { origin: Place; destination: Place }) {
  return (
    <AppCard accessibilityLabel={`${origin.name}에서 ${destination.name}까지 선택한 산책 경로`} style={styles.card}>
      <Text style={styles.eyebrow}>선택한 산책 경로</Text>
      <Endpoint label="출발" place={origin} tone="origin" />
      <View style={styles.connector} />
      <Endpoint label="도착" place={destination} tone="destination" />
    </AppCard>
  );
}

function Endpoint({ label, place, tone }: { label: string; place: Place; tone: 'origin' | 'destination' }) {
  return (
    <View style={styles.endpoint}>
      <View style={[styles.dot, tone === 'destination' ? styles.destinationDot : styles.originDot]} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md },
  eyebrow: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  endpoint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, backgroundColor: colors.white },
  originDot: { borderColor: colors.greenStrong },
  destinationDot: { borderColor: colors.orange },
  copy: { flex: 1, gap: 1 },
  label: { ...typography.caption, color: colors.mutedText },
  name: { ...typography.body, color: colors.text, fontWeight: '700' },
  address: { ...typography.caption, color: colors.mutedText },
  connector: { width: 2, height: 12, backgroundColor: colors.border, marginLeft: 5 },
});
