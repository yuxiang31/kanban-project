/**
 * @fileoverview The public landing page that logged-out visitors see at "/".
 */

import {screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {loggedInAsAlice, loggedOut, mockFetch, renderApp} from './utils.jsx';

describe('landing page', () => {
  it('is what logged-out visitors see at the home address', async () => {
    mockFetch(loggedOut);
    renderApp('/');
    expect(
      await screen.findByRole('heading', {level: 1, name: /work that moves/i}),
    ).toBeVisible();
    expect(screen.queryByRole('heading', {name: /log in/i})).toBeNull();
  });

  it('describes what the product does', async () => {
    mockFetch(loggedOut);
    renderApp('/');
    await screen.findByRole('heading', {level: 1});
    for (const name of [
      /your stages, your workflow/i,
      /live for the whole team/i,
      /who's on it, and when it's due/i,
    ]) {
      expect(screen.getByRole('heading', {level: 3, name})).toBeVisible();
    }
  });

  it('leads to creating an account', async () => {
    mockFetch(loggedOut);
    renderApp('/');
    const user = userEvent.setup();
    const hero = (await screen.findByRole('heading', {level: 1})).closest(
      'section',
    );
    await user.click(
      within(hero).getByRole('link', {name: /create an account/i}),
    );
    expect(
      await screen.findByRole('heading', {name: /create an account/i}),
    ).toBeVisible();
  });

  it('leads to logging in, and back home from there', async () => {
    mockFetch(loggedOut);
    renderApp('/');
    const user = userEvent.setup();
    const nav = await screen.findByRole('navigation', {name: /site/i});
    await user.click(within(nav).getByRole('link', {name: /^log in$/i}));
    expect(
      await screen.findByRole('heading', {name: /^log in$/i}),
    ).toBeVisible();
    await user.click(screen.getByRole('link', {name: /kanban home/i}));
    expect(
      await screen.findByRole('heading', {level: 1, name: /work that moves/i}),
    ).toBeVisible();
  });

  it('has the theme toggle', async () => {
    mockFetch(loggedOut);
    renderApp('/');
    expect(
      await screen.findByRole('button', {name: /dark mode/i}),
    ).toBeVisible();
  });

  it('is skipped for logged-in users, who get their boards', async () => {
    mockFetch(loggedInAsAlice);
    renderApp('/');
    expect(
      await screen.findByRole('heading', {name: /your boards/i}),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', {name: /work that moves/i}),
    ).toBeNull();
  });

  it('does not replace the login redirect for other pages', async () => {
    mockFetch(loggedOut);
    renderApp('/boards/5');
    expect(
      await screen.findByRole('heading', {name: /^log in$/i}),
    ).toBeVisible();
  });
});
