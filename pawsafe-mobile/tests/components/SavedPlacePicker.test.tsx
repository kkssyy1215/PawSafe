import { fireEvent, render } from '@testing-library/react-native';
import { SavedPlacePicker } from '@/src/features/walk/components/SavedPlacePicker';
import type { SavedPlace } from '@/src/features/walk/hooks/useSavedPlaces';

const origin: SavedPlace = {
  id: 'place_home',
  label: '우리집',
  name: '우리집',
  address: '서울특별시 마포구 독막로 12',
  lat: 37.55,
  lng: 126.91,
  is_in_coverage: true,
};

describe('SavedPlacePicker', () => {
  it('saves the selected origin with a user-defined label', async () => {
    const onSave = jest.fn();
    const screen = await render(
      <SavedPlacePicker selectedOrigin={origin} savedPlaces={[]} onSelect={jest.fn()} onSave={onSave} onDelete={jest.fn()} />,
    );

    await fireEvent.press(screen.getByTestId('save-origin-place'));
    await fireEvent.changeText(screen.getByTestId('saved-place-name-input'), '회사');
    await fireEvent.press(screen.getByTestId('confirm-save-place'));

    expect(onSave).toHaveBeenCalledWith('회사');
  });

  it('selects and deletes a saved place', async () => {
    const onSelect = jest.fn();
    const onDelete = jest.fn();
    const screen = await render(
      <SavedPlacePicker selectedOrigin={null} savedPlaces={[origin]} onSelect={onSelect} onSave={jest.fn()} onDelete={onDelete} />,
    );

    await fireEvent.press(screen.getByTestId('saved-place-place_home'));
    await fireEvent.press(screen.getByLabelText('우리집 저장 삭제'));

    expect(onSelect).toHaveBeenCalledWith(origin);
    expect(onDelete).toHaveBeenCalledWith('place_home');
  });
});
