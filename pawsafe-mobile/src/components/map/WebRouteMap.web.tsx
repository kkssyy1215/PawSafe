import { useId, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GeoJsonCoordinate, HeatSegment } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';
import type { RouteMapProps } from './NativeMap';
import { getRecommendedRouteColor } from './routeStyles';

const WIDTH = 920;
const HEIGHT = 430;
const PADDING = 54;

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
  onSegmentPress,
}: RouteMapProps) {
  const instanceId = useId().replace(/:/g, '');
  const routeGradientId = `route-${walkMode}-${instanceId}`;
  const routeShadowId = `route-shadow-${instanceId}`;
  const streetGridId = `street-grid-${instanceId}`;
  const geometry = useMemo(() => {
    const shortestCoordinates = shortest?.geometry.coordinates ?? [];
    const pawsafeCoordinates = pawsafe?.geometry.coordinates ?? [];
    const segmentCoordinates = segments?.flatMap((segment) => segment.geometry.coordinates) ?? [];
    const allCoordinates: GeoJsonCoordinate[] = [
      [origin.lng, origin.lat],
      ...(currentLocation ? [[currentLocation.lng, currentLocation.lat] as GeoJsonCoordinate] : []),
      ...shortestCoordinates,
      ...pawsafeCoordinates,
      ...segmentCoordinates,
      [destination.lng, destination.lat],
    ];
    const project = createProjector(allCoordinates);
    return {
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
  }, [currentLocation, destination.lat, destination.lng, origin.lat, origin.lng, pawsafe?.geometry.coordinates, segments, shortest?.geometry.coordinates]);

  if (!geometry.shortestPath && !geometry.pawsafePath && geometry.segmentPaths.length === 0) {
    return <View style={styles.empty}><Text style={styles.emptyTitle}>표시할 경로 좌표가 없습니다</Text><Text style={styles.emptyText}>다른 출발지와 목적지로 다시 검색해 주세요.</Text></View>;
  }

  const routeColor = getRecommendedRouteColor(walkMode);
  const routeLabel = walkMode === 'fast' ? '일반 최단경로' : 'PawSafe 추천 경로';
  return (
    <View accessible accessibilityLabel={`${origin.name}에서 ${destination.name}까지 실제 경로 좌표 지도`} style={styles.wrapper}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" style={svgStyle} aria-hidden="true">
        <defs>
          <linearGradient id={routeGradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={routeColor} />
            <stop offset="100%" stopColor={walkMode === 'fast' ? '#B36CF4' : '#6DCA7E'} />
          </linearGradient>
          <filter id={routeShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#26382C" floodOpacity="0.18" />
          </filter>
          <pattern id={streetGridId} width="118" height="86" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
            <path d="M 0 18 H 118 M 34 0 V 86" fill="none" stroke="#E5E7E1" strokeWidth="12" />
            <path d="M 0 18 H 118 M 34 0 V 86" fill="none" stroke="#FFFFFF" strokeWidth="7" />
          </pattern>
        </defs>

        <rect width={WIDTH} height={HEIGHT} rx="28" fill="#F2F3EF" />
        <rect width={WIDTH} height={HEIGHT} rx="28" fill={`url(#${streetGridId})`} opacity="0.78" />
        <path d="M 670 -20 C 735 70 720 154 806 210 C 860 246 910 258 950 260 L 950 -20 Z" fill="#DDEFE3" opacity="0.9" />
        <path d="M -20 350 C 130 302 222 350 344 315 C 446 286 520 300 610 356 L 610 460 L -20 460 Z" fill="#E8F0E5" />
        <path d="M 755 448 C 740 365 782 325 920 286" fill="none" stroke="#D7E9F0" strokeWidth="44" opacity="0.8" />

        {geometry.shortestPath ? <path d={geometry.shortestPath} fill="none" stroke={colors.routeBaseline} strokeWidth={selectedRoute === 'pawsafe' ? 6 : 9} strokeLinecap="round" strokeLinejoin="round" opacity={selectedRoute === 'pawsafe' ? 0.72 : 1} /> : null}
        {geometry.pawsafePath ? <>
          <path d={geometry.pawsafePath} fill="none" stroke="#FFFFFF" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${routeShadowId})`} />
          <path d={geometry.pawsafePath} fill="none" stroke={`url(#${routeGradientId})`} strokeWidth={selectedRoute === 'shortest' ? 6 : 9} strokeLinecap="round" strokeLinejoin="round" opacity={selectedRoute === 'shortest' ? 0.72 : 1} />
        </> : null}
        {geometry.segmentPaths.map(({ segment, path }) => selectedSegmentId === segment.edge_id && path ? <g key={`selected-${segment.edge_id}`}>
          <path d={path} fill="none" stroke="#FFFFFF" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path} fill="none" stroke={heatColors[segment.level]} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        </g> : null)}
        {geometry.segmentPaths.map(({ segment, midpoint }, index) => {
          const dotStep = Math.max(1, Math.ceil(geometry.segmentPaths.length / 36));
          if (!midpoint || (index % dotStep !== 0 && selectedSegmentId !== segment.edge_id)) return null;
          const selected = selectedSegmentId === segment.edge_id;
          return <circle key={segment.edge_id} cx={midpoint.x} cy={midpoint.y} r={selected ? 6 : 4} fill={heatColors[segment.level]} stroke="#FFFFFF" strokeWidth="2" opacity={selected ? 1 : 0.82} onClick={() => onSegmentPress?.(segment.edge_id)} style={{ cursor: onSegmentPress ? 'pointer' : 'default' }} />;
        })}

        <MapMarker point={geometry.origin} label="출발" tone="start" />
        <MapMarker point={geometry.destination} label="도착" tone="end" />
        {geometry.currentLocation ? <g transform={`translate(${geometry.currentLocation.x} ${geometry.currentLocation.y})`}><circle r="18" fill="#FFFFFF" /><circle r="11" fill="#2D7FF9" /><circle r="4" fill="#FFFFFF" /></g> : null}
      </svg>
      <View pointerEvents="none" style={styles.topBadge}>
        <View style={[styles.badgeDot, { backgroundColor: routeColor }]} />
        <Text style={styles.badgeText}>{routeLabel}</Text>
      </View>
      <View pointerEvents="none" style={styles.coordinateBadge}>
        <Text style={styles.coordinateText}>실제 경로 좌표 기반</Text>
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

function createProjector(coordinates: GeoJsonCoordinate[]) {
  const averageLatitude = coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / Math.max(1, coordinates.length);
  const longitudeScale = Math.cos(averageLatitude * Math.PI / 180);
  const normalized = coordinates.map(([longitude, latitude]) => [longitude * longitudeScale, latitude] as const);
  const xs = normalized.map(([x]) => x);
  const ys = normalized.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(maxX - minX, 0.00001);
  const rangeY = Math.max(maxY - minY, 0.00001);
  const scale = Math.min((WIDTH - PADDING * 2) / rangeX, (HEIGHT - PADDING * 2) / rangeY);
  const contentWidth = rangeX * scale;
  const contentHeight = rangeY * scale;
  const offsetX = (WIDTH - contentWidth) / 2;
  const offsetY = (HEIGHT - contentHeight) / 2;
  return ([longitude, latitude]: GeoJsonCoordinate): ProjectedPoint => ({
    x: offsetX + (longitude * longitudeScale - minX) * scale,
    y: offsetY + (maxY - latitude) * scale,
  });
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
  wrapper: { height: 370, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#D9E0D9', backgroundColor: '#F2F3EF', position: 'relative' },
  topBadge: { position: 'absolute', left: spacing.md, top: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: 'rgba(220,226,220,0.9)' },
  badgeDot: { width: 9, height: 9, borderRadius: 5 },
  badgeText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  coordinateBadge: { position: 'absolute', right: spacing.md, bottom: spacing.md, backgroundColor: 'rgba(38,49,42,0.86)', borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  coordinateText: { ...typography.caption, color: colors.white, fontSize: 11 },
  empty: { height: 280, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  emptyTitle: { ...typography.subheading, color: colors.text },
  emptyText: { ...typography.caption, color: colors.mutedText },
});
