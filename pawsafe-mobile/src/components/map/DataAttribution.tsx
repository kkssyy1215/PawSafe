import { Linking, StyleSheet, Text, View } from 'react-native';
import type { WalkMode } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

export function DataAttribution({ walkMode = 'cool' }: { walkMode?: WalkMode }) {
  const isFast = walkMode === 'fast';
  return (
    <View accessible accessibilityLabel="데이터 출처" style={styles.container}>
      <Text style={styles.text}>
        보행로:{' '}
        <Text accessibilityRole="link" onPress={() => Linking.openURL(OSM_COPYRIGHT_URL)} style={styles.link}>
          © OpenStreetMap contributors · ODbL
        </Text>
        {isFast ? <>{'  '}경로: 온:길 모델 그래프</> : <>{'  '}기상: 기상청 ASOS 관측자료(가공)</>}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xs, paddingTop: spacing.xs },
  text: { ...typography.caption, color: colors.mutedText, fontSize: 10 },
  link: { color: colors.text, textDecorationLine: 'underline' },
});
