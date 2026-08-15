import { StyleSheet, Text, View } from 'react-native';
import type { Place } from '@/src/api/contracts';
import { AppCard } from '@/src/components/common/AppCard';
import { colors, spacing, typography } from '@/src/theme/theme';

export function RouteEndpointsCard({ origin, destination }: { origin: Place; destination: Place }) {
  return (
    <AppCard accessibilityLabel={`${origin.name}에서 ${destination.name}까지 선택한 산책 경로`} style={styles.card}>
      <View style={styles.headingRow}><Text style={styles.eyebrow}>선택한 산책</Text><Text style={styles.changeHint}>출발 → 도착</Text></View>
      <View style={styles.routeRow}>
        <Endpoint label="출발" place={origin} tone="origin" />
        <View style={styles.connector}><View style={styles.connectorLine} /><Text style={styles.arrow}>›</Text></View>
        <Endpoint label="도착" place={destination} tone="destination" />
      </View>
    </AppCard>
  );
}

function Endpoint({ label, place, tone }: { label: string; place: Place; tone: 'origin' | 'destination' }) {
  return (
    <View style={styles.endpoint}>
      <View style={[styles.marker, tone === 'destination' ? styles.destinationMarker : styles.originMarker]}><Text style={styles.markerText}>{tone === 'origin' ? 'S' : 'E'}</Text></View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...typography.caption, color: colors.greenStrong, fontWeight: '800' },
  changeHint: { ...typography.caption, color: colors.mutedText },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  endpoint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  marker: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  originMarker: { backgroundColor: '#294333' },
  destinationMarker: { backgroundColor: colors.orange },
  markerText: { ...typography.caption, color: colors.white, fontWeight: '800' },
  copy: { flex: 1, gap: 1 },
  label: { ...typography.caption, color: colors.mutedText },
  name: { ...typography.body, color: colors.text, fontWeight: '700' },
  address: { ...typography.caption, color: colors.mutedText },
  connector: { width: 44, flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xs },
  connectorLine: { flex: 1, height: 1, backgroundColor: colors.border },
  arrow: { ...typography.heading, color: colors.mutedText, marginLeft: -1, marginTop: -2 },
});
