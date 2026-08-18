import type { GeoJsonCoordinate } from '@/src/api/contracts';

const EARTH_RADIUS_M = 6_371_000;
const MIN_POINT_DISTANCE_M = 1;
const TURN_LOOK_DISTANCE_M = 10;
const TURN_THRESHOLD_DEGREES = 35;
const TURN_MERGE_DISTANCE_M = 18;

export type NavigationTurnType =
  | 'start'
  | 'slight_left'
  | 'left'
  | 'slight_right'
  | 'right'
  | 'uturn'
  | 'arrive';

export interface NavigationCoordinate {
  lat: number;
  lng: number;
}

export interface NavigationStep {
  id: string;
  type: NavigationTurnType;
  coordinate: NavigationCoordinate;
  distanceFromStartM: number;
  instruction: string;
  angleDegrees: number;
}

export interface PreparedNavigationRoute {
  coordinates: NavigationCoordinate[];
  cumulativeDistancesM: number[];
  totalDistanceM: number;
  steps: NavigationStep[];
}

export interface RouteMatch {
  nearestCoordinate: NavigationCoordinate;
  distanceToRouteM: number;
  distanceAlongRouteM: number;
  remainingDistanceM: number;
  segmentIndex: number;
}

export function prepareNavigationRoute(coordinates: GeoJsonCoordinate[]): PreparedNavigationRoute {
  const routeCoordinates = deduplicateCoordinates(coordinates.map(([lng, lat]) => ({ lat, lng })));
  if (routeCoordinates.length === 0) {
    return { coordinates: [], cumulativeDistancesM: [], totalDistanceM: 0, steps: [] };
  }

  const cumulativeDistancesM = [0];
  for (let index = 1; index < routeCoordinates.length; index += 1) {
    cumulativeDistancesM.push(
      cumulativeDistancesM[index - 1] + distanceMeters(routeCoordinates[index - 1], routeCoordinates[index]),
    );
  }
  const totalDistanceM = cumulativeDistancesM[cumulativeDistancesM.length - 1];
  const candidates: NavigationStep[] = [];

  for (let index = 1; index < routeCoordinates.length - 1; index += 1) {
    const previousIndex = findCoordinateBefore(cumulativeDistancesM, index, TURN_LOOK_DISTANCE_M);
    const nextIndex = findCoordinateAfter(cumulativeDistancesM, index, TURN_LOOK_DISTANCE_M);
    if (previousIndex === index || nextIndex === index) continue;

    const incomingBearing = bearingDegrees(routeCoordinates[previousIndex], routeCoordinates[index]);
    const outgoingBearing = bearingDegrees(routeCoordinates[index], routeCoordinates[nextIndex]);
    const turnAngle = normalizeAngle(outgoingBearing - incomingBearing);
    if (Math.abs(turnAngle) < TURN_THRESHOLD_DEGREES) continue;

    const type = turnTypeForAngle(turnAngle);
    candidates.push({
      id: `turn-${index}`,
      type,
      coordinate: routeCoordinates[index],
      distanceFromStartM: cumulativeDistancesM[index],
      instruction: instructionForTurn(type),
      angleDegrees: turnAngle,
    });
  }

  const start: NavigationStep = {
    id: 'start',
    type: 'start',
    coordinate: routeCoordinates[0],
    distanceFromStartM: 0,
    instruction: instructionForTurn('start'),
    angleDegrees: 0,
  };
  const arrive: NavigationStep = {
    id: 'arrive',
    type: 'arrive',
    coordinate: routeCoordinates[routeCoordinates.length - 1],
    distanceFromStartM: totalDistanceM,
    instruction: instructionForTurn('arrive'),
    angleDegrees: 0,
  };

  return {
    coordinates: routeCoordinates,
    cumulativeDistancesM,
    totalDistanceM,
    steps: [start, ...mergeNearbyTurns(candidates), arrive],
  };
}

export function matchPositionToRoute(
  route: PreparedNavigationRoute,
  position: NavigationCoordinate,
): RouteMatch | null {
  if (route.coordinates.length === 0) return null;
  if (route.coordinates.length === 1) {
    return {
      nearestCoordinate: route.coordinates[0],
      distanceToRouteM: distanceMeters(position, route.coordinates[0]),
      distanceAlongRouteM: 0,
      remainingDistanceM: 0,
      segmentIndex: 0,
    };
  }

  let bestMatch: RouteMatch | null = null;
  for (let index = 0; index < route.coordinates.length - 1; index += 1) {
    const start = route.coordinates[index];
    const end = route.coordinates[index + 1];
    const projected = projectOntoSegment(position, start, end);
    const segmentDistance = route.cumulativeDistancesM[index + 1] - route.cumulativeDistancesM[index];
    const distanceAlongRouteM = route.cumulativeDistancesM[index] + segmentDistance * projected.fraction;
    const match: RouteMatch = {
      nearestCoordinate: projected.coordinate,
      distanceToRouteM: projected.distanceM,
      distanceAlongRouteM,
      remainingDistanceM: Math.max(0, route.totalDistanceM - distanceAlongRouteM),
      segmentIndex: index,
    };
    if (!bestMatch || match.distanceToRouteM < bestMatch.distanceToRouteM) bestMatch = match;
  }
  return bestMatch;
}

export function getNextNavigationStep(route: PreparedNavigationRoute, distanceAlongRouteM: number) {
  return route.steps.find((step) => step.type !== 'start' && step.distanceFromStartM >= distanceAlongRouteM - 2)
    ?? route.steps[route.steps.length - 1]
    ?? null;
}

export function instructionForTurn(type: NavigationTurnType) {
  switch (type) {
    case 'start': return '경로를 따라 출발하세요.';
    case 'slight_left': return '왼쪽 방향으로 이동하세요.';
    case 'left': return '좌회전하세요.';
    case 'slight_right': return '오른쪽 방향으로 이동하세요.';
    case 'right': return '우회전하세요.';
    case 'uturn': return '반대 방향으로 돌아가세요.';
    case 'arrive': return '목적지에 도착합니다.';
  }
}

export function instructionWithDistance(step: NavigationStep, distanceM: number) {
  if (step.type === 'arrive') {
    if (distanceM <= 10) return '목적지에 도착했습니다.';
    return `${spokenDistance(distanceM)} 뒤 목적지에 도착합니다.`;
  }
  if (distanceM <= 6) return `여기서 ${step.instruction}`;
  return `${spokenDistance(distanceM)} 뒤 ${step.instruction}`;
}

export function spokenDistance(distanceM: number) {
  if (distanceM < 15) return '10미터';
  if (distanceM < 40) return '30미터';
  if (distanceM < 75) return '50미터';
  if (distanceM < 150) return '100미터';
  return `${Math.max(100, Math.round(distanceM / 100) * 100)}미터`;
}

export function distanceMeters(first: NavigationCoordinate, second: NavigationCoordinate) {
  const latitudeDelta = toRadians(second.lat - first.lat);
  const longitudeDelta = toRadians(second.lng - first.lng);
  const firstLatitude = toRadians(first.lat);
  const secondLatitude = toRadians(second.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine));
}

function deduplicateCoordinates(coordinates: NavigationCoordinate[]) {
  return coordinates.filter((coordinate, index, all) => (
    index === 0 || distanceMeters(all[index - 1], coordinate) >= MIN_POINT_DISTANCE_M
  ));
}

function findCoordinateBefore(cumulative: number[], index: number, distanceM: number) {
  for (let candidate = index - 1; candidate >= 0; candidate -= 1) {
    if (cumulative[index] - cumulative[candidate] >= distanceM) return candidate;
  }
  return 0;
}

function findCoordinateAfter(cumulative: number[], index: number, distanceM: number) {
  for (let candidate = index + 1; candidate < cumulative.length; candidate += 1) {
    if (cumulative[candidate] - cumulative[index] >= distanceM) return candidate;
  }
  return cumulative.length - 1;
}

function bearingDegrees(first: NavigationCoordinate, second: NavigationCoordinate) {
  const firstLatitude = toRadians(first.lat);
  const secondLatitude = toRadians(second.lat);
  const longitudeDelta = toRadians(second.lng - first.lng);
  const y = Math.sin(longitudeDelta) * Math.cos(secondLatitude);
  const x = Math.cos(firstLatitude) * Math.sin(secondLatitude)
    - Math.sin(firstLatitude) * Math.cos(secondLatitude) * Math.cos(longitudeDelta);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function normalizeAngle(angle: number) {
  return ((angle + 540) % 360) - 180;
}

function turnTypeForAngle(angle: number): NavigationTurnType {
  const absolute = Math.abs(angle);
  if (absolute >= 145) return 'uturn';
  if (angle > 0) return absolute < 65 ? 'slight_right' : 'right';
  return absolute < 65 ? 'slight_left' : 'left';
}

function mergeNearbyTurns(candidates: NavigationStep[]) {
  const merged: NavigationStep[] = [];
  for (const candidate of candidates) {
    const previous = merged[merged.length - 1];
    if (previous && candidate.distanceFromStartM - previous.distanceFromStartM < TURN_MERGE_DISTANCE_M) {
      if (Math.abs(candidate.angleDegrees) > Math.abs(previous.angleDegrees)) merged[merged.length - 1] = candidate;
    } else {
      merged.push(candidate);
    }
  }
  return merged;
}

function projectOntoSegment(position: NavigationCoordinate, start: NavigationCoordinate, end: NavigationCoordinate) {
  const latitudeScale = 110_540;
  const longitudeScale = 111_320 * Math.cos(toRadians(position.lat));
  const startX = (start.lng - position.lng) * longitudeScale;
  const startY = (start.lat - position.lat) * latitudeScale;
  const endX = (end.lng - position.lng) * longitudeScale;
  const endY = (end.lat - position.lat) * latitudeScale;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const lengthSquared = segmentX ** 2 + segmentY ** 2;
  const fraction = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, -(startX * segmentX + startY * segmentY) / lengthSquared));
  const projectedX = startX + segmentX * fraction;
  const projectedY = startY + segmentY * fraction;
  return {
    fraction,
    distanceM: Math.hypot(projectedX, projectedY),
    coordinate: {
      lat: start.lat + (end.lat - start.lat) * fraction,
      lng: start.lng + (end.lng - start.lng) * fraction,
    },
  };
}

function toRadians(degrees: number) {
  return degrees * Math.PI / 180;
}

function toDegrees(radians: number) {
  return radians * 180 / Math.PI;
}
