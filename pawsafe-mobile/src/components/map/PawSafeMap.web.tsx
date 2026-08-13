import { View } from 'react-native';
import type { RouteMapProps } from './NativeMap';
import { MapLegend } from './MapLegend';
import { MapTextSummary } from './MapTextSummary';
import { MockMap } from './MockMap';

// react-native-maps is native-only. Desktop review uses the same deterministic
// mock route, so UI changes can be checked without a device or map key.
export function PawSafeMap(props: RouteMapProps & { showRouteLegend?: boolean; showSegmentLegend?: boolean }) {
  return <View><MockMap {...props} /><MapLegend showRoutes={props.showRouteLegend} showSegments={props.showSegmentLegend} /><MapTextSummary shortest={props.shortest} pawsafe={props.pawsafe} segments={props.segments} /></View>;
}
