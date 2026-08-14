import { act, fireEvent, render } from '@testing-library/react-native';
import { NearbyWalkPlaces } from '@/src/features/walk/components/NearbyWalkPlaces';

describe('NearbyWalkPlaces', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits for an origin before showing nearby recommendations', async () => {
    const screen = await render(<NearbyWalkPlaces origin={null} selected={null} onSelect={jest.fn()} />);

    await act(async () => { await jest.advanceTimersByTimeAsync(300); });
    expect(screen.getByText('출발지를 선택하면 가까운 순으로 보여드려요.')).toBeTruthy();
    expect(screen.queryByTestId('nearby-place-place_mangwon_park')).toBeNull();
  });

  it('offers nearby parks and selects one as the destination', async () => {
    const onSelect = jest.fn();
    const screen = await render(<NearbyWalkPlaces
      origin={{ id: 'place_home', name: '우리집', address: '서울', lat: 37.55, lng: 126.91 }}
      selected={null}
      onSelect={onSelect}
    />);

    await act(async () => { await jest.advanceTimersByTimeAsync(300); });
    expect(screen.getByText('주변 산책로·공원')).toBeTruthy();
    expect(screen.getAllByText('🍃')).toHaveLength(3);
    await fireEvent.press(screen.getByTestId('nearby-place-place_yanghwajin_trail'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'place_yanghwajin_trail', is_in_coverage: true }));
  });
});
