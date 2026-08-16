import { render } from '@testing-library/react-native';
import { FastRouteResultCard } from '@/src/features/walk/components/FastRouteResultCard';

const route = {
  route_id: 'kakao_fast',
  label: '카카오 최단 보행 경로',
  route_source: 'kakao_walk',
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
  it('shows only Kakao distance and time without a Heat Cost comparison', async () => {
    const screen = await render(<FastRouteResultCard route={route} />);

    expect(screen.getByText('카카오맵 빠른 경로')).toBeTruthy();
    expect(screen.getByText('875m')).toBeTruthy();
    expect(screen.queryByText(/Heat Cost/)).toBeNull();
  });
});
