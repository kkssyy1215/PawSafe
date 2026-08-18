import { render } from '@testing-library/react-native';
import { FastRouteResultCard } from '@/src/features/walk/components/FastRouteResultCard';

const route = {
  route_id: 'pawsafe_shortest',
  label: '일반 최단경로',
  route_source: 'pawsafe_12day',
  navigation_url: null,
  geometry: { type: 'LineString' as const, coordinates: [[127.1, 37.5], [127.11, 37.51]] as [number, number][] },
  distance_m: 875,
  duration_min: 13,
  heat_cost: 0,
  shade_ratio: null,
  direct_sun_minutes: null,
  edge_count: 1,
};

describe('FastRouteResultCard', () => {
  it('shows model-graph distance and time without a Heat Cost comparison', async () => {
    const screen = await render(<FastRouteResultCard route={route} />);

    expect(screen.getByText('일반 최단경로')).toBeTruthy();
    expect(screen.getByText('875m')).toBeTruthy();
    expect(screen.queryByText(/Heat Cost/)).toBeNull();
  });
});
