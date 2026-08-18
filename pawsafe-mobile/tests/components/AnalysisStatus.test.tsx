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
  it('shows the shared model graph lookup for fast walks', async () => {
    const screen = await render(<FastRouteStatus />);

    expect(screen.getByText(/가장 빠른 산책길을/)).toBeTruthy();
    expect(screen.getByText(/거리 기준 최단경로를 계산/)).toBeTruthy();
    expect(screen.getByText(/같은 보행로 그래프의 최단경로/)).toBeTruthy();
    expect(screen.queryByText('Edge별 Heat Cost 계산')).toBeNull();
  });

  it('shows the current-weather pipeline for cool walks', async () => {
    const screen = await render(<AnalysisStatus isMock={false} />);

    expect(screen.getByText(/우리 강아지가 걷기 좋은 길을/)).toBeTruthy();
    expect(screen.getByText(/포장재 · ASOS 기상 · 일사량 · 그늘 · Heat Cost/)).toBeTruthy();
    expect(screen.queryByText('분석 5/5')).toBeNull();
  });
});
