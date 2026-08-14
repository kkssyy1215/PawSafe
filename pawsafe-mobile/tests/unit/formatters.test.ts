import { formatDistance } from '@/src/features/walk/utils/formatDistance';
import { formatDuration } from '@/src/features/walk/utils/formatDuration';
import { formatPercent, formatPercentagePoint } from '@/src/features/walk/utils/formatPercent';

describe('walk result formatters', () => {
  it('formats metres and kilometres without implying missing values are zero', () => {
    expect(formatDistance(840)).toBe('840m');
    expect(formatDistance(1200)).toBe('1.2km');
    expect(formatDistance(2000)).toBe('2km');
    expect(formatDistance(null)).toBe('정보 없음');
  });

  it('formats minute and hour durations', () => {
    expect(formatDuration(17.4)).toBe('17분');
    expect(formatDuration(60)).toBe('1시간');
    expect(formatDuration(91)).toBe('1시간 31분');
    expect(formatDuration(undefined)).toBe('정보 없음');
  });

  it('formats ratios and percentage-point deltas', () => {
    expect(formatPercent(0.431, 1)).toBe('43.1%');
    expect(formatPercent(null)).toBe('정보 없음');
    expect(formatPercentagePoint(38)).toBe('+38%p');
    expect(formatPercentagePoint(-2.5)).toBe('-2.5%p');
  });
});
