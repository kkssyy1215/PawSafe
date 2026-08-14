import { geometryToMapCoordinates, toMapCoordinate } from '@/src/components/map/mapUtils';

describe('GeoJSON map conversion', () => {
  it('converts the explicit [longitude, latitude] GeoJSON order', () => {
    expect(toMapCoordinate([126.91, 37.55])).toEqual({
      latitude: 37.55,
      longitude: 126.91,
    });
  });

  it('filters invalid points and tolerates absent geometry', () => {
    expect(geometryToMapCoordinates({
      type: 'LineString',
      coordinates: [[126.91, 37.55], [Number.NaN, 37.56], [126.9, 37.555]],
    })).toEqual([
      { latitude: 37.55, longitude: 126.91 },
      { latitude: 37.555, longitude: 126.9 },
    ]);
    expect(geometryToMapCoordinates(null)).toEqual([]);
  });
});
