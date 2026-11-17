import {describe, expect, it} from 'vitest';
import {
  filterTasks,
  parsePeopleFilter,
  serializePeopleFilter,
  UNASSIGNED,
} from '../src/features/boards/peopleFilter.js';
import {avatarColor, initials, listNames} from '../src/utils/people.js';

describe('people helpers', () => {
  it('makes initials from display names', () => {
    expect(initials('Alice')).toBe('A');
    expect(initials('alice cooper')).toBe('AC');
    expect(initials('  Mary Ann Smith ')).toBe('MS');
    expect(initials('')).toBe('?');
  });

  it('picks a stable color per user', () => {
    expect(avatarColor(1)).toBe(avatarColor(1));
    expect(avatarColor(1)).not.toBe(avatarColor(2));
  });

  it('lists names in plain English', () => {
    expect(listNames([])).toBe('');
    expect(listNames(['Alice'])).toBe('Alice');
    expect(listNames(['Alice', 'Bob'])).toBe('Alice and Bob');
    expect(listNames(['Alice', 'Bob', 'Carol'])).toBe('Alice, Bob and Carol');
  });
});

describe('people filter', () => {
  const tasks = [
    {id: 1, assigneeIds: [1]},
    {id: 2, assigneeIds: [1, 2]},
    {id: 3, assigneeIds: []},
    {id: 4, assigneeIds: [3]},
  ];

  it('reads and writes the URL value', () => {
    const selected = parsePeopleFilter('2,unassigned,x,2');
    expect([...selected].sort()).toEqual([2, UNASSIGNED].sort());
    expect(parsePeopleFilter(null).size).toBe(0);
    expect(serializePeopleFilter(new Set([UNASSIGNED, 3, 1]))).toBe(
      '1,3,unassigned',
    );
  });

  it('keeps everything when nothing is selected', () => {
    expect(filterTasks(tasks, new Set())).toBe(tasks);
  });

  it('keeps tasks handled by any selected person', () => {
    expect(filterTasks(tasks, new Set([2, 3])).map((t) => t.id)).toEqual([
      2, 4,
    ]);
  });

  it('can include unassigned tasks', () => {
    expect(filterTasks(tasks, new Set([UNASSIGNED])).map((t) => t.id)).toEqual([
      3,
    ]);
    expect(
      filterTasks(tasks, new Set([1, UNASSIGNED])).map((t) => t.id),
    ).toEqual([1, 2, 3]);
  });
});
