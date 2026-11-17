import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {THEME_KEY} from '../src/hooks/useTheme.js';
import {loggedInAsAlice, loggedOut, mockFetch, renderApp} from './utils.jsx';

/** Pretends the OS prefers a colour scheme. */
function systemPrefers(scheme) {
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query === '(prefers-color-scheme: dark)' && scheme === 'dark',
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  systemPrefers('light');
});
afterEach(() => localStorage.clear());

const toggle = () => screen.findByRole('button', {name: 'Dark mode'});

describe('theme toggle', () => {
  it('switches to dark and back, remembering the choice', async () => {
    mockFetch(loggedInAsAlice);
    renderApp('/');
    const user = userEvent.setup();
    const button = await toggle();
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('starts from a saved choice', async () => {
    localStorage.setItem(THEME_KEY, 'dark');
    mockFetch(loggedInAsAlice);
    renderApp('/');
    expect(await toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('follows the system until the user chooses', async () => {
    systemPrefers('dark');
    mockFetch(loggedInAsAlice);
    renderApp('/');
    const user = userEvent.setup();
    const button = await toggle();
    expect(button).toHaveAttribute('aria-pressed', 'true');
    // Nothing is forced while following the system.
    expect(document.documentElement.dataset.theme).toBeUndefined();
    await user.click(button);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('is available on the login page too', async () => {
    mockFetch(loggedOut);
    renderApp('/login');
    expect(await toggle()).toBeVisible();
  });

  it('still toggles when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mockFetch(loggedInAsAlice);
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await toggle());
    expect(document.documentElement.dataset.theme).toBe('dark');
    vi.restoreAllMocks();
  });

  it('copes with a browser without matchMedia', async () => {
    vi.stubGlobal('matchMedia', undefined);
    mockFetch(loggedInAsAlice);
    renderApp('/');
    expect(await toggle()).toHaveAttribute('aria-pressed', 'false');
  });
});
