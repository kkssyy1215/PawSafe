import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Place } from '@/src/api/contracts';
import { AppButton } from '@/src/components/common/AppButton';
import { AppTextField } from '@/src/components/common/AppTextField';
import type { SavedPlace } from '@/src/features/walk/hooks/useSavedPlaces';
import { colors, spacing, typography } from '@/src/theme/theme';

interface SavedPlacePickerProps {
  selectedOrigin: Place | null;
  savedPlaces: SavedPlace[];
  onSelect: (place: SavedPlace) => void;
  onSave: (label: string) => Promise<void> | void;
  onDelete: (id: string) => void;
}

export function SavedPlacePicker({ selectedOrigin, savedPlaces, onSelect, onSave, onDelete }: SavedPlacePickerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [label, setLabel] = useState('우리집');
  const selectedIsSaved = selectedOrigin ? savedPlaces.some((place) => place.id === selectedOrigin.id) : false;

  const openSaveModal = () => {
    setLabel('우리집');
    setIsModalVisible(true);
  };

  const save = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    void onSave(trimmed);
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {savedPlaces.length > 0 ? (
        <View style={styles.savedSection}>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>자주 쓰는 장소</Text>
              <Text style={styles.description}>한 번 저장하면 다음에도 바로 선택할 수 있어요.</Text>
            </View>
            <Text accessibilityElementsHidden style={styles.leaf}>🍃</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list} accessibilityRole="list">
            {savedPlaces.map((place) => {
              const active = selectedOrigin?.id === place.id;
              return (
                <View key={place.id} style={[styles.savedCard, active && styles.activeCard]}>
                  <Pressable
                    testID={`saved-place-${place.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${place.label}, ${place.address}, 출발지로 선택`}
                    style={({ pressed }) => [styles.savedCardButton, pressed && styles.pressed]}
                    onPress={() => onSelect(place)}
                  >
                    <Text style={styles.placeLabel} numberOfLines={1}>{place.label}</Text>
                    <Text style={styles.address} numberOfLines={2}>{place.address}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${place.label} 저장 삭제`}
                    hitSlop={8}
                    style={styles.deleteButton}
                    onPress={() => onDelete(place.id)}
                  >
                    <Text style={styles.deleteText}>삭제</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {selectedOrigin && !selectedIsSaved ? (
        <Pressable
          testID="save-origin-place"
          accessibilityRole="button"
          accessibilityLabel="이 출발지를 자주 쓰는 장소로 저장"
          style={({ pressed }) => [styles.savePrompt, pressed && styles.pressed]}
          onPress={openSaveModal}
        >
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.savePromptText}>이 출발지를 자주 쓰는 장소로 저장</Text>
        </Pressable>
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <Text style={styles.modalTitle}>장소 이름을 정해 주세요</Text>
            <Text style={styles.modalDescription}>예: 우리집, 회사, 부모님댁</Text>
            <AppTextField
              testID="saved-place-name-input"
              accessibilityLabel="저장할 장소 이름"
              value={label}
              onChangeText={setLabel}
              placeholder="우리집"
              autoFocus
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={save}
            />
            <View style={styles.modalActions}>
              <AppButton fullWidth={false} variant="quiet" onPress={() => setIsModalVisible(false)}>취소</AppButton>
              <AppButton fullWidth={false} testID="confirm-save-place" disabled={!label.trim()} onPress={save}>저장하기</AppButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  savedSection: { gap: spacing.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headingCopy: { flex: 1, gap: 2 },
  title: { ...typography.subheading, color: colors.text },
  description: { ...typography.caption, color: colors.mutedText },
  leaf: { color: colors.greenStrong, fontSize: 22 },
  list: { gap: spacing.sm, paddingRight: spacing.md },
  savedCard: { width: 164, minHeight: 108, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' },
  activeCard: { borderColor: colors.greenStrong, backgroundColor: colors.greenSoft },
  savedCardButton: { flex: 1, padding: spacing.md, gap: spacing.xs },
  pressed: { opacity: 0.78 },
  placeLabel: { ...typography.body, color: colors.text, fontWeight: '700' },
  address: { ...typography.caption, color: colors.mutedText },
  deleteButton: { minHeight: 32, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  deleteText: { ...typography.caption, color: colors.mutedText, fontWeight: '600' },
  savePrompt: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  plus: { ...typography.body, color: colors.greenStrong, fontWeight: '700' },
  savePromptText: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(20, 31, 24, 0.36)' },
  modalCard: { gap: spacing.md, borderRadius: 18, padding: spacing.lg, backgroundColor: colors.surface },
  modalTitle: { ...typography.subheading, color: colors.text },
  modalDescription: { ...typography.caption, color: colors.mutedText },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
