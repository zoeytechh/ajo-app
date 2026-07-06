import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> =>
    (await SecureStore.getItemAsync(name)) || null,
  setItem: async (name: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(name, value),
  removeItem: async (name: string): Promise<void> =>
    SecureStore.deleteItemAsync(name),
};

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'ajo-theme',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
