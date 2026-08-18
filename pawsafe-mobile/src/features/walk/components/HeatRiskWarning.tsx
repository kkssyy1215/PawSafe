import { Notice } from '@/src/components/common/Notice';
import type { RouteSafety } from '@/src/api/contracts';

export function HeatRiskWarning({ safety }: { safety: RouteSafety }) {
  if (!safety.should_warn) return null;

  return (
    <Notice tone="warning" accessibilityLiveRegion="assertive">
      산책 주의: 경로 열위험 점수가 {safety.thresholds.warning_min}점 이상이에요. 더 안전한 시간대로 산책을 미뤄 주세요.
    </Notice>
  );
}
