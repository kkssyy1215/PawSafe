import { render } from '@testing-library/react-native';
import type { HeatSegment } from '@/src/api/contracts';
import { DemoNotice } from '@/src/features/walk/components/DemoNotice';
import { HeatSegmentCard } from '@/src/features/walk/components/HeatSegmentCard';

const nullableSegment: HeatSegment = {
  edge_id: 'edge-null',
  display_name: '데이터가 비어 있는 예시 구간',
  level: 'unknown',
  heat_cost: null,
  shade_ratio: null,
  direct_sun_minutes: null,
  surface_type: null,
  confidence: null,
  data_valid_at: null,
  validation_status: 'not_validated',
  geometry: { type: 'LineString', coordinates: [] },
};

describe('result disclosure components', () => {
  it('labels mock content as MVP example data and not validated', async () => {
    const screen = await render(<DemoNotice />);
    expect(screen.getByText(/MVP 예시 데이터/)).toBeTruthy();
    expect(screen.getByText(/실측 검증 전/)).toBeTruthy();
  });

  it('shows semantic missing-value copy without fabricating zero or confidence', async () => {
    const screen = await render(<HeatSegmentCard segment={nullableSegment} isDemo />);
    expect(screen.getByText('정보 부족')).toBeTruthy();
    expect(screen.getAllByText('정보 없음')).toHaveLength(3);
    expect(screen.getByText('포장재 정보 없음')).toBeTruthy();
    expect(screen.getByText('MVP 예시 시나리오')).toBeTruthy();
    expect(screen.getByText('실측 검증 전')).toBeTruthy();
    expect(screen.queryByText(/신뢰도/)).toBeNull();
  });
});
