import {describe, expect, it} from 'vitest';
import {
  neighboursForStep,
  pluralize,
} from '../src/features/boards/boardModel.js';

describe('neighboursForStep', () => {
  const items = [{id: 1}, {id: 2}, {id: 3}];

  it('finds neighbours one step left or right', () => {
    expect(neighboursForStep(items, 2, -1)).toEqual({prevId: 1, nextId: 2});
    expect(neighboursForStep(items, 0, 1)).toEqual({prevId: 2, nextId: 3});
    expect(neighboursForStep(items, 1, -1)).toEqual({prevId: null, nextId: 1});
    expect(neighboursForStep(items, 1, 1)).toEqual({prevId: 3, nextId: null});
  });

  it('returns null at the ends', () => {
    expect(neighboursForStep(items, 0, -1)).toBeNull();
    expect(neighboursForStep(items, 2, 1)).toBeNull();
  });
});

describe('pluralize', () => {
  it('handles one and many', () => {
    expect(pluralize(1, 'task')).toBe('1 task');
    expect(pluralize(0, 'task')).toBe('0 tasks');
  });
});
