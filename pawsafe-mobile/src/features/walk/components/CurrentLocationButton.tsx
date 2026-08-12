import type { PlaceSearchResult } from '@/src/api/contracts';
import { AppButton } from '@/src/components/common/AppButton';
import { Notice } from '@/src/components/common/Notice';
import { useCurrentLocation } from '@/src/features/walk/hooks/useCurrentLocation';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/src/theme/spacing';

export function CurrentLocationButton({ onSelect }: { onSelect: (place: PlaceSearchResult) => void }) {
  const { getCurrentPlace, isLoading, message } = useCurrentLocation();
  return (
    <View style={styles.container}>
      <AppButton
        variant="quiet"
        loading={isLoading}
        accessibilityLabel="현재 위치를 출발지로 사용"
        accessibilityHint="누르면 앱 사용 중 위치 권한을 요청합니다."
        onPress={async () => { const place = await getCurrentPlace(); if (place) onSelect(place); }}
      >현재 위치 사용</AppButton>
      {message ? <Notice tone="warning" accessibilityLiveRegion="polite">{message}</Notice> : null}
    </View>
  );
}
const styles = StyleSheet.create({ container: { gap: spacing.sm } });
