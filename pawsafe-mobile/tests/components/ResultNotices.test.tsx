import { fireEvent, render } from '@testing-library/react-native';
import type { HeatSegment } from '@/src/api/contracts';
import { DemoNotice } from '@/src/features/walk/components/DemoNotice';
import { HeatSegmentCard } from '@/src/features/walk/components/HeatSegmentCard';
import { HeatRiskDecisionModal } from '@/src/features/walk/components/HeatRiskDecisionModal';
import { HeatRiskWarning } from '@/src/features/walk/components/HeatRiskWarning';

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

  it('shows the walk warning when the average Heat Cost is 80 or higher', async () => {
    const atThreshold = await render(<HeatRiskWarning averageHeatCost={80} />);
    expect(atThreshold.getByText(/평균 Heat Cost가 80 이상/)).toBeTruthy();
    await atThreshold.unmount();

    const belowThreshold = await render(<HeatRiskWarning averageHeatCost={79.9} />);
    expect(belowThreshold.queryByText(/산책 주의/)).toBeNull();
  });

  it('asks the user whether to continue when the average Heat Cost is 80 or higher', async () => {
    const onContinue = jest.fn();
    const onCancelWalk = jest.fn();
    const screen = await render(
      <HeatRiskDecisionModal averageHeatCost={84.7} visible onContinue={onContinue} onCancelWalk={onCancelWalk} />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('85')).toBeTruthy();
    expect(screen.getByText('/ 80')).toBeTruthy();
    expect(screen.getByText('Heat Cost가 80 이상이에요. 안전한 시간대로 산책을 미뤄 주세요.')).toBeTruthy();
    await fireEvent.press(screen.getByText('그래도 경로 추천받기'));
    await fireEvent.press(screen.getByText('산책하지 않을게요'));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onCancelWalk).toHaveBeenCalledTimes(1);
  });
});
