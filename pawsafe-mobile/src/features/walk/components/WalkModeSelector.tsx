import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { WalkMode } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';

const modes: { id: WalkMode; title: string; description: string; icon: string; recommended?: boolean }[] = [
  { id: 'fast', title: '빠른 산책', description: '가장 거리가 짧은 경로 우선', icon: '↯' },
  { id: 'cool', title: '시원한 산책', description: '직사광선과 지면 열노출을 최소화', icon: '☼', recommended: true },
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
            <View style={[styles.icon, selected && styles.iconSelected]}><Text style={[styles.iconText, selected && styles.iconTextSelected]}>{mode.icon}</Text></View>
            <View style={styles.copy}><Text style={styles.title}>{mode.title}</Text><Text style={styles.description}>{mode.description}</Text></View>
            {mode.recommended ? <Text style={styles.badge}>추천</Text> : null}
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
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDF7EF' },
  iconSelected: { backgroundColor: colors.greenStrong }, iconText: { fontSize: 22, color: colors.greenStrong, fontWeight: '700' }, iconTextSelected: { color: colors.white },
  copy: { flex: 1, gap: 2 }, title: { ...typography.body, color: colors.text, fontWeight: '700' }, description: { ...typography.caption, color: colors.mutedText },
  badge: { ...typography.caption, color: colors.greenStrong, backgroundColor: '#D9F0DD', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, fontWeight: '700' },
});
