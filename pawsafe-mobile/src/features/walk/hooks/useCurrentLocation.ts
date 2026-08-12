import { useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { PlaceSearchResult } from '@/src/api/contracts';
import { getPlaceSearchProvider } from '@/src/providers/places/createPlaceSearchProvider';

type LocationError = 'permission-denied' | 'permission-blocked' | 'services-disabled' | 'unavailable' | null;

export function useCurrentLocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LocationError>(null);
  const controller = useRef<AbortController | null>(null);

  const getCurrentPlace = async (): Promise<PlaceSearchResult | null> => {
    if (isLoading) return null;
    setIsLoading(true);
    setError(null);
    controller.current?.abort();
    controller.current = new AbortController();
    try {
      if (!(await Location.hasServicesEnabledAsync())) {
        setError('services-disabled');
        return null;
      }
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        if (!permission.canAskAgain) {
          setError('permission-blocked');
          return null;
        }
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setError(permission.canAskAgain ? 'permission-denied' : 'permission-blocked');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = position.coords;
      const provider = getPlaceSearchProvider();
      if (provider.reverseGeocode) {
        try { return await provider.reverseGeocode(lat, lng, controller.current.signal); } catch { /* coordinate fallback */ }
      }
      return { id: `current_${lat.toFixed(5)}_${lng.toFixed(5)}`, name: '현재 위치', address: '주소 및 분석 범위 확인 전', lat, lng, is_in_coverage: false };
    } catch {
      setError('unavailable');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const message = error === 'services-disabled' ? '기기의 위치 서비스를 켠 뒤 다시 시도하거나 장소를 검색해 주세요.'
    : error === 'permission-blocked' ? '설정에서 위치 권한을 허용하거나 출발지를 직접 검색해 주세요.'
    : error === 'permission-denied' ? '위치 권한 없이도 출발지를 직접 검색할 수 있어요.'
    : error === 'unavailable' ? '현재 위치를 확인하지 못했습니다. 출발지를 직접 검색해 주세요.' : null;
  return { getCurrentPlace, isLoading, error, message };
}
