import { fireEvent, render } from '@testing-library/react-native';
import { WalkModeSelector } from '@/src/features/walk/components/WalkModeSelector';

describe('WalkModeSelector', () => {
  it('exposes radio selection and reports the selected walk mode', async () => {
    const onChange = jest.fn();
    const screen = await render(<WalkModeSelector value="cool" onChange={onChange} />);

    expect(screen.getByTestId('walk-mode-cool').props.accessibilityState).toMatchObject({ selected: true, checked: true });
    expect(screen.getByTestId('walk-mode-fast').props.accessibilityState).toMatchObject({ selected: false, checked: false });

    await fireEvent.press(screen.getByTestId('walk-mode-fast'));
    expect(onChange).toHaveBeenCalledWith('fast');
  });
});
