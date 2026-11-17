import {screen} from '@testing-library/react';
import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import App from '../src/App.jsx';
import {loggedInAsAlice, loggedOut, mockFetch, renderApp} from './utils.jsx';

describe('App', () => {
  it('renders the home page for a logged-in user', async () => {
    mockFetch(loggedInAsAlice);
    renderApp('/');
    expect(
      await screen.findByRole('heading', {name: /your boards/i}),
    ).toBeInTheDocument();
  });

  it('renders a not-found page for unknown routes', () => {
    mockFetch(loggedOut);
    renderApp('/nope');
    expect(screen.getByRole('heading', {name: /not found/i})).toBeVisible();
  });

  it('uses the browser URL when no initial entries are given', async () => {
    mockFetch(loggedOut);
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(
      await screen.findByRole('heading', {name: /log in/i}),
    ).toBeInTheDocument();
  });
});
