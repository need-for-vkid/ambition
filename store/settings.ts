import { create } from 'zustand';
import { Locale } from '../constants/strings';
import { getSetting, setSetting } from '../lib/storage';

interface SettingsState {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  hydrateSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  locale: 'en',

  setLocale: async (locale) => {
    await setSetting('locale', locale);
    set({ locale });
  },

  hydrateSettings: async () => {
    const stored = await getSetting('locale');
    if (stored === 'en' || stored === 'ru') {
      set({ locale: stored });
    }
  },
}));
