import '@testing-library/jest-dom/vitest';
import {cleanup, configure} from '@testing-library/react';
import {afterEach, beforeEach, vi} from 'vitest';
import {FakeWebSocket} from './fakeSocket.js';

// findBy*/waitFor give up after 1s by default; a cold or busy machine
// (first run after edits, CI) can exceed that without anything being wrong.
configure({asyncUtilTimeout: 3000});

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
