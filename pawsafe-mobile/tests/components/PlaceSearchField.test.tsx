import { act, fireEvent, render } from '@testing-library/react-native';
import { PlaceSearchField } from '@/src/features/walk/components/PlaceSearchField';

describe('PlaceSearchField', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('requires choosing a coordinate-backed mock result', async () => {
    const onSelect = jest.fn();
    const screen = await render(<PlaceSearchField label="출발지" field="origin" selected={null} onSelect={onSelect} />);
    await fireEvent.changeText(screen.getByTestId('origin-search-input'), '우리');

    await act(async () => { await jest.advanceTimersByTimeAsync(600); });
    await fireEvent.press(screen.getByTestId('origin-result-place_home'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'place_home', lat: 37.55, lng: 126.91, is_in_coverage: true,
    }));
  });

  it('shows only registered candidates allowed for the field', async () => {
    const screen = await render(
      <PlaceSearchField
        label="출발지"
        field="origin"
        selected={null}
        onSelect={jest.fn()}
        resultFilter={(place) => place.id === 'place_mangwon_market'}
      />,
    );
    await fireEvent.changeText(screen.getByTestId('origin-search-input'), '망원');

    await act(async () => { await jest.advanceTimersByTimeAsync(600); });

    expect(screen.getByTestId('origin-result-place_mangwon_market')).toBeTruthy();
    expect(screen.queryByTestId('origin-result-place_mangwon_park')).toBeNull();
  });
});
