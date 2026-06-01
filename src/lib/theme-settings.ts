export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'ulybridge.theme.mode.v1';
const THEME_COLORS: Record<ResolvedThemeMode, string> = {
  light: '#0f766e',
  dark: '#020617',
};

export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'dark' || value === 'light' ? value : DEFAULT_THEME_MODE;
}

export function loadThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE;

  try {
    return normalizeThemeMode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export function saveThemeMode(mode: ThemeMode): ThemeMode {
  const normalized = normalizeThemeMode(mode);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  }
  applyThemeMode(normalized);
  return normalized;
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return;

  const normalized = normalizeThemeMode(mode);
  const resolved = resolveThemeMode(normalized);
  const root = document.documentElement;
  root.dataset.themeMode = normalized;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  const themeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (themeColor) {
    themeColor.content = THEME_COLORS[resolved];
  }
}

export function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  const normalized = normalizeThemeMode(mode);
  if (normalized !== 'system') return normalized;

  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}
