export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  if (ratio == null) return '정보 없음';
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatPercentagePoint(value: number | null | undefined): string {
  if (value == null) return '정보 없음';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1).replace('.0', '')}%p`;
}
