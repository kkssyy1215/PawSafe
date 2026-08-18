import { fireEvent, render } from '@testing-library/react-native';
import type { HeatSegment } from '@/src/api/contracts';
import { HeatSegmentCard } from '@/src/features/walk/components/HeatSegmentCard';
import { HeatRiskDecisionModal } from '@/src/features/walk/components/HeatRiskDecisionModal';
import { HeatRiskWarning } from '@/src/features/walk/components/HeatRiskWarning';
import { makeRoute } from '@/tests/fixtures/routeAnalysis';

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
  it('shows semantic missing-value copy without fabricating zero or confidence', async () => {
    const screen = await render(<HeatSegmentCard segment={nullableSegment} />);
    expect(screen.getByText('정보 부족')).toBeTruthy();
    expect(screen.getAllByText('정보 없음')).toHaveLength(4);
    expect(screen.getByText('포장재 정보 없음')).toBeTruthy();
    expect(screen.getByText('실측 검증 전')).toBeTruthy();
    expect(screen.queryByText(/신뢰도/)).toBeNull();
  });

  it('shows the walk warning when the model safety payload requests it', async () => {
    const atThreshold = await render(<HeatRiskWarning safety={makeRoute('hot', 500, 2, 80).safety} />);
    expect(atThreshold.getByText(/열위험 점수가 80점 이상/)).toBeTruthy();
    await atThreshold.unmount();

    const belowThreshold = await render(<HeatRiskWarning safety={makeRoute('ok', 500, 1, 79).safety} />);
    expect(belowThreshold.queryByText(/산책 주의/)).toBeNull();
  });

  it('asks the user whether to continue when the route safety score is 80 or higher', async () => {
    const onContinue = jest.fn();
    const onCancelWalk = jest.fn();
    const screen = await render(
      <HeatRiskDecisionModal safety={makeRoute('hot', 500, 2, 85).safety} visible onContinue={onContinue} onCancelWalk={onCancelWalk} />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('85')).toBeTruthy();
    expect(screen.getByText('/ 80')).toBeTruthy();
    expect(screen.getByText('경로 열위험 점수가 80점 이상이에요. 안전한 시간대로 산책을 미뤄 주세요.')).toBeTruthy();
    await fireEvent.press(screen.getByText('그래도 경로 추천받기'));
    await fireEvent.press(screen.getByText('산책하지 않을게요'));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onCancelWalk).toHaveBeenCalledTimes(1);
  });
});
