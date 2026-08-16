import { render } from '@testing-library/react-native';
import { AnalysisStatus } from '@/src/features/walk/components/AnalysisStatus';
import { FastRouteStatus } from '@/src/features/walk/components/FastRouteStatus';

describe('AnalysisStatus', () => {
  it('shows only Kakao route lookup for fast walks', async () => {
    const screen = await render(<FastRouteStatus />);

    expect(screen.getByText(/가장 빠른 산책길을/)).toBeTruthy();
    expect(screen.getByText(/Kakao 도보 API/)).toBeTruthy();
    expect(screen.queryByText('Edge별 Heat Cost 계산')).toBeNull();
  });

  it('shows the current-weather pipeline for cool walks', async () => {
    const screen = await render(<AnalysisStatus isMock={false} />);

    expect(screen.getByText(/우리 강아지가 걷기 좋은 길을/)).toBeTruthy();
    expect(screen.getByText('일사량 분석')).toBeTruthy();
    expect(screen.getByText('건물 그림자 분석')).toBeTruthy();
  });
});
