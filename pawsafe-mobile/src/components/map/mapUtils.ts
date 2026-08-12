import type { GeoJsonCoordinate, LineStringGeometry } from '@/src/api/contracts';

export interface MapCoordinate { latitude: number; longitude: number }

export function toMapCoordinate(coordinate: GeoJsonCoordinate): MapCoordinate {
  const [longitude, latitude] = coordinate;
  return { latitude, longitude };
}

export function geometryToMapCoordinates(geometry?: LineStringGeometry | null): MapCoordinate[] {
  return geometry?.coordinates.map(toMapCoordinate).filter(({ latitude, longitude }) =>
    Number.isFinite(latitude) && Number.isFinite(longitude)) ?? [];
}
