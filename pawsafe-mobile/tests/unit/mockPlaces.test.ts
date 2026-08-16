import { csvDemoRouteCandidates, heatDifferenceDemoRoute, pipelineDemoPlaces } from '@/src/mocks/demoRouteCandidates';
import { isInMockCoverage, mockPlaces, pipelineMockRouteDestination, pipelineMockRouteOrigin } from '@/src/mocks/places';
import { MockPlaceSearchProvider } from '@/src/providers/places/MockPlaceSearchProvider';

describe('mock place coverage', () => {
  it('matches the backend demo coverage boundary', () => {
    expect(isInMockCoverage(37.55, 126.91)).toBe(true);
    expect(isInMockCoverage(37.57, 126.881)).toBe(false);
    expect(mockPlaces.find(({ id }) => id === 'place_worldcup_park')?.is_in_coverage).toBe(false);
  });

  it('does not mark an arbitrary device location as covered', async () => {
    const provider = new MockPlaceSearchProvider();
    await expect(provider.reverseGeocode(35.1796, 129.0756)).resolves.toMatchObject({
      is_in_coverage: false,
    });
  });

  it('keeps the data-team route coordinates as explicit pipeline fixtures', () => {
    expect(pipelineMockRouteOrigin).toMatchObject({ lat: 37.48508, lng: 127.11261, is_in_coverage: true });
    expect(pipelineMockRouteDestination).toMatchObject({ lat: 37.48804, lng: 127.15297, is_in_coverage: true });
  });

  it('exposes all 15 CSV route pairs as searchable pipeline places', () => {
    expect(csvDemoRouteCandidates).toHaveLength(15);
    expect(pipelineDemoPlaces).toHaveLength(32);

    const matches = pipelineDemoPlaces.filter((place) => place.name.includes('DEMO_001'));
    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'DEMO_001 출발지', lat: 37.510356341, lng: 127.079320701, is_in_coverage: true }),
        expect.objectContaining({ name: 'DEMO_001 목적지', lat: 37.511922376, lng: 127.104658454, is_in_coverage: true }),
      ]),
    );
  });

  it('keeps the separately supplied heat-difference route selectable', () => {
    expect(heatDifferenceDemoRoute).toMatchObject({
      origin: { lat: 37.4811743, lng: 127.1405973 },
      destination: { lat: 37.4772949, lng: 127.1410705 },
      fastDistanceM: 875.1,
      coolDistanceM: 987,
      fastHeatCost: 75.4,
      coolHeatCost: 33.3,
    });

    const mappedOrigin = pipelineDemoPlaces.find((place) => place.id === 'heat_diff_001_origin');
    expect(mappedOrigin).toMatchObject({
      name: '위례광장로 185',
      address: '서울특별시 송파구 위례광장로 185',
      lat: 37.4811743,
      lng: 127.1405973,
    });
    expect(pipelineDemoPlaces.find((place) => place.id === 'heat_diff_001_destination')).toBeDefined();
  });
});
