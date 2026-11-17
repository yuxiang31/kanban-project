import {describe, expect, it} from 'vitest';
import {nextPosition, positionBetween} from '../src/utils/position.js';

describe('position', () => {
  it('appends after the max, or starts at the step when empty', () => {
    expect(nextPosition(null)).toBe(1024);
    expect(nextPosition(2048)).toBe(3072);
  });

  it('places between neighbours', () => {
    expect(positionBetween(null, null)).toBe(1024);
    expect(positionBetween(null, 1024)).toBe(512);
    expect(positionBetween(1024, null)).toBe(2048);
    expect(positionBetween(1024, 2048)).toBe(1536);
  });
});
