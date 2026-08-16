import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Place, PlaceSearchResult } from '@/src/api/contracts';
import { pipelineDemoPlaces } from '@/src/mocks/demoRouteCandidates';
import { colors, spacing, typography } from '@/src/theme/theme';

interface RegisteredPlacePickerProps {
  label: string;
  field: 'origin' | 'destination';
  selected: Place | null;
  pairedWith?: Place | null;
  onSelect: (place: PlaceSearchResult | null) => void;
}

export function RegisteredPlacePicker({ label, field, selected, pairedWith, onSelect }: RegisteredPlacePickerProps) {
  const [open, setOpen] = useState(false);
  const suffix = field === 'origin' ? '_origin' : '_destination';
  const pairedId = field === 'destination' && pairedWith?.id.endsWith('_origin')
    ? `${pairedWith.id.slice(0, -'_origin'.length)}_destination`
    : null;
  const options = useMemo(
    () => pipelineDemoPlaces.filter((place) => place.id.endsWith(suffix) && (!pairedId || place.id === pairedId)),
    [pairedId, suffix],
  );

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        testID={`${field}-picker`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label} 후보 선택${selected ? `, 현재 ${selected.name}` : ''}`}
        style={({ pressed }) => [styles.trigger, selected && styles.selectedTrigger, pressed && styles.pressed]}
        onPress={() => setOpen((value) => !value)}
      >
        <View style={[styles.pin, selected && styles.selectedPin]}><Text style={[styles.pinText, selected && styles.selectedPinText]}>{field === 'origin' ? '●' : '◎'}</Text></View>
        <View style={styles.copy}>
          <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>{selected?.name ?? `등록된 ${label} 선택`}</Text>
          {selected ? <Text style={styles.meta} numberOfLines={1}>{selected.address}</Text> : null}
        </View>
        <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open ? (
        <View accessibilityRole="list" style={styles.menu}>
          <ScrollView nestedScrollEnabled style={styles.menuScroll}>
            {options.map((place) => (
              <Pressable
                key={place.id}
                testID={`${field}-option-${place.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${place.name}, ${place.address}`}
                style={({ pressed }) => [styles.option, selected?.id === place.id && styles.selectedOption, pressed && styles.pressed]}
                onPress={() => { onSelect(place); setOpen(false); }}
              >
                <View style={styles.copy}>
                  <Text style={styles.optionTitle}>{place.name}</Text>
                  <Text style={styles.meta} numberOfLines={2}>{place.address}</Text>
                </View>
                {selected?.id === place.id ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.text, fontWeight: '700' },
  trigger: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  selectedTrigger: { borderColor: '#C8D8CB' },
  pin: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2EE' },
  selectedPin: { backgroundColor: colors.greenSoft },
  pinText: { color: colors.mutedText, fontSize: 14 },
  selectedPinText: { color: colors.greenStrong },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  value: { ...typography.body, color: colors.text, fontWeight: '700' },
  placeholder: { color: colors.mutedText, fontWeight: '400' },
  meta: { ...typography.caption, color: colors.mutedText, fontSize: 11, lineHeight: 16 },
  chevron: { color: colors.mutedText, fontSize: 18 },
  menu: { maxHeight: 280, borderWidth: 1, borderColor: colors.border, borderRadius: 13, overflow: 'hidden', backgroundColor: colors.surface },
  menuScroll: { maxHeight: 280 },
  option: { minHeight: 64, flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  selectedOption: { backgroundColor: colors.greenSoft },
  optionTitle: { ...typography.body, color: colors.text, fontWeight: '700' },
  check: { ...typography.body, color: colors.greenStrong, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
