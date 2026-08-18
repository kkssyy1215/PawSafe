import { act, fireEvent, render } from '@testing-library/react-native';
import type { PlaceSearchResult } from '@/src/api/contracts';
import { PlaceSearchField } from '@/src/features/walk/components/PlaceSearchField';

const mockSearchPlaces = jest.fn<Promise<PlaceSearchResult[]>, [string]>();

jest.mock('@/src/providers/places/createPlaceSearchProvider', () => ({
  getPlaceSearchProvider: () => ({ searchPlaces: mockSearchPlaces }),
}));

const places: PlaceSearchResult[] = [
  {
    id: 'place_001',
    name: '위례광장로 185',
    address: '서울특별시 송파구 위례광장로 185',
    lat: 37.4811743,
    lng: 127.1405973,
    is_in_coverage: true,
  },
  {
    id: 'place_002',
    name: '장지동 900-2',
    address: '서울특별시 송파구 장지동 900-2',
    lat: 37.4772949,
    lng: 127.1410705,
    is_in_coverage: true,
  },
  {
    id: 'place_018',
    name: '장지동 859-1',
    address: '서울특별시 송파구 장지동 859-1',
    lat: 37.478385181,
    lng: 127.133232038,
    is_in_coverage: true,
  },
];

describe('PlaceSearchField', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSearchPlaces.mockReset();
    mockSearchPlaces.mockImplementation(async (query) => (
      query.includes('위례') ? [places[0]]
        : query.includes('장지') ? places.slice(1)
          : []
    ));
  });
  afterEach(() => jest.useRealTimers());

  it('requires choosing a coordinate-backed API result', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <PlaceSearchField label="출발지" field="origin" selected={null} onSelect={onSelect} />,
    );
    await fireEvent.changeText(screen.getByTestId('origin-search-input'), '위례');

    await act(async () => { await jest.advanceTimersByTimeAsync(600); });
    await fireEvent.press(screen.getByTestId('origin-result-place_001'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'place_001',
      lat: 37.4811743,
      lng: 127.1405973,
      is_in_coverage: true,
    }));
  });

  it('shows only registered candidates allowed for the field', async () => {
    const screen = await render(
      <PlaceSearchField
        label="목적지"
        field="destination"
        selected={null}
        onSelect={jest.fn()}
        resultFilter={(place) => place.id === 'place_002'}
      />,
    );
    await fireEvent.changeText(screen.getByTestId('destination-search-input'), '장지');

    await act(async () => { await jest.advanceTimersByTimeAsync(600); });

    expect(screen.getByTestId('destination-result-place_002')).toBeTruthy();
    expect(screen.queryByTestId('destination-result-place_018')).toBeNull();
  });

  it('supports microphone input and applies the recognized address as text', async () => {
    const onVoiceInputPress = jest.fn();
    const screen = await render(
      <PlaceSearchField
        label="출발지"
        field="origin"
        selected={null}
        onSelect={jest.fn()}
        voiceInputEnabled
        voiceDraft={{ text: '위례광장로 185', revision: 1 }}
        onVoiceInputPress={onVoiceInputPress}
      />,
    );

    await act(async () => undefined);
    expect(screen.getByTestId('origin-search-input').props.value).toBe('위례광장로 185');
    await fireEvent.press(screen.getByTestId('origin-voice-input'));
    expect(onVoiceInputPress).toHaveBeenCalledTimes(1);
  });

  it('automatically selects the first matching address after final voice recognition', async () => {
    const onSelect = jest.fn();
    await render(
      <PlaceSearchField
        label="출발지"
        field="origin"
        selected={null}
        onSelect={onSelect}
        voiceInputEnabled
        voiceDraft={{ text: '위례광장로 185', revision: 1, isFinal: true }}
      />,
    );

    await act(async () => { await jest.advanceTimersByTimeAsync(600); });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'place_001',
      address: '서울특별시 송파구 위례광장로 185',
    }));
  });
});
