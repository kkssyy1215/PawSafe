import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GeoJsonCoordinate, HeatSegment } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';
import type { RouteMapProps } from './NativeMap';
import { getRecommendedRouteColor } from './routeStyles';

// Match the mobile map card so the real map fills it without letterboxing.
const WIDTH = 430;
const HEIGHT = 465;
const PADDING = 54;
const TILE_SIZE = 256;
const MIN_TILE_ZOOM = 10;
const MAX_TILE_ZOOM = 19;
const MAX_ZOOM_STEPS = 3;

const heatColors: Record<HeatSegment['level'], string> = {
  low: '#62B47A',
  medium: '#E1A64C',
  high: '#D66E61',
  unknown: '#8C948E',
};

interface ProjectedPoint {
  x: number;
  y: number;
}

interface MapTile extends ProjectedPoint {
  key: string;
  href: string;
}

export function WebRouteMap({
  origin,
  destination,
  currentLocation,
  shortest,
  pawsafe,
  segments,
  selectedSegmentId,
  selectedRoute,
  walkMode = 'cool',
  followCurrentLocation = false,
  onSegmentPress,
}: RouteMapProps) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [panOffset, setPanOffset] = useState<ProjectedPoint>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    panOffset: ProjectedPoint;
  } | null>(null);
  const instanceId = useId().replace(/:/g, '');
  const routeGradientId = `route-${walkMode}-${instanceId}`;
  const routeShadowId = `route-shadow-${instanceId}`;
  const shortestCoordinates = useMemo(() => shortest?.geometry.coordinates ?? [], [shortest?.geometry.coordinates]);
  const pawsafeCoordinates = useMemo(() => pawsafe?.geometry.coordinates ?? [], [pawsafe?.geometry.coordinates]);
  const segmentCoordinates = useMemo(() => segments?.flatMap((segment) => segment.geometry.coordinates) ?? [], [segments]);
  const allCoordinates = useMemo<GeoJsonCoordinate[]>(() => [
    [origin.lng, origin.lat],
    ...shortestCoordinates,
    ...pawsafeCoordinates,
    ...segmentCoordinates,
    [destination.lng, destination.lat],
  ], [destination.lat, destination.lng, origin.lat, origin.lng, pawsafeCoordinates, segmentCoordinates, shortestCoordinates]);
  const baseTileZoom = useMemo(() => findFitTileZoom(allCoordinates), [allCoordinates]);
  const maxZoomIndex = Math.min(MAX_ZOOM_STEPS, MAX_TILE_ZOOM - baseTileZoom);
  const safeZoomIndex = Math.min(zoomIndex, maxZoomIndex);
  const tileZoom = baseTileZoom + safeZoomIndex;

  useEffect(() => {
    setZoomIndex(followCurrentLocation ? Math.min(1, maxZoomIndex) : 0);
    setPanOffset({ x: 0, y: 0 });
  }, [followCurrentLocation, maxZoomIndex]);

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [tileZoom]);

  const geometry = useMemo(() => {
    const focusCoordinate = followCurrentLocation && safeZoomIndex > 0 && currentLocation
      ? [currentLocation.lng, currentLocation.lat] as GeoJsonCoordinate
      : null;
    const { project, tiles } = createTileProjector(allCoordinates, tileZoom, focusCoordinate, panOffset);
    return {
      tiles,
      shortestPath: toPath(shortestCoordinates, project),
      pawsafePath: toPath(pawsafeCoordinates, project),
      segmentPaths: segments?.map((segment) => {
        const coordinates = segment.geometry.coordinates;
        return {
          segment,
          path: toPath(coordinates, project),
          midpoint: coordinates.length ? project(coordinates[Math.floor(coordinates.length / 2)]) : null,
        };
      }) ?? [],
      origin: project([origin.lng, origin.lat]),
      destination: project([destination.lng, destination.lat]),
      currentLocation: currentLocation ? project([currentLocation.lng, currentLocation.lat]) : null,
    };
  }, [allCoordinates, currentLocation, destination.lat, destination.lng, followCurrentLocation, origin.lat, origin.lng, panOffset, pawsafeCoordinates, safeZoomIndex, segments, shortestCoordinates, tileZoom]);

  if (!geometry.shortestPath && !geometry.pawsafePath && geometry.segmentPaths.length === 0) {
    return <View style={styles.empty}><Text style={styles.emptyTitle}>표시할 경로 좌표가 없습니다</Text><Text style={styles.emptyText}>다른 출발지와 목적지로 다시 검색해 주세요.</Text></View>;
  }

  const routeColor = getRecommendedRouteColor(walkMode);
  const routeLabel = walkMode === 'fast' ? '일반 최단경로' : '온:길 추천 경로';
  const zoomPercent = 100 * (2 ** safeZoomIndex);
  const beginPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      panOffset,
    };
    setIsDragging(true);
  };
  const movePan = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const scaleX = WIDTH / Math.max(1, bounds.width);
    const scaleY = HEIGHT / Math.max(1, bounds.height);
    setPanOffset({
      x: drag.panOffset.x - (event.clientX - drag.clientX) * scaleX,
      y: drag.panOffset.y - (event.clientY - drag.clientY) * scaleY,
    });
  };
  const endPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setIsDragging(false);
  };
  return (
    <View accessible accessibilityLabel={`${origin.name}에서 ${destination.name}까지 실제 지도와 경로. 마우스나 손가락으로 지도를 이동할 수 있습니다.`} style={styles.wrapper}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ ...svgStyle, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        aria-hidden="true"
        onPointerDown={beginPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <defs>
          <linearGradient id={routeGradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={routeColor} />
            <stop offset="100%" stopColor={walkMode === 'fast' ? '#B36CF4' : '#6DCA7E'} />
          </linearGradient>
          <filter id={routeShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#26382C" floodOpacity="0.25" />
          </filter>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="#E6E9E4" />
        {geometry.tiles.map((tile) => (
          <image key={tile.key} href={tile.href} x={tile.x} y={tile.y} width={TILE_SIZE} height={TILE_SIZE} preserveAspectRatio="none" pointerEvents="none" />
        ))}

        {geometry.shortestPath ? <>
          <path d={geometry.shortestPath} fill="none" stroke="#FFFFFF" strokeWidth={selectedRoute === 'pawsafe' ? 10 : 13} strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <path d={geometry.shortestPath} fill="none" stroke={colors.routeBaseline} strokeWidth={selectedRoute === 'pawsafe' ? 6 : 9} strokeLinecap="round" strokeLinejoin="round" opacity={selectedRoute === 'pawsafe' ? 0.78 : 1} />
        </> : null}
        {geometry.pawsafePath ? <>
          <path d={geometry.pawsafePath} fill="none" stroke="#FFFFFF" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${routeShadowId})`} />
          <path d={geometry.pawsafePath} fill="none" stroke={`url(#${routeGradientId})`} strokeWidth={selectedRoute === 'shortest' ? 6 : 9} strokeLinecap="round" strokeLinejoin="round" opacity={selectedRoute === 'shortest' ? 0.78 : 1} />
        </> : null}
        {geometry.segmentPaths.map(({ segment, path }) => selectedSegmentId === segment.edge_id && path ? <g key={`selected-${segment.edge_id}`}>
          <path d={path} fill="none" stroke="#FFFFFF" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path} fill="none" stroke={heatColors[segment.level]} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        </g> : null)}
        {geometry.segmentPaths.map(({ segment, midpoint }, index) => {
          const dotStep = Math.max(1, Math.ceil(geometry.segmentPaths.length / 36));
          if (!midpoint || (index % dotStep !== 0 && selectedSegmentId !== segment.edge_id)) return null;
          const selected = selectedSegmentId === segment.edge_id;
          return <circle key={segment.edge_id} cx={midpoint.x} cy={midpoint.y} r={selected ? 6 : 4} fill={heatColors[segment.level]} stroke="#FFFFFF" strokeWidth="2" opacity={selected ? 1 : 0.9} onClick={() => onSegmentPress?.(segment.edge_id)} style={{ cursor: onSegmentPress ? 'pointer' : 'default' }} />;
        })}

        <MapMarker point={geometry.origin} label="출발" tone="start" />
        <MapMarker point={geometry.destination} label="도착" tone="end" />
        {geometry.currentLocation ? <g transform={`translate(${geometry.currentLocation.x} ${geometry.currentLocation.y})`}><circle r="19" fill="#FFFFFF" opacity="0.94" /><circle r="12" fill="#2D7FF9" /><circle r="4" fill="#FFFFFF" /></g> : null}
      </svg>
      <View pointerEvents="none" style={styles.topBadge}>
        <View style={[styles.badgeDot, { backgroundColor: routeColor }]} />
        <Text style={styles.badgeText}>{routeLabel}</Text>
      </View>
      <Pressable accessibilityRole="link" accessibilityLabel="OpenStreetMap 저작권과 라이선스 보기" onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')} style={styles.osmAttribution}>
        <Text style={styles.osmAttributionText}>© OpenStreetMap contributors</Text>
      </Pressable>
      <View pointerEvents="none" style={styles.coordinateBadge}>
        <Text style={styles.coordinateText}>실제 지도 · 경로 좌표</Text>
      </View>
      <View style={styles.zoomControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="지도 확대"
          accessibilityState={{ disabled: safeZoomIndex === maxZoomIndex }}
          disabled={safeZoomIndex === maxZoomIndex}
          hitSlop={4}
          onPress={() => setZoomIndex((current) => Math.min(maxZoomIndex, current + 1))}
          style={({ pressed }) => [styles.zoomButton, pressed && styles.zoomButtonPressed, safeZoomIndex === maxZoomIndex && styles.zoomButtonDisabled]}
        >
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="지도 축소"
          accessibilityState={{ disabled: safeZoomIndex === 0 }}
          disabled={safeZoomIndex === 0}
          hitSlop={4}
          onPress={() => setZoomIndex((current) => Math.max(0, current - 1))}
          style={({ pressed }) => [styles.zoomButton, pressed && styles.zoomButtonPressed, safeZoomIndex === 0 && styles.zoomButtonDisabled]}
        >
          <Ionicons name="remove" size={22} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="지도 전체 경로 맞춤" hitSlop={4} onPress={() => { setZoomIndex(0); setPanOffset({ x: 0, y: 0 }); }} style={({ pressed }) => [styles.zoomButton, pressed && styles.zoomButtonPressed]}>
          <Ionicons name="scan-outline" size={19} color={colors.greenStrong} />
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={styles.zoomLevel}>{zoomPercent}%</Text>
      </View>
    </View>
  );
}

function MapMarker({ point, label, tone }: { point: ProjectedPoint; label: string; tone: 'start' | 'end' }) {
  const fill = tone === 'start' ? '#263F31' : '#F08A3C';
  return <g transform={`translate(${point.x} ${point.y})`}>
    <circle r="17" fill="#FFFFFF" opacity="0.96" />
    <circle r="11" fill={fill} />
    <circle r="4" fill="#FFFFFF" />
    <rect x="-25" y={tone === 'start' ? 22 : -48} width="50" height="24" rx="12" fill="#26312A" opacity="0.94" />
    <text x="0" y={tone === 'start' ? 39 : -31} fill="#FFFFFF" fontSize="12" fontWeight="700" textAnchor="middle">{label}</text>
  </g>;
}

function findFitTileZoom(coordinates: GeoJsonCoordinate[]) {
  for (let zoom = MAX_TILE_ZOOM; zoom >= MIN_TILE_ZOOM; zoom -= 1) {
    const points = coordinates.map((coordinate) => toWorldPixel(coordinate, zoom));
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    if (Math.max(...xs) - Math.min(...xs) <= WIDTH - PADDING * 2 && Math.max(...ys) - Math.min(...ys) <= HEIGHT - PADDING * 2) return zoom;
  }
  return MIN_TILE_ZOOM;
}

function createTileProjector(
  coordinates: GeoJsonCoordinate[],
  zoom: number,
  focusCoordinate: GeoJsonCoordinate | null,
  panOffset: ProjectedPoint,
) {
  const worldPoints = coordinates.map((coordinate) => toWorldPixel(coordinate, zoom));
  const xs = worldPoints.map((point) => point.x);
  const ys = worldPoints.map((point) => point.y);
  const center = focusCoordinate
    ? toWorldPixel(focusCoordinate, zoom)
    : { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const topLeft = {
    x: center.x - WIDTH / 2 + panOffset.x,
    y: center.y - HEIGHT / 2 + panOffset.y,
  };
  const project = (coordinate: GeoJsonCoordinate): ProjectedPoint => {
    const point = toWorldPixel(coordinate, zoom);
    return { x: point.x - topLeft.x, y: point.y - topLeft.y };
  };
  const tileCount = 2 ** zoom;
  const firstTileX = Math.floor(topLeft.x / TILE_SIZE);
  const lastTileX = Math.floor((topLeft.x + WIDTH) / TILE_SIZE);
  const firstTileY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE));
  const lastTileY = Math.min(tileCount - 1, Math.floor((topLeft.y + HEIGHT) / TILE_SIZE));
  const tiles: MapTile[] = [];
  for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
    for (let rawTileX = firstTileX; rawTileX <= lastTileX; rawTileX += 1) {
      const tileX = ((rawTileX % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${zoom}/${rawTileX}/${tileY}`,
        href: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
        x: rawTileX * TILE_SIZE - topLeft.x,
        y: tileY * TILE_SIZE - topLeft.y,
      });
    }
  }
  return { project, tiles };
}

function toWorldPixel([longitude, latitude]: GeoJsonCoordinate, zoom: number): ProjectedPoint {
  const worldSize = TILE_SIZE * (2 ** zoom);
  const safeLatitude = Math.min(85.05112878, Math.max(-85.05112878, latitude));
  const latitudeRadians = safeLatitude * Math.PI / 180;
  return {
    x: (longitude + 180) / 360 * worldSize,
    y: (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * worldSize,
  };
}

function toPath(coordinates: GeoJsonCoordinate[], project: (coordinate: GeoJsonCoordinate) => ProjectedPoint) {
  if (coordinates.length < 2) return '';
  const step = Math.max(1, Math.floor(coordinates.length / 350));
  const sampled = coordinates.filter((_, index) => index % step === 0 || index === coordinates.length - 1);
  return sampled.map((coordinate, index) => {
    const point = project(coordinate);
    return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(' ');
}

const svgStyle = { display: 'block', width: '100%', height: '100%' } as const;

const styles = StyleSheet.create({
  wrapper: { height: 370, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#D9E0D9', backgroundColor: '#E6E9E4', position: 'relative' },
  topBadge: { position: 'absolute', left: spacing.md, top: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: 'rgba(220,226,220,0.9)' },
  badgeDot: { width: 9, height: 9, borderRadius: 5 },
  badgeText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  osmAttribution: { position: 'absolute', left: spacing.sm, bottom: spacing.sm, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: spacing.sm, paddingVertical: 3 },
  osmAttributionText: { ...typography.caption, color: '#3D4A41', fontSize: 9, textDecorationLine: 'underline' },
  coordinateBadge: { position: 'absolute', right: spacing.md, bottom: spacing.md, backgroundColor: 'rgba(38,49,42,0.86)', borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  coordinateText: { ...typography.caption, color: colors.white, fontSize: 11 },
  zoomControls: { position: 'absolute', right: spacing.sm, top: spacing.sm, alignItems: 'center', gap: 4, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)', padding: 4, borderWidth: 1, borderColor: 'rgba(210,218,211,0.96)', shadowColor: '#26382C', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  zoomButton: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  zoomButtonPressed: { backgroundColor: colors.greenSoft },
  zoomButtonDisabled: { opacity: 0.35 },
  zoomLevel: { ...typography.caption, color: colors.mutedText, fontSize: 9, fontWeight: '700', paddingBottom: 2 },
  empty: { height: 280, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  emptyTitle: { ...typography.subheading, color: colors.text },
  emptyText: { ...typography.caption, color: colors.mutedText },
});
