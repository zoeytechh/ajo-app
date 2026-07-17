/**
 * Unit tests for authService — verifies correct API calls and store interactions.
 * The axios instance (api) and zustand store are mocked so no network or native
 * modules are exercised.
 */

import { authService } from '../authService';

// ─── Mock the api axios instance ─────────────────────────────────────────────

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get:    jest.fn(),
    post:   jest.fn(),
    patch:  jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

// ─── Mock the auth store ──────────────────────────────────────────────────────

const mockSetAuth    = jest.fn();
const mockUpdateUser = jest.fn();
const mockLogout     = jest.fn();

jest.mock('../../store/useAppStore', () => ({
  useAuthStore: {
    getState: () => ({
      setAuth:    mockSetAuth,
      updateUser: mockUpdateUser,
      logout:     mockLogout,
    }),
  },
}));

import api from '../api';

const mockPost  = api.post  as jest.Mock;
const mockGet   = api.get   as jest.Mock;
const mockPatch = api.patch as jest.Mock;

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authService.register', () => {
  it('calls the register endpoint with the supplied payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'Verification email sent.' } });

    const payload = {
      email: 'test@example.com',
      phone_number: '+2348012345678',
      password: 'securepass123',
      first_name: 'Ada',
      last_name: 'Obi',
    };

    const result = await authService.register(payload);

    expect(mockPost).toHaveBeenCalledWith('/api/auth/register/', payload);
    expect(result).toEqual({ message: 'Verification email sent.' });
  });

  it('forwards optional device_id when provided', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'ok' } });

    const payload = {
      email: 'a@b.com',
      phone_number: '+2348000000000',
      password: 'pass1234',
      first_name: 'A',
      last_name: 'B',
      device_id: 'abc-device-123',
    };

    await authService.register(payload);
    expect(mockPost).toHaveBeenCalledWith('/api/auth/register/', payload);
  });
});

describe('authService.verifyEmail', () => {
  it('calls the verify-email endpoint with email and code', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'Email verified.' } });

    const result = await authService.verifyEmail('user@test.com', '123456');

    expect(mockPost).toHaveBeenCalledWith('/api/auth/verify-email/', {
      email: 'user@test.com',
      code: '123456',
    });
    expect(result).toEqual({ message: 'Email verified.' });
  });
});

describe('authService.verifyPhone', () => {
  it('calls the verify-phone endpoint with email and code', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'Phone verified.' } });

    await authService.verifyPhone('user@test.com', '654321');

    expect(mockPost).toHaveBeenCalledWith('/api/auth/verify-phone/', {
      email: 'user@test.com',
      code: '654321',
    });
  });
});

describe('authService.resendOtp', () => {
  it('calls the resend-otp endpoint for email type', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'OTP sent.' } });

    await authService.resendOtp('user@test.com', 'email');

    expect(mockPost).toHaveBeenCalledWith('/api/auth/resend-otp/', {
      email: 'user@test.com',
      type: 'email',
    });
  });

  it('calls the resend-otp endpoint for phone type', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'OTP sent.' } });

    await authService.resendOtp('user@test.com', 'phone');

    expect(mockPost).toHaveBeenCalledWith('/api/auth/resend-otp/', {
      email: 'user@test.com',
      type: 'phone',
    });
  });
});

describe('authService.login', () => {
  const fakeUser  = { id: 1, email: 'admin@test.com', first_name: 'Ada', last_name: 'Obi' };
  const fakeTokens = { access: 'access-token', refresh: 'refresh-token', user: fakeUser };

  it('calls the login endpoint with credentials', async () => {
    mockPost.mockResolvedValueOnce({ data: fakeTokens });

    await authService.login({ email: 'admin@test.com', password: 'pass' });

    expect(mockPost).toHaveBeenCalledWith('/api/auth/login/', {
      email: 'admin@test.com',
      password: 'pass',
    });
  });

  it('stores the returned tokens and user via the auth store', async () => {
    mockPost.mockResolvedValueOnce({ data: fakeTokens });

    await authService.login({ email: 'admin@test.com', password: 'pass' });

    expect(mockSetAuth).toHaveBeenCalledWith(
      fakeUser,
      fakeTokens.access,
      fakeTokens.refresh,
    );
  });

  it('returns the full token payload', async () => {
    mockPost.mockResolvedValueOnce({ data: fakeTokens });

    const result = await authService.login({ email: 'admin@test.com', password: 'pass' });
    expect(result).toEqual(fakeTokens);
  });
});

describe('authService.getMe', () => {
  it('calls the me endpoint and updates the store', async () => {
    const fakeUser = { id: 2, email: 'user@test.com' };
    mockGet.mockResolvedValueOnce({ data: fakeUser });

    const result = await authService.getMe();

    expect(mockGet).toHaveBeenCalledWith('/api/auth/me/');
    expect(mockUpdateUser).toHaveBeenCalledWith(fakeUser);
    expect(result).toEqual(fakeUser);
  });
});

describe('authService.updateFcmToken', () => {
  it('patches the me endpoint with the fcm_token', async () => {
    const fakeUser = { id: 2, email: 'user@test.com', fcm_token: 'new-token' };
    mockPatch.mockResolvedValueOnce({ data: fakeUser });

    await authService.updateFcmToken('new-token');

    expect(mockPatch).toHaveBeenCalledWith('/api/auth/me/', { fcm_token: 'new-token' });
  });
});

describe('authService.logout', () => {
  it('calls the store logout method', () => {
    authService.logout();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
