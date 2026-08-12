import { LoadingState } from '@/src/components/common/LoadingState';
export function AnalysisStatus({ isMock }: { isMock: boolean }) {
  return <LoadingState
    title={isMock ? '우리 강아지가 걷기 좋은 길을 찾고 있어요' : '안전한 산책길을 찾고 있어요'}
    description={isMock ? '노면온도와 그늘 정보를 확인하는 중이에요. 잠시만 기다려 주세요.' : '선택한 조건에 맞는 경로를 준비하고 있어요.'}
  />;
}
