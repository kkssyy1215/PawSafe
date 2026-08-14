import { getRecommendedRouteColor } from '@/src/components/map/routeStyles';
import { colors } from '@/src/theme/theme';

describe('recommended route colors', () => {
  it('uses fluorescent green for cool routes', () => {
    expect(getRecommendedRouteColor('cool')).toBe(colors.coolRoute);
  });

  it('uses purple for fast routes', () => {
    expect(getRecommendedRouteColor('fast')).toBe(colors.fastRoute);
  });
});
