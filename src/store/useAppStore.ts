import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// ─── Secure storage adapter ───────────────────────────────────────────────────

const secureStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,
  setItem: async (name, value) => { await SecureStore.setItemAsync(name, value); },
  removeItem: async (name) => { await SecureStore.deleteItemAsync(name); },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AjoUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: 'member' | 'group_admin' | 'super_admin';
  is_email_verified: boolean;
  is_phone_verified: boolean;
  profile_photo: string | null;
  fcm_token: string | null;
  date_joined: string;
}

interface AuthState {
  user: AjoUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  _hasHydrated: boolean;
  setAuth: (user: AjoUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (updates: Partial<AjoUser>) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

// ─── Auth store (persisted to SecureStore) ────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      _hasHydrated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () => set({ user: null, accessToken: null, refreshToken: null }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'ajo-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
