import { Linking, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
const KMA_DATA_URL = 'https://www.data.go.kr/data/15084084/openapi.do';

export function DataAttribution() {
  return (
    <View accessible accessibilityLabel="데이터 출처" style={styles.container}>
      <Text style={styles.text}>
        보행로:{' '}
        <Text accessibilityRole="link" onPress={() => Linking.openURL(OSM_COPYRIGHT_URL)} style={styles.link}>
          © OpenStreetMap contributors · ODbL
        </Text>
        {'  '}기상:{' '}
        <Text accessibilityRole="link" onPress={() => Linking.openURL(KMA_DATA_URL)} style={styles.link}>
          기상청 공공데이터(가공)
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xs, paddingTop: spacing.xs },
  text: { ...typography.caption, color: colors.mutedText, fontSize: 10 },
  link: { color: colors.text, textDecorationLine: 'underline' },
});
