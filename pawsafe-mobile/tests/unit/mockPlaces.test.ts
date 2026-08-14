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
    expect(pipelineMockRouteOrigin).toMatchObject({ lat: 37.50167, lng: 127.15485, is_in_coverage: true });
    expect(pipelineMockRouteDestination).toMatchObject({ lat: 37.48804, lng: 127.15297, is_in_coverage: true });
  });
});
