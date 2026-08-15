import { View } from 'react-native';
import type { RouteMapProps } from './NativeMap';
import { MapLegend } from './MapLegend';
import { MapTextSummary } from './MapTextSummary';
import { MockMap } from './MockMap';
import { DataAttribution } from './DataAttribution';

/**
 * The real react-native-maps implementation is native-only. Keeping the web
 * entry point separate lets the team review the complete flow in a desktop
 * browser without installing a development build or exposing map credentials.
 */
export function PawSafeMap(props: RouteMapProps & { showRouteLegend?: boolean; showSegmentLegend?: boolean }) {
  return (
    <View>
      <MockMap {...props} />
      <DataAttribution />
      <MapLegend showRoutes={props.showRouteLegend} showSegments={props.showSegmentLegend} />
      <MapTextSummary shortest={props.shortest} pawsafe={props.pawsafe} segments={props.segments} />
    </View>
  );
}
