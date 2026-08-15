import { View } from 'react-native';
import type { RouteMapProps } from './NativeMap';
import { MapLegend } from './MapLegend';
import { MapTextSummary } from './MapTextSummary';
import { DataAttribution } from './DataAttribution';
import { WebRouteMap } from './WebRouteMap.web';

// react-native-maps is native-only. Web renders the API's real GeoJSON route
// as a responsive vector map instead of showing a hard-coded mock polyline.
export function PawSafeMap(props: RouteMapProps & { showRouteLegend?: boolean; showSegmentLegend?: boolean }) {
  return <View><WebRouteMap {...props} /><MapLegend showRoutes={props.showRouteLegend} showSegments={props.showSegmentLegend} walkMode={props.walkMode} /><MapTextSummary origin={props.origin} destination={props.destination} shortest={props.shortest} pawsafe={props.pawsafe} segments={props.segments} walkMode={props.walkMode} visuallyHidden /><DataAttribution walkMode={props.walkMode} /></View>;
}
