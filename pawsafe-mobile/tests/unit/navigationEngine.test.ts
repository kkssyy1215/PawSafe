import {
  coordinateAtRouteDistance,
  getNextNavigationStep,
  instructionWithDistance,
  matchPositionToRoute,
  prepareNavigationRoute,
} from '@/src/features/navigation/navigationEngine';

describe('navigationEngine', () => {
  it('detects a right turn on a north-to-east route', () => {
    const route = prepareNavigationRoute([
      [127, 37],
      [127, 37.0002],
      [127.00025, 37.0002],
    ]);
    expect(route.steps.map((step) => step.type)).toEqual(['start', 'right', 'arrive']);
  });

  it('detects a left turn on a north-to-west route', () => {
    const route = prepareNavigationRoute([
      [127, 37],
      [127, 37.0002],
      [126.99975, 37.0002],
    ]);
    expect(route.steps.map((step) => step.type)).toEqual(['start', 'left', 'arrive']);
  });

  it('does not create a false turn for a nearly straight route', () => {
    const route = prepareNavigationRoute([
      [127, 37],
      [127.000001, 37.00015],
      [127, 37.0003],
    ]);
    expect(route.steps.map((step) => step.type)).toEqual(['start', 'arrive']);
  });

  it('matches a position to the nearest route segment and returns progress', () => {
    const route = prepareNavigationRoute([
      [127, 37],
      [127, 37.001],
    ]);
    const match = matchPositionToRoute(route, { lat: 37.0005, lng: 127.00005 });
    expect(match).not.toBeNull();
    expect(match?.distanceToRouteM).toBeGreaterThan(3);
    expect(match?.distanceToRouteM).toBeLessThan(6);
    expect(match?.distanceAlongRouteM).toBeCloseTo(route.totalDistanceM / 2, 0);
    expect(match?.remainingDistanceM).toBeCloseTo(route.totalDistanceM / 2, 0);
  });

  it('builds a distance-aware Korean instruction for the next turn', () => {
    const route = prepareNavigationRoute([
      [127, 37],
      [127, 37.0002],
      [127.00025, 37.0002],
    ]);
    const nextStep = getNextNavigationStep(route, 0);
    expect(nextStep?.type).toBe('right');
    expect(instructionWithDistance(nextStep!, 28)).toBe('30미터 뒤 우회전하세요.');
  });

  it('interpolates smooth positions between sparse route coordinates', () => {
    const route = prepareNavigationRoute([
      [127, 37],
      [127, 37.001],
    ]);
    const midpoint = coordinateAtRouteDistance(route, route.totalDistanceM / 2);

    expect(midpoint?.lat).toBeCloseTo(37.0005, 6);
    expect(midpoint?.lng).toBeCloseTo(127, 6);
    expect(coordinateAtRouteDistance(route, route.totalDistanceM * 2)).toEqual(route.coordinates[1]);
  });
});
