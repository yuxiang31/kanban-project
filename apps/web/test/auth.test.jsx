import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {
  alice,
  loggedInAsAlice,
  loggedOut,
  mockFetch,
  renderApp,
} from './utils.jsx';

describe('authentication', () => {
  it('sends logged-out visitors to the login page', async () => {
    mockFetch(loggedOut);
    renderApp('/teams');
    expect(
      await screen.findByRole('heading', {name: /log in/i}),
    ).toBeInTheDocument();
  });

  it('logs in and shows the app with the user name', async () => {
    const fetch = mockFetch({
      ...loggedOut,
      'POST /api/auth/login': {body: {user: alice}},
    });
    renderApp('/login');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/username/i), 'alice');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.click(screen.getByRole('button', {name: /log in/i}));

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    const loginCall = fetch.mock.calls.find(([url]) => url.endsWith('/login'));
    expect(JSON.parse(loginCall[1].body)).toEqual({
      username: 'alice',
      password: 'password123',
    });
  });

  it('shows the server error when login fails', async () => {
    mockFetch({
      ...loggedOut,
      'POST /api/auth/login': {
        status: 401,
        body: {message: 'Invalid username or password.'},
      },
    });
    renderApp('/login');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/username/i), 'alice');
    await user.type(screen.getByLabelText(/^password/i), 'wrong-password');
    await user.click(screen.getByRole('button', {name: /log in/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid username or password.',
    );
  });

  it('validates the register form before calling the server', async () => {
    const fetch = mockFetch(loggedOut);
    renderApp('/register');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/username/i), 'alice');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different1');
    await user.click(screen.getByRole('button', {name: /create account/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i);
    expect(fetch.mock.calls.some(([url]) => url.endsWith('/register'))).toBe(
      false,
    );
  });

  it.each([
    ['al', 'password123', /3.*32 characters/i],
    ['bad name', 'password123', /letters, numbers/i],
    ['alice', 'short', /at least 8/i],
  ])(
    'rejects username %s / password %s',
    async (username, password, message) => {
      mockFetch(loggedOut);
      renderApp('/register');
      const user = userEvent.setup();
      await user.type(await screen.findByLabelText(/username/i), username);
      await user.type(screen.getByLabelText(/^password/i), password);
      await user.type(screen.getByLabelText(/confirm password/i), password);
      await user.click(screen.getByRole('button', {name: /create account/i}));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    },
  );

  it('registers and lands in the app', async () => {
    const fetch = mockFetch({
      ...loggedOut,
      'POST /api/auth/register': {status: 201, body: {user: alice}},
    });
    renderApp('/register');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/username/i), 'alice');
    await user.type(screen.getByLabelText(/display name/i), 'Alice');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', {name: /create account/i}));
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/register'));
    expect(JSON.parse(call[1].body)).toEqual({
      username: 'alice',
      displayName: 'Alice',
      password: 'password123',
    });
  });

  it('shows a server error from registration', async () => {
    mockFetch({
      ...loggedOut,
      'POST /api/auth/register': {
        status: 409,
        body: {message: 'That username is taken.'},
      },
    });
    renderApp('/register');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/username/i), 'alice');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', {name: /create account/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent(/taken/);
  });

  it('redirects logged-in users away from the login page', async () => {
    mockFetch(loggedInAsAlice);
    renderApp('/login');
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.queryByRole('heading', {name: /log in/i})).toBeNull();
  });

  it('logs out back to the landing page', async () => {
    mockFetch({...loggedInAsAlice, 'POST /api/auth/logout': {status: 204}});
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /log out/i}));
    expect(
      await screen.findByRole('heading', {level: 1, name: /work that moves/i}),
    ).toBeInTheDocument();
  });

  it('shows an error if the session check fails', async () => {
    mockFetch({'GET /api/auth/me': {status: 500, body: {message: 'Down.'}}});
    renderApp('/');
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Down.'),
    );
  });
});
