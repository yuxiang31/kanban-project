import {describe, expect, it} from 'vitest';
import {ApiError, CLIENT_ID, apiFetch} from '../src/api/client.js';
import {mockFetch} from './utils.jsx';

describe('apiFetch', () => {
  it('GETs JSON with credentials', async () => {
    const fetch = mockFetch({'GET /api/things': {body: {things: [1]}}});
    await expect(apiFetch('/things')).resolves.toEqual({things: [1]});
    expect(fetch).toHaveBeenCalledWith(
      '/api/things',
      expect.objectContaining({method: 'GET', credentials: 'include'}),
    );
  });

  it('identifies this tab so it can skip its own live events', async () => {
    const fetch = mockFetch({'GET /api/things': {body: {}}});
    await apiFetch('/things');
    expect(CLIENT_ID).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(fetch.mock.calls[0][1].headers['X-Client-Id']).toBe(CLIENT_ID);
  });

  it('sends a JSON body', async () => {
    const fetch = mockFetch({'POST /api/things': (body) => ({body})});
    await expect(
      apiFetch('/things', {method: 'POST', body: {a: 1}}),
    ).resolves.toEqual({a: 1});
    const init = fetch.mock.calls[0][1];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('returns null for 204', async () => {
    mockFetch({'DELETE /api/things/1': {status: 204}});
    await expect(apiFetch('/things/1', {method: 'DELETE'})).resolves.toBeNull();
  });

  it('throws ApiError with the server message', async () => {
    mockFetch({'GET /api/x': {status: 409, body: {message: 'Taken.'}}});
    const err = await apiFetch('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({status: 409, message: 'Taken.'});
  });

  it('falls back to a generic message for non-JSON errors', async () => {
    globalThis.fetch = async () => new Response('oops', {status: 502});
    await expect(apiFetch('/x')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed (502).',
    });
  });
});
