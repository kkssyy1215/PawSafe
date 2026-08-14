import { getWalkModeLabel, getWalkSearchButtonLabel } from '@/src/features/walk/utils/walkModeCopy';

describe('walk mode submit copy', () => {
  it('uses a fast-specific label when fast mode is selected', () => {
    expect(getWalkSearchButtonLabel('fast')).toBe('빠른 산책길 찾기');
  });

  it('keeps the safety label for cool mode', () => {
    expect(getWalkSearchButtonLabel('cool')).toBe('안전한 산책길 찾기');
  });

  it('uses the selected mode name throughout result summaries', () => {
    expect(getWalkModeLabel('fast')).toBe('빠른 산책길');
    expect(getWalkModeLabel('cool')).toBe('시원한 산책길');
  });
});
