import { Notice } from '@/src/components/common/Notice';
import type { WalkMode } from '@/src/api/contracts';

export function DemoNotice({ analysisSource, walkMode = 'cool' }: { analysisSource?: string; walkMode?: WalkMode }) {
  const hasLiveKakaoShortest = analysisSource?.startsWith('kakao_walk');
  const hasPipelineHeat = analysisSource === 'graph';
  return (
    <Notice tone="info">
      {hasPipelineHeat
        ? <>데이터팀 파이프라인의 시간별 상대 Heat Cost를 사용해 비교했어요.{`\n`}실측 노면온도(℃)나 절대 안전 판정은 아니에요.</>
        : hasLiveKakaoShortest && walkMode === 'fast'
        ? <>빠른 산책길은 Kakao 보행 API의 실제 최단 경로예요.{`\n`}열환경 비교는 빠른 경로에 적용하지 않아요.</>
        : hasLiveKakaoShortest
        ? <>최단 보행 경로의 거리·선은 Kakao API 결과예요.{`\n`}Heat Cost와 PawSafe 추천 경로는 MVP 예시 데이터 · 실측 검증 전</>
        : <>노면온도와 그늘 정보를 바탕으로 한 상대 비교예요.{`\n`}MVP 예시 데이터 · 실측 검증 전</>}
    </Notice>
  );
}
