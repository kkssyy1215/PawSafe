import { render } from '@testing-library/react-native';
import { AnalysisStatus } from '@/src/features/walk/components/AnalysisStatus';

describe('AnalysisStatus', () => {
  it('shows Kakao-specific progress for fast walks', async () => {
    const screen = await render(<AnalysisStatus isMock={false} walkMode="fast" />);

    expect(screen.getByText('빠른 산책길을 찾고 있어요')).toBeTruthy();
    expect(screen.getByText('카카오 보행 API 요청')).toBeTruthy();
    expect(screen.getByText('카카오 최단 경로 불러오는 중')).toBeTruthy();
    expect(screen.queryByText('일사량 분석')).toBeNull();
  });

  it('keeps heat analysis progress for cool walks', async () => {
    const screen = await render(<AnalysisStatus isMock={false} walkMode="cool" />);

    expect(screen.getByText('시원하게 걸을 수 있는 길을 찾고 있어요')).toBeTruthy();
    expect(screen.getByText('일사량 분석')).toBeTruthy();
    expect(screen.queryByText('카카오 보행 API 요청')).toBeNull();
  });
});
