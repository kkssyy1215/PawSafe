import { Notice } from '@/src/components/common/Notice';

export const HIGH_HEAT_COST_THRESHOLD = 80;

export function HeatRiskWarning({ averageHeatCost }: { averageHeatCost: number }) {
  if (averageHeatCost < HIGH_HEAT_COST_THRESHOLD) return null;

  return (
    <Notice tone="warning" accessibilityLiveRegion="assertive">
      산책 주의: 선택한 경로의 평균 Heat Cost가 80 이상이에요. 뜨거운 노면으로 발바닥이 다칠 수 있으니 노면 온도를 직접 측정해 보거나, 안전한 시간대로 산책을 미뤄 주세요.
    </Notice>
  );
}
