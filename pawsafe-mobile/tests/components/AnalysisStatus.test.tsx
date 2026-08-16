import { render } from '@testing-library/react-native';
import { AnalysisStatus } from '@/src/features/walk/components/AnalysisStatus';

describe('AnalysisStatus', () => {
  it('shows the same real-time comparison pipeline for fast walks', async () => {
    const screen = await render(<AnalysisStatus isMock={false} walkMode="fast" />);

    expect(screen.getByText(/우리 강아지가 걷기 좋은 길을/)).toBeTruthy();
    expect(screen.getByText('현재 기상정보 확인')).toBeTruthy();
    expect(screen.getByText('Edge별 Heat Cost 계산')).toBeTruthy();
  });

  it('shows the current-weather pipeline for cool walks', async () => {
    const screen = await render(<AnalysisStatus isMock={false} walkMode="cool" />);

    expect(screen.getByText(/우리 강아지가 걷기 좋은 길을/)).toBeTruthy();
    expect(screen.getByText('햇빛 노출 정도 분석')).toBeTruthy();
    expect(screen.getByText('안전한 산책경로 탐색')).toBeTruthy();
  });
});
