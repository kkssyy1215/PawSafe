import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { HeatSegment, Place, RouteStats } from '@/src/api/contracts';
import { DEFAULT_MAP_REGION } from '@/src/config/constants';
import { colors, spacing, typography } from '@/src/theme/theme';
import { geometryToMapCoordinates } from './mapUtils';

export interface RouteMapProps {
  origin: Place;
  destination: Place;
  shortest?: RouteStats;
  pawsafe?: RouteStats;
  segments?: HeatSegment[];
  selectedSegmentId?: string | null;
  selectedRoute?: 'shortest' | 'pawsafe' | null;
  onSegmentPress?: (id: string) => void;
}

const segmentColors: Record<HeatSegment['level'], string> = { low: colors.low, medium: colors.medium, high: colors.high, unknown: colors.unknown };

export function NativeMap({ origin, destination, shortest, pawsafe, segments, selectedSegmentId, selectedRoute, onSegmentPress }: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const shortestCoordinates = useMemo(() => geometryToMapCoordinates(shortest?.geometry), [shortest]);
  const pawsafeCoordinates = useMemo(() => geometryToMapCoordinates(pawsafe?.geometry), [pawsafe]);
  const allCoordinates = useMemo(() => [
    { latitude: origin.lat, longitude: origin.lng }, ...shortestCoordinates, ...pawsafeCoordinates,
    { latitude: destination.lat, longitude: destination.lng },
  ], [destination.lat, destination.lng, origin.lat, origin.lng, pawsafeCoordinates, shortestCoordinates]);
  useEffect(() => {
    const id = setTimeout(() => { if (!loaded) setTimedOut(true); }, 8_000);
    return () => clearTimeout(id);
  }, [loaded]);
  useEffect(() => {
    if (loaded && allCoordinates.length >= 2) mapRef.current?.fitToCoordinates(allCoordinates, { edgePadding: { top: 48, right: 36, bottom: 48, left: 36 }, animated: false });
  }, [allCoordinates, loaded]);

  if (shortestCoordinates.length === 0 && pawsafeCoordinates.length === 0 && (!segments || segments.length === 0)) {
    return <View accessible accessibilityLiveRegion="polite" style={styles.fallback}><Text style={styles.fallbackTitle}>표시할 경로 좌표가 없습니다</Text><Text style={styles.fallbackText}>아래 텍스트 요약에서 경로 정보를 확인해 주세요.</Text></View>;
  }
  if (timedOut && !loaded) {
    return <View accessible accessibilityLiveRegion="assertive" style={styles.fallback}><Text style={styles.fallbackTitle}>지도를 불러오지 못했습니다</Text><Text style={styles.fallbackText}>네트워크를 확인하거나 아래 텍스트 요약을 이용해 주세요.</Text></View>;
  }
  return (
    <View style={styles.wrapper}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={DEFAULT_MAP_REGION} onMapReady={() => setLoaded(true)} onMapLoaded={() => setLoaded(true)} accessibilityLabel="경로 지도">
        <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title="출발" description={origin.name} pinColor={colors.greenStrong} />
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title="도착" description={destination.name} pinColor={colors.orange} />
        {shortestCoordinates.length > 1 ? <Polyline coordinates={shortestCoordinates} strokeColor={colors.orange} strokeWidth={selectedRoute === 'pawsafe' ? 4 : 6} lineDashPattern={[9, 5]} zIndex={2} /> : null}
        {pawsafeCoordinates.length > 1 ? <Polyline coordinates={pawsafeCoordinates} strokeColor={colors.greenStrong} strokeWidth={selectedRoute === 'shortest' ? 4 : 7} zIndex={3} /> : null}
        {segments?.map((segment) => {
          const coordinates = geometryToMapCoordinates(segment.geometry);
          if (coordinates.length < 2) return null;
          return <Polyline key={segment.edge_id} coordinates={coordinates} strokeColor={segmentColors[segment.level]} strokeWidth={selectedSegmentId === segment.edge_id ? 11 : 8} tappable onPress={() => onSegmentPress?.(segment.edge_id)} zIndex={selectedSegmentId === segment.edge_id ? 7 : 5} />;
        })}
      </MapView>
      {!loaded ? <View accessible accessibilityLabel="지도 불러오는 중" accessibilityState={{ busy: true }} style={styles.loading}><ActivityIndicator color={colors.greenStrong} /><Text style={styles.loadingText}>지도 불러오는 중</Text></View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { height: 300, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.greenSoft },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, loadingText: { ...typography.caption, color: colors.mutedText },
  fallback: { height: 220, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  fallbackTitle: { ...typography.subheading, color: colors.text, textAlign: 'center' }, fallbackText: { ...typography.caption, color: colors.mutedText, textAlign: 'center' },
});
