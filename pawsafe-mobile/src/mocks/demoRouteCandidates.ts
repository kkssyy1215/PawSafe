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

type DemoEndpoint = 'origin' | 'destination';

// Kakao coord2address results for the model team's graph-connected coordinates.
// Display text may change, but route/node coordinates must remain fixed.
const placeAddressOverrides: Record<string, string> = {
  'HEAT_DIFF_001:origin': '서울특별시 송파구 위례광장로 185',
  'HEAT_DIFF_001:destination': '서울 송파구 장지동 900-2',
  'DEMO_001:origin': '서울 송파구 잠실동 253',
  'DEMO_001:destination': '서울 송파구 신천동 32',
  'DEMO_002:origin': '서울 송파구 잠실동 256',
  'DEMO_002:destination': '서울 송파구 잠실동 49',
  'DEMO_003:origin': '서울 송파구 잠실동 253',
  'DEMO_003:destination': '서울 송파구 신천동 34',
  'DEMO_004:origin': '서울 송파구 잠실동 253',
  'DEMO_004:destination': '서울 송파구 신천동 29',
  'DEMO_005:origin': '서울 송파구 잠실동 253',
  'DEMO_005:destination': '서울특별시 송파구 올림픽로 300',
  'DEMO_006:origin': '서울 송파구 문정동 3-3',
  'DEMO_006:destination': '서울 송파구 거여동 산 71-25',
  'DEMO_007:origin': '서울 송파구 문정동 3-3',
  'DEMO_007:destination': '서울 송파구 거여동 657-12',
  'DEMO_008:origin': '서울 송파구 문정동 18-3',
  'DEMO_008:destination': '서울 송파구 거여동 572-1',
  'DEMO_009:origin': '서울 송파구 문정동 119-4',
  'DEMO_009:destination': '서울 송파구 거여동 산 71-25',
  'DEMO_010:origin': '서울 송파구 문정동 3-3',
  'DEMO_010:destination': '서울 송파구 거여동 20-14',
  'DEMO_011:origin': '서울 송파구 문정동 646-1',
  'DEMO_011:destination': '서울 송파구 장지동 859-1',
  'DEMO_012:origin': '서울 송파구 문정동 500',
  'DEMO_012:destination': '서울 송파구 장지동 859-1',
  'DEMO_013:origin': '서울 송파구 문정동 646-1',
  'DEMO_013:destination': '서울 송파구 장지동 859',
  'DEMO_014:origin': '서울 송파구 문정동 471',
  'DEMO_014:destination': '서울 송파구 장지동 859-1',
  'DEMO_015:origin': '서울 송파구 문정동 500',
  'DEMO_015:destination': '서울 송파구 장지동 859',
};

function placeDisplay(candidate: DemoRouteCandidate, endpoint: DemoEndpoint) {
  const address = placeAddressOverrides[`${candidate.id}:${endpoint}`];
  if (!address) throw new Error(`목업 주소 매핑 누락: ${candidate.id}:${endpoint}`);
  const normalizedAddress = address.replace(/^서울 송파구 /, '서울특별시 송파구 ');
  return {
    name: normalizedAddress.replace(/^서울특별시 송파구 /, ''),
    address: normalizedAddress,
  };
}

export const pipelineDemoPlaces: PlaceSearchResult[] = pipelineDemoRouteCandidates.flatMap((candidate) => {
  const originDisplay = placeDisplay(candidate, 'origin');
  const destinationDisplay = placeDisplay(candidate, 'destination');
  return [{
    id: `${candidate.id.toLowerCase()}_origin`,
    ...originDisplay,
    ...candidate.origin,
    is_in_coverage: true,
  },
  {
    id: `${candidate.id.toLowerCase()}_destination`,
    ...destinationDisplay,
    ...candidate.destination,
    is_in_coverage: true,
  }];
});

export function getPairedPipelineDestinationIds(
  origin: Pick<PlaceSearchResult, 'id' | 'address'> | null,
): Set<string> | null {
  if (!origin?.id.endsWith('_origin')) return null;

  const destinationIds = pipelineDemoPlaces
    .filter((place) => place.id.endsWith('_origin') && place.address === origin.address)
    .map((place) => `${place.id.slice(0, -'_origin'.length)}_destination`);

  return new Set(destinationIds);
}
