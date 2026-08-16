import { fireEvent, render } from '@testing-library/react-native';
import { RegisteredPlacePicker } from '@/src/features/walk/components/RegisteredPlacePicker';
import { heatDifferenceDemoRoute, pipelineDemoPlaces } from '@/src/mocks/demoRouteCandidates';

describe('RegisteredPlacePicker', () => {
  it('shows only pre-registered origin candidates', async () => {
    const onSelect = jest.fn();
    const screen = await render(<RegisteredPlacePicker label="출발지" field="origin" selected={null} onSelect={onSelect} />);

    await fireEvent.press(screen.getByTestId('origin-picker'));
    await fireEvent.press(screen.getByTestId('origin-option-heat_diff_001_origin'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'heat_diff_001_origin',
      lat: heatDifferenceDemoRoute.origin.lat,
      lng: heatDifferenceDemoRoute.origin.lng,
    }));
  });

  it('limits destinations to the selected validated pair', async () => {
    const onSelect = jest.fn();
    const origin = pipelineDemoPlaces.find((place) => place.id === 'demo_001_origin')!;
    const screen = await render(<RegisteredPlacePicker label="목적지" field="destination" selected={null} pairedWith={origin} onSelect={onSelect} />);

    await fireEvent.press(screen.getByTestId('destination-picker'));
    expect(screen.getByTestId('destination-option-demo_001_destination')).toBeTruthy();
    expect(screen.queryByTestId('destination-option-demo_002_destination')).toBeNull();
  });
});
