import { useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDepartureTime } from '@/src/features/walk/utils/dateTime';
import { colors, spacing, typography } from '@/src/theme/theme';

export function DepartureTimePicker({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const handleChange = (_event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') {
      if (next && pickerMode === 'date') {
        const merged = new Date(next); merged.setHours(value.getHours(), value.getMinutes(), 0, 0); onChange(merged); setPickerMode('time');
      } else { if (next) onChange(next); setPickerMode(null); }
    } else if (next) onChange(next);
  };
  return (
    <View style={styles.group}>
      <Text style={styles.label}>산책 시작 시각</Text>
      <Pressable
        testID="departure-time-button"
        accessibilityRole="button"
        accessibilityLabel={`산책 시작 시각, ${formatDepartureTime(value)}`}
        accessibilityHint="날짜와 시간을 변경합니다."
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => setPickerMode('date')}
      ><Text style={styles.value}>{formatDepartureTime(value)}</Text><Text style={styles.change}>변경</Text></Pressable>
      {pickerMode ? <DateTimePicker
        testID="departure-datetime-picker"
        value={value}
        mode={Platform.OS === 'ios' ? 'datetime' : pickerMode}
        display={Platform.OS === 'ios' ? 'compact' : 'default'}
        minimumDate={new Date()}
        maximumDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
        onChange={handleChange}
      /> : null}
      {Platform.OS === 'ios' && pickerMode ? <Pressable accessibilityRole="button" style={styles.done} onPress={() => setPickerMode(null)}><Text style={styles.change}>선택 완료</Text></Pressable> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: spacing.sm }, label: { ...typography.subheading, color: colors.text },
  button: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: spacing.md },
  pressed: { backgroundColor: colors.greenSoft }, value: { ...typography.body, color: colors.text }, change: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  done: { minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
});
