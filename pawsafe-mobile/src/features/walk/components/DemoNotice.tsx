import { Notice } from '@/src/components/common/Notice';
export function DemoNotice() {
  return <Notice tone="info">노면온도와 그늘 정보를 바탕으로 한 상대 비교예요.{`\n`}MVP 예시 데이터 · 실측 검증 전</Notice>;
}
