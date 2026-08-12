export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '정보 없음';
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded}분`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}
