import { render } from '@testing-library/react-native';
import { AnalysisStatus } from '@/src/features/walk/components/AnalysisStatus';
import { FastRouteStatus } from '@/src/features/walk/components/FastRouteStatus';

jest.mock('@/src/features/walk/components/SmoothRouteLoader', () => {
  const React = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');
  return {
    SmoothRouteLoader: ({ statusLabel, statusDescription }: { statusLabel: string; statusDescription: string }) => React.createElement(
      View,
      null,
      React.createElement(Text, null, statusLabel),
      React.createElement(Text, null, statusDescription),
    ),
  };
});

describe('AnalysisStatus', () => {
  it('shows only Kakao route lookup for fast walks', async () => {
    const screen = await render(<FastRouteStatus />);

    expect(screen.getByText(/가장 빠른 산책길을/)).toBeTruthy();
    expect(screen.getByText(/열환경 분석 없이/)).toBeTruthy();
    expect(screen.getByText(/카카오맵 보행거리와 예상 시간만/)).toBeTruthy();
    expect(screen.queryByText('Edge별 Heat Cost 계산')).toBeNull();
  });

  it('shows the current-weather pipeline for cool walks', async () => {
    const screen = await render(<AnalysisStatus isMock={false} />);

    expect(screen.getByText(/우리 강아지가 걷기 좋은 길을/)).toBeTruthy();
    expect(screen.getByText(/포장재 · AWS·ASOS 기상 · 일사량 · 그늘 · Heat Cost/)).toBeTruthy();
    expect(screen.queryByText('분석 5/5')).toBeNull();
  });
});
