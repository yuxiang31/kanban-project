import {useTheme} from '../hooks/useTheme.js';
import {MoonIcon, SunIcon} from './Icons.jsx';

/** A pressed/unpressed "Dark mode" button; the icon shows the current mode. */
export default function ThemeToggle() {
  const {theme, toggle} = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label="Dark mode"
      aria-pressed={dark}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      {dark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
