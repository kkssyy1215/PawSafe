import { AppError, getErrorCopy, normalizeError } from '@/src/api/errors';

describe('application errors', () => {
  it('maps known API codes to user-facing Korean copy', () => {
    expect(getErrorCopy(new AppError('NO_ROUTE', 'internal'))).toEqual({
      title: '보행 경로를 찾지 못했어요',
      description: '출발지나 목적지를 바꿔 다시 검색해 주세요.',
    });
  });

  it('normalizes AbortError without exposing its message', () => {
    const error = new Error('secret transport detail');
    error.name = 'AbortError';
    expect(normalizeError(error)).toMatchObject({ code: 'CANCELLED', retryable: false });
  });

  it('normalizes unknown failures as retryable internal errors', () => {
    expect(normalizeError('unknown')).toMatchObject({ code: 'INTERNAL_ERROR', retryable: true });
  });
});
