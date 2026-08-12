import { LoadingState } from '@/src/components/common/LoadingState';
export function AnalysisStatus({ isMock }: { isMock: boolean }) {
  return <LoadingState
    title={isMock ? 'MVP 예시 경로를 준비하고 있어요' : '선택한 조건으로 경로를 분석하고 있어요'}
    description={isMock ? '앱 흐름 검증을 위한 데모 데이터를 불러오는 중입니다.' : '경로 정보를 준비하는 동안 잠시 기다려 주세요.'}
  />;
}
