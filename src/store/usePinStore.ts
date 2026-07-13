import { create } from 'zustand';

interface PinState {
  isLocked: boolean;
  isSettingUp: boolean;
  hasPinSet: boolean;
  lock: () => void;
  unlock: () => void;
  beginSetup: () => void;
  finishSetup: () => void;
  setHasPinSet: (val: boolean) => void;
}

export const usePinStore = create<PinState>()((set) => ({
  isLocked: false,
  isSettingUp: false,
  hasPinSet: false,
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
  beginSetup: () => set({ isSettingUp: true, isLocked: false }),
  finishSetup: () => set({ isSettingUp: false, hasPinSet: true, isLocked: false }),
  setHasPinSet: (val) => set({ hasPinSet: val }),
}));
