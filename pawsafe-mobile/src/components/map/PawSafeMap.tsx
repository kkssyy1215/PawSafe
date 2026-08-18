import { View } from 'react-native';
import { MapLegend } from './MapLegend';
import { MapTextSummary } from './MapTextSummary';
import { NativeMap, type RouteMapProps } from './NativeMap';
import { DataAttribution } from './DataAttribution';

export function PawSafeMap(props: RouteMapProps & { showRouteLegend?: boolean; showSegmentLegend?: boolean }) {
  return <View><NativeMap {...props} /><MapLegend showRoutes={props.showRouteLegend} showSegments={props.showSegmentLegend} walkMode={props.walkMode} /><MapTextSummary origin={props.origin} destination={props.destination} shortest={props.shortest} pawsafe={props.pawsafe} segments={props.segments} walkMode={props.walkMode} visuallyHidden /><DataAttribution walkMode={props.walkMode} /></View>;
}
