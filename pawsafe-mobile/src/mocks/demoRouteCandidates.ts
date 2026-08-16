import type { PlaceSearchResult } from '@/src/api/contracts';

export type DemoRouteCandidate = {
  id: string;
  category: 'best_fast_cool_demo' | 'longest' | 'highest_known_surface' | 'heat_difference_demo';
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  fastDistanceM: number;
  coolDistanceM: number;
  fastHeatCost: number;
  coolHeatCost: number;
};

// Source: demo_route_candidates.csv supplied by the data/model team.
// Keep one origin and destination per candidate even when coordinates overlap,
// so a tester can select the intended pair by its DEMO id.
export const csvDemoRouteCandidates: DemoRouteCandidate[] = [
  { id: 'DEMO_001', category: 'best_fast_cool_demo', origin: { lat: 37.510356341, lng: 127.079320701 }, destination: { lat: 37.511922376, lng: 127.104658454 }, fastDistanceM: 2926.309972, coolDistanceM: 3414.119328, fastHeatCost: 58.902458, coolHeatCost: 37.377376 },
  { id: 'DEMO_002', category: 'best_fast_cool_demo', origin: { lat: 37.510284609, lng: 127.078800342 }, destination: { lat: 37.508805793, lng: 127.103647487 }, fastDistanceM: 2829.936877, coolDistanceM: 3119.531059, fastHeatCost: 57.119531, coolHeatCost: 36.824755 },
  { id: 'DEMO_003', category: 'best_fast_cool_demo', origin: { lat: 37.510356341, lng: 127.079320701 }, destination: { lat: 37.513487741, lng: 127.107313067 }, fastDistanceM: 3241.289629, coolDistanceM: 3729.098986, fastHeatCost: 61.915705, coolHeatCost: 41.814578 },
  { id: 'DEMO_004', category: 'best_fast_cool_demo', origin: { lat: 37.510356341, lng: 127.079320701 }, destination: { lat: 37.513793792, lng: 127.102568525 }, fastDistanceM: 3188.420892, coolDistanceM: 3676.230249, fastHeatCost: 58.832393, coolHeatCost: 38.85132 },
  { id: 'DEMO_005', category: 'best_fast_cool_demo', origin: { lat: 37.510423612, lng: 127.079773194 }, destination: { lat: 37.51359741, lng: 127.105593951 }, fastDistanceM: 3206.287444, coolDistanceM: 3775.166323, fastHeatCost: 56.740533, coolHeatCost: 38.053727 },
  { id: 'DEMO_006', category: 'longest', origin: { lat: 37.488614874, lng: 127.130315976 }, destination: { lat: 37.492786943, lng: 127.152554488 }, fastDistanceM: 7244.659675, coolDistanceM: 7481.418424, fastHeatCost: 67.346119, coolHeatCost: 63.127351 },
  { id: 'DEMO_007', category: 'longest', origin: { lat: 37.488614874, lng: 127.130315976 }, destination: { lat: 37.489379515, lng: 127.157228801 }, fastDistanceM: 7048.533859, coolDistanceM: 7285.292608, fastHeatCost: 67.219416, coolHeatCost: 62.891193 },
  { id: 'DEMO_008', category: 'longest', origin: { lat: 37.487317955, lng: 127.129833174 }, destination: { lat: 37.491960506, lng: 127.154107621 }, fastDistanceM: 6880.338785, coolDistanceM: 7117.097534, fastHeatCost: 67.793177, coolHeatCost: 63.343579 },
  { id: 'DEMO_009', category: 'longest', origin: { lat: 37.488908878, lng: 127.120727911 }, destination: { lat: 37.492786943, lng: 127.152554488 }, fastDistanceM: 6820.680427, coolDistanceM: 7249.539426, fastHeatCost: 72.720105, coolHeatCost: 65.216179 },
  { id: 'DEMO_010', category: 'longest', origin: { lat: 37.488614874, lng: 127.130315976 }, destination: { lat: 37.495699682, lng: 127.139612404 }, fastDistanceM: 6793.913586, coolDistanceM: 6811.69641, fastHeatCost: 67.721723, coolHeatCost: 66.943482 },
  { id: 'DEMO_011', category: 'highest_known_surface', origin: { lat: 37.484080858, lng: 127.114823773 }, destination: { lat: 37.478385181, lng: 127.133232038 }, fastDistanceM: 2820.751986, coolDistanceM: 2820.751986, fastHeatCost: 84.681816, coolHeatCost: 84.681816 },
  { id: 'DEMO_012', category: 'highest_known_surface', origin: { lat: 37.486378331, lng: 127.114923398 }, destination: { lat: 37.478385181, lng: 127.133232038 }, fastDistanceM: 2748.733406, coolDistanceM: 2748.733406, fastHeatCost: 83.841408, coolHeatCost: 83.841408 },
  { id: 'DEMO_013', category: 'highest_known_surface', origin: { lat: 37.484080858, lng: 127.114823773 }, destination: { lat: 37.477341736, lng: 127.131692632 }, fastDistanceM: 2640.445119, coolDistanceM: 2640.445119, fastHeatCost: 85.06684, coolHeatCost: 85.06684 },
  { id: 'DEMO_014', category: 'highest_known_surface', origin: { lat: 37.484798583, lng: 127.113349352 }, destination: { lat: 37.478182684, lng: 127.133028177 }, fastDistanceM: 2609.585765, coolDistanceM: 2609.585765, fastHeatCost: 83.674298, coolHeatCost: 83.674298 },
  { id: 'DEMO_015', category: 'highest_known_surface', origin: { lat: 37.486378331, lng: 127.114923398 }, destination: { lat: 37.477341736, lng: 127.131692632 }, fastDistanceM: 2568.42654, coolDistanceM: 2568.42654, fastHeatCost: 84.17823, coolHeatCost: 84.17823 },
];

export const heatDifferenceDemoRoute: DemoRouteCandidate = {
  id: 'HEAT_DIFF_001',
  category: 'heat_difference_demo',
  origin: { lat: 37.4811743, lng: 127.1405973 },
  destination: { lat: 37.4772949, lng: 127.1410705 },
  fastDistanceM: 875.1,
  coolDistanceM: 987,
  fastHeatCost: 75.4,
  coolHeatCost: 33.3,
};

export const pipelineDemoRouteCandidates = [heatDifferenceDemoRoute, ...csvDemoRouteCandidates];

const categoryLabel: Record<DemoRouteCandidate['category'], string> = {
  best_fast_cool_demo: 'Fast·Cool 차이 추천',
  longest: '장거리 경로',
  highest_known_surface: '포장정보 확인 경로',
  heat_difference_demo: 'Heat 차이 검증 경로',
};

function metricSummary(candidate: DemoRouteCandidate): string {
  return `${categoryLabel[candidate.category]} · fast ${Math.round(candidate.fastDistanceM)}m / cool ${Math.round(candidate.coolDistanceM)}m · Heat ${candidate.fastHeatCost.toFixed(1)} → ${candidate.coolHeatCost.toFixed(1)}`;
}

export const pipelineDemoPlaces: PlaceSearchResult[] = pipelineDemoRouteCandidates.flatMap((candidate) => [
  {
    id: `${candidate.id.toLowerCase()}_origin`,
    name: `${candidate.id} 출발지`,
    address: metricSummary(candidate),
    ...candidate.origin,
    is_in_coverage: true,
  },
  {
    id: `${candidate.id.toLowerCase()}_destination`,
    name: `${candidate.id} 목적지`,
    address: metricSummary(candidate),
    ...candidate.destination,
    is_in_coverage: true,
  },
]);
