import { create } from "zustand";
import {
  normalizeOrderSettings,
  ORDER_MODE_DEFAULTS,
  ORDER_MODES,
} from "../constants/orderLimits";

const useKdsSettingsStore = create((set) => ({
  settings: normalizeOrderSettings(ORDER_MODE_DEFAULTS[ORDER_MODES.QUICK_SERVICE]),
  setSettings: (settings) => set({ settings: normalizeOrderSettings(settings) }),
}));

export const getCurrentKdsSettings = () =>
  normalizeOrderSettings(useKdsSettingsStore.getState().settings);

export default useKdsSettingsStore;
