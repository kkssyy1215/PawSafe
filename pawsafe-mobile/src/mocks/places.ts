import type { PlaceSearchResult } from '@/src/api/contracts';
import { pipelineDemoPlaces } from '@/src/mocks/demoRouteCandidates';

export const mockCurrentPlace: PlaceSearchResult = {
  id: 'current_mock',
  name: '현재 위치(목업)',
  address: '서울특별시 마포구 독막로 12',
  lat: 37.551,
  lng: 126.911,
  is_in_coverage: true,
};

export const mockNearbyWalkPlaces: PlaceSearchResult[] = [
  { id: 'place_mangwon_park', name: '망원한강공원', address: '서울특별시 마포구 마포나루길 467', lat: 37.555, lng: 126.9, is_in_coverage: true },
  { id: 'place_gyeongui_forest', name: '경의선숲길', address: '서울특별시 마포구 와우산로37길 35', lat: 37.557, lng: 126.918, is_in_coverage: true },
  { id: 'place_yanghwajin_trail', name: '양화진 산책로', address: '서울특별시 마포구 토정로 6', lat: 37.5485, lng: 126.9125, is_in_coverage: true },
];

export const mockPlaces: PlaceSearchResult[] = [
  { id: 'place_home', name: '우리집', address: '서울특별시 마포구 독막로 12', lat: 37.55, lng: 126.91, is_in_coverage: true },
  ...mockNearbyWalkPlaces,
  { id: 'place_mangwon_market', name: '망원시장', address: '서울특별시 마포구 포은로8길 14', lat: 37.556, lng: 126.905, is_in_coverage: true },
  { id: 'place_worldcup_park', name: '월드컵공원', address: '서울특별시 마포구 하늘공원로 84', lat: 37.57, lng: 126.881, is_in_coverage: false },
  { id: 'scenario_same_route', name: '합정 산책로', address: '서울특별시 마포구 합정동 데모 지점', lat: 37.548, lng: 126.914, is_in_coverage: true },
  { id: 'scenario_no_improvement', name: '열노출 차이 없는 길', address: '서울특별시 마포구 데모 시나리오', lat: 37.558, lng: 126.896, is_in_coverage: true },
  { id: 'scenario_no_route', name: '보행 경로 없음 예시', address: 'MVP 오류 시나리오', lat: 37.552, lng: 126.902, is_in_coverage: true },
  { id: 'scenario_timeout', name: '응답 지연 예시', address: 'MVP 오류 시나리오', lat: 37.553, lng: 126.903, is_in_coverage: true },
  { id: 'scenario_out_of_coverage', name: '분석 범위 밖 예시', address: 'MVP 오류 시나리오', lat: 37.7, lng: 127.1, is_in_coverage: false },
];

// The data-team pipeline covers Songpa. These are fixed, non-sensitive
// coordinate fixtures used only when EXPO_PUBLIC_PLACE_DATASET=pipeline.
// The pair mirrors the connected route used by scripts/04_추천경로_생성.py.
export const pipelineMockRouteOrigin: PlaceSearchResult = {
  id: 'pipeline_home',
  name: '송파 목업 출발지',
  address: '서울특별시 송파구 보행로 목업 출발점',
  lat: 37.48508,
  lng: 127.11261,
  is_in_coverage: true,
};

export const pipelineMockRouteDestination: PlaceSearchResult = {
  id: 'pipeline_seokchon_trail',
  name: '송파 목업 산책로',
  address: '서울특별시 송파구 보행로 목업 도착점',
  lat: 37.48804,
  lng: 127.15297,
  is_in_coverage: true,
};

export const pipelineCurrentPlace = pipelineMockRouteOrigin;

export const pipelinePlaces: PlaceSearchResult[] = [
  ...pipelineDemoPlaces,
  pipelineCurrentPlace,
  pipelineMockRouteDestination,
  {
    id: 'pipeline_park',
    name: '송파 공원 산책로',
    address: '서울특별시 송파구 공원 보행로',
    lat: 37.493,
    lng: 127.139,
    is_in_coverage: true,
  },
];

export function isInMockCoverage(lat: number, lng: number): boolean {
  return lat >= 37.54 && lat <= 37.565 && lng >= 126.89 && lng <= 126.92;
}

export function isInPipelineCoverage(lat: number, lng: number): boolean {
  return lat >= 37.467 && lat <= 37.545 && lng >= 127.066 && lng <= 127.162;
}
