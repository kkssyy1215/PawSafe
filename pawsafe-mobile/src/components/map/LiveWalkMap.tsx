import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/src/theme/theme';

export function LiveWalkMap() {
  return (
    <View accessible accessibilityLabel="실시간 산책 지도, 현재 위치와 노면 열노출 표시" style={styles.map}>
      <View style={[styles.block, styles.blockOne]} /><View style={[styles.block, styles.blockTwo]} />
      <View style={[styles.block, styles.blockThree]} /><View style={[styles.block, styles.blockFour]} />
      <View style={[styles.heat, styles.heatOne]} /><View style={[styles.heat, styles.heatTwo]} /><View style={[styles.heat, styles.heatThree]} />
      <View style={[styles.route, styles.routeOne]} /><View style={[styles.route, styles.routeTwo]} /><View style={[styles.route, styles.routeThree]} />
      <View style={styles.pawMarker}><Text style={styles.paw}>●</Text></View>
      <View style={styles.startDot} /><View style={styles.finishDot} />
      <Text style={styles.mapLabel}>현재 위치</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 250, borderRadius: 18, overflow: 'hidden', backgroundColor: '#F1F3ED', borderWidth: 1, borderColor: colors.border },
  block: { position: 'absolute', backgroundColor: '#E6E8E1', borderRadius: 5 },
  blockOne: { width: 120, height: 76, left: 10, top: 12 }, blockTwo: { width: 114, height: 82, right: 10, top: 18 },
  blockThree: { width: 150, height: 75, left: 44, bottom: 16 }, blockFour: { width: 100, height: 70, right: 30, bottom: 20 },
  heat: { position: 'absolute', width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(240,112,44,0.30)' },
  heatOne: { left: -14, top: 92 }, heatTwo: { right: 18, top: 70 }, heatThree: { right: -18, bottom: 20 },
  route: { position: 'absolute', height: 8, borderRadius: 5, backgroundColor: colors.greenStrong, zIndex: 3 },
  routeOne: { width: 112, left: 72, top: 115, transform: [{ rotate: '0deg' }] },
  routeTwo: { width: 90, left: 178, top: 115, transform: [{ rotate: '90deg' }] },
  routeThree: { width: 112, left: 178, top: 156, transform: [{ rotate: '0deg' }] },
  pawMarker: { position: 'absolute', left: 56, top: 98, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.greenStrong, borderWidth: 5, borderColor: 'rgba(63,164,71,0.25)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  paw: { color: colors.white, fontSize: 18 }, startDot: { position: 'absolute', left: 65, top: 133, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.greenStrong, zIndex: 5 }, finishDot: { position: 'absolute', right: 64, top: 149, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.greenStrong, zIndex: 5 },
  mapLabel: { position: 'absolute', left: 12, top: 12, ...typography.caption, color: colors.text, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
