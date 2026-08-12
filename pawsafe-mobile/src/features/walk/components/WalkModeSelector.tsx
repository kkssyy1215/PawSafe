import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { WalkMode } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';

const modes: { id: WalkMode; title: string; description: string }[] = [
  { id: 'fast', title: '빠른 산책', description: '이동 거리를 우선해 경로를 비교합니다.' },
  { id: 'balanced', title: '균형 산책', description: '거리와 상대 열노출을 함께 고려합니다.' },
  { id: 'cool', title: '시원한 산책', description: '상대 열노출 감소를 우선해 경로를 비교합니다.' },
];

export function WalkModeSelector({ value, onChange }: { value: WalkMode; onChange: (mode: WalkMode) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      <Text style={styles.label}>산책 유형</Text>
      {modes.map((mode) => {
        const selected = value === mode.id;
        return (
          <Pressable
            key={mode.id}
            testID={`walk-mode-${mode.id}`}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={`${mode.title}. ${mode.description}`}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
            onPress={() => onChange(mode.id)}
          >
            <View style={[styles.radio, selected && styles.radioSelected]}><View style={selected ? styles.dot : undefined} /></View>
            <View style={styles.copy}><Text style={styles.title}>{mode.title}</Text><Text style={styles.description}>{mode.description}</Text></View>
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: spacing.sm }, label: { ...typography.subheading, color: colors.text, marginBottom: spacing.xs },
  option: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  selected: { borderColor: colors.green, backgroundColor: colors.greenSoft }, pressed: { opacity: 0.78 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.mutedText, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.greenStrong }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.greenStrong },
  copy: { flex: 1, gap: 2 }, title: { ...typography.body, color: colors.text, fontWeight: '700' }, description: { ...typography.caption, color: colors.mutedText },
});
