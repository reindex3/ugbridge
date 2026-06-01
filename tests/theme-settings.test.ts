import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_THEME_MODE,
  applyThemeMode,
  loadThemeMode,
  normalizeThemeMode,
  resolveThemeMode,
  saveThemeMode,
} from '../src/lib/theme-settings';

describe('theme settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-mode');
    document.documentElement.style.colorScheme = '';
  });

  it('normalizes unknown values to system mode', () => {
    expect(normalizeThemeMode('system')).toBe(DEFAULT_THEME_MODE);
    expect(normalizeThemeMode('dark')).toBe('dark');
    expect(normalizeThemeMode('light')).toBe('light');
    expect(normalizeThemeMode(null)).toBe(DEFAULT_THEME_MODE);
  });

  it('loads and saves the selected theme mode', () => {
    saveThemeMode('dark');

    expect(loadThemeMode()).toBe('dark');
    expect(document.documentElement.dataset.themeMode).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('applies light mode to the document root', () => {
    applyThemeMode('light');

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('resolves system mode from the current media query', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    expect(resolveThemeMode('system')).toBe('dark');
  });
});
