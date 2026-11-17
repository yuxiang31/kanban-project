/**
 * @fileoverview Light/dark theme. Follows the OS until the user picks one;
 * the pick is remembered in localStorage and applied as
 * `<html data-theme="…">` (index.html applies it before first paint).
 */

import {useEffect, useState} from 'react';

export const THEME_KEY = 'kanban-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** @return {?string} 'light', 'dark', or null if none saved/readable. */
function readSaved() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** @return {?MediaQueryList} */
function darkQuery() {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY)
    : null;
}

/** @return {{theme: string, toggle: function()}} */
export function useTheme() {
  const [saved, setSaved] = useState(readSaved);
  const [systemDark, setSystemDark] = useState(
    () => darkQuery()?.matches ?? false,
  );

  useEffect(() => {
    const query = darkQuery();
    if (!query?.addEventListener) {
      return undefined;
    }
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (saved) {
      document.documentElement.dataset.theme = saved;
    }
  }, [saved]);

  const theme = saved ?? (systemDark ? 'dark' : 'light');

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setSaved(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked (private mode): the choice lasts for this visit.
    }
  }

  return {theme, toggle};
}
