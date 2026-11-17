import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import App, {AppProviders} from '../src/App.jsx';

describe('App', () => {
  it('renders the app shell for the home route', () => {
    render(<AppProviders initialEntries={['/']} />);
    expect(screen.getByRole('heading', {name: /kanban/i})).toBeInTheDocument();
  });

  it('renders a not-found page for unknown routes', () => {
    render(<AppProviders initialEntries={['/nope']} />);
    expect(screen.getByRole('heading', {name: /not found/i})).toBeVisible();
  });

  it('uses the browser URL when no initial entries are given', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', {name: /kanban/i})).toBeInTheDocument();
  });
});
