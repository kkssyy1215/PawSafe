export function formatDistance(metres: number | null | undefined): string {
  if (metres == null) return '정보 없음';
  if (metres < 1000) return `${Math.round(metres)}m`;
  return `${(metres / 1000).toFixed(metres % 1000 === 0 ? 0 : 1)}km`;
}
