export type AppErrorCode =
  | 'VALIDATION_ERROR' | 'OUT_OF_COVERAGE' | 'PLACE_NOT_FOUND' | 'SAME_LOCATION'
  | 'NO_WALKABLE_NODE' | 'NO_ROUTE' | 'ANALYSIS_TIMEOUT' | 'NETWORK_ERROR'
  | 'EXTERNAL_API_ERROR' | 'MODEL_NOT_READY' | 'PIPELINE_NOT_READY'
  | 'HEAT_DATA_NOT_AVAILABLE' | 'STALE_HEAT_DATA' | 'EXTERNAL_API_TIMEOUT' | 'INVALID_DATA_FILE'
  | 'INVALID_RESPONSE' | 'INTERNAL_ERROR' | 'CANCELLED';

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const errorCopy: Record<AppErrorCode, { title: string; description: string }> = {
  VALIDATION_ERROR: { title: '입력 내용을 확인해 주세요', description: '선택한 장소와 산책 시작 시각을 다시 확인해 주세요.' },
  OUT_OF_COVERAGE: { title: '현재 분석 범위 밖이에요', description: 'MVP에서 지원하는 지역 안의 장소를 선택해 주세요.' },
  PLACE_NOT_FOUND: { title: '장소를 찾지 못했어요', description: '검색어를 바꾸거나 다른 장소를 선택해 주세요.' },
  SAME_LOCATION: { title: '서로 다른 장소가 필요해요', description: '출발지와 목적지를 다르게 선택해 주세요.' },
  NO_WALKABLE_NODE: { title: '가까운 보행 지점을 찾지 못했어요', description: '주변의 다른 장소로 다시 시도해 주세요.' },
  NO_ROUTE: { title: '보행 경로를 찾지 못했어요', description: '출발지나 목적지를 바꿔 다시 검색해 주세요.' },
  ANALYSIS_TIMEOUT: { title: '분석 시간이 오래 걸리고 있어요', description: '잠시 후 다시 시도해 주세요.' },
  NETWORK_ERROR: { title: '네트워크 연결을 확인해 주세요', description: '현재 네트워크에 연결되어 있지 않아 경로를 불러올 수 없습니다.' },
  EXTERNAL_API_ERROR: { title: '외부 서비스 연결이 원활하지 않아요', description: '잠시 후 다시 시도해 주세요.' },
  MODEL_NOT_READY: { title: '분석 데이터가 아직 준비되지 않았어요', description: '현재 조건은 아직 분석할 수 없습니다.' },
  PIPELINE_NOT_READY: { title: '경로 분석 준비 중이에요', description: '데이터 연결이 완료된 뒤 다시 시도해 주세요.' },
  HEAT_DATA_NOT_AVAILABLE: { title: '열노출 데이터가 없어요', description: '현재 조건에 사용할 수 있는 비교 데이터가 없습니다.' },
  STALE_HEAT_DATA: { title: '최신 비교 데이터가 필요해요', description: '열노출 데이터가 갱신된 뒤 다시 시도해 주세요.' },
  EXTERNAL_API_TIMEOUT: { title: '장소 서비스 응답이 늦어지고 있어요', description: '잠시 후 다시 시도해 주세요.' },
  INVALID_DATA_FILE: { title: '분석 데이터를 읽지 못했어요', description: '서버 데이터 설정을 확인해 주세요.' },
  INVALID_RESPONSE: { title: '응답을 확인할 수 없어요', description: '서버 응답 형식이 예상과 다릅니다. 개발 설정을 확인해 주세요.' },
  INTERNAL_ERROR: { title: '경로를 불러오지 못했어요', description: '잠시 후 다시 시도해 주세요.' },
  CANCELLED: { title: '요청이 취소되었어요', description: '원하면 다시 경로를 분석할 수 있어요.' },
};

export function getErrorCopy(error: Pick<AppError, 'code'>) {
  return errorCopy[error.code] ?? errorCopy.INTERNAL_ERROR;
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.name === 'AbortError') return new AppError('CANCELLED', 'Request cancelled');
  return new AppError('INTERNAL_ERROR', 'Unexpected client error', true);
}
