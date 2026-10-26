import type { Settings } from './types';

const KEY = 'habit-tracker-settings';

const DEFAULTS: Settings = {
  cloudEnabled: false,
  theme: 'dark'
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(next: Settings): Settings {
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = saveSettings({ ...getSettings(), ...patch });
  return next;
}
