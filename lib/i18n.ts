import { useSettingsStore } from '../store/settings';
import { STRINGS, Locale } from '../constants/strings';

export { Locale };

/** Non-reactive translation — use in event handlers, outside render */
export function t(key: string): string {
  const locale = useSettingsStore.getState().locale;
  return STRINGS[locale]?.[key] ?? STRINGS['en'][key] ?? key;
}

/** Reactive translation hook — re-renders on locale change */
export function useT(): (key: string) => string {
  const locale = useSettingsStore((s) => s.locale);
  return (key: string) => STRINGS[locale]?.[key] ?? STRINGS['en'][key] ?? key;
}
