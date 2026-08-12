import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { WalkMode } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';

const modes: { id: WalkMode; title: string; description: string; recommended?: boolean }[] = [
  { id: 'fast', title: '빠른 산책', description: '이동 거리를 우선해 경로를 비교합니다.' },
  { id: 'cool', title: '시원한 산책', description: '노면온도와 상대 열노출을 낮추는 경로를 우선합니다.', recommended: true },
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
            <View style={styles.copy}><View style={styles.titleRow}><Text style={styles.title}>{mode.title}</Text>{mode.recommended ? <Text style={styles.badge}>추천</Text> : null}</View><Text style={styles.description}>{mode.description}</Text></View>
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
  copy: { flex: 1, gap: 2 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, title: { ...typography.body, color: colors.text, fontWeight: '700' }, description: { ...typography.caption, color: colors.mutedText }, badge: { ...typography.caption, color: colors.white, backgroundColor: colors.greenStrong, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 2, fontWeight: '700' },
});
