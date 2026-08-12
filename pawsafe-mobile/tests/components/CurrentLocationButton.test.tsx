import { fireEvent, render } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { CurrentLocationButton } from '@/src/features/walk/components/CurrentLocationButton';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  Accuracy: { Balanced: 3 },
  hasServicesEnabledAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('CurrentLocationButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('offers manual search when location services are disabled', async () => {
    mockLocation.hasServicesEnabledAsync.mockResolvedValue(false);
    const screen = await render(<CurrentLocationButton onSelect={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: '현재 위치를 출발지로 사용' }));
    expect(screen.getByText(/기기의 위치 서비스를 켠 뒤/)).toBeTruthy();
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('handles foreground permission denial without requesting a position', async () => {
    mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ status: Location.PermissionStatus.DENIED, canAskAgain: true } as Location.LocationPermissionResponse);
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: Location.PermissionStatus.DENIED, canAskAgain: true } as Location.LocationPermissionResponse);
    const screen = await render(<CurrentLocationButton onSelect={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: '현재 위치를 출발지로 사용' }));
    expect(screen.getByText(/위치 권한 없이도/)).toBeTruthy();
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  });
});
