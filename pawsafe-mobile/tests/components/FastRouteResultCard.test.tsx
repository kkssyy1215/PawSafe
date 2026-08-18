import { render } from '@testing-library/react-native';
import { FastRouteResultCard } from '@/src/features/walk/components/FastRouteResultCard';
import { makeRoute } from '@/tests/fixtures/routeAnalysis';

const route = makeRoute('shortest_001', 875, 1.2, 32);

describe('FastRouteResultCard', () => {
  it('shows model-graph distance and time without a Heat Cost comparison', async () => {
    const screen = await render(<FastRouteResultCard route={route} />);

    expect(screen.getByText('일반 최단경로')).toBeTruthy();
    expect(screen.getByText('875m')).toBeTruthy();
    expect(screen.queryByText(/Heat Cost/)).toBeNull();
  });
});
