import {describe, expect, it} from 'vitest';
import {
  BOARD_SORTS,
  daysUntil,
  describeDueDate,
  sortBoards,
  todayIso,
} from '../src/features/boards/dueDate.js';

describe('todayIso', () => {
  it('uses the local calendar day', () => {
    expect(todayIso(new Date(2026, 10, 17, 23, 59))).toBe('2026-11-17');
    expect(todayIso(new Date(2027, 0, 5, 0, 1))).toBe('2027-01-05');
  });
});

describe('daysUntil', () => {
  it('counts whole days, across months, years and DST', () => {
    expect(daysUntil('2026-11-17', '2026-11-17')).toBe(0);
    expect(daysUntil('2026-11-18', '2026-11-17')).toBe(1);
    expect(daysUntil('2026-11-10', '2026-11-17')).toBe(-7);
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
    expect(daysUntil('2027-03-29', '2027-03-27')).toBe(2);
  });
});

describe('describeDueDate', () => {
  const today = '2026-11-17';
  it.each([
    ['2026-11-17', 'today', 'soon'],
    ['2026-11-18', 'tomorrow', 'soon'],
    ['2026-11-24', 'in 7 days', 'soon'],
    ['2026-11-25', 'in 8 days', 'later'],
    ['2026-11-16', '1 day overdue', 'overdue'],
    ['2026-11-07', '10 days overdue', 'overdue'],
  ])('%s is %s (%s)', (dueDate, relative, tone) => {
    expect(describeDueDate(dueDate, today)).toMatchObject({relative, tone});
  });

  it('formats the date itself without shifting the day', () => {
    expect(describeDueDate('2026-12-01', today).date).toBe('1 Dec 2026');
  });
});

describe('sortBoards', () => {
  const boards = [
    {id: 1, name: 'No date', dueDate: null},
    {id: 2, name: 'Later', dueDate: '2027-02-01'},
    {id: 3, name: 'Overdue', dueDate: '2026-11-01'},
    {id: 4, name: 'Soon', dueDate: '2026-11-20'},
    {id: 5, name: 'Also no date', dueDate: null},
  ];
  const names = (list) => list.map((b) => b.name);

  it('keeps the server order (newest first) by default', () => {
    expect(names(sortBoards(boards, 'recent'))).toEqual(names(boards));
  });

  it('puts the nearest due date first and boards without one last', () => {
    expect(names(sortBoards(boards, 'due'))).toEqual([
      'Overdue',
      'Soon',
      'Later',
      'No date',
      'Also no date',
    ]);
  });

  it('does not change the input', () => {
    const copy = [...boards];
    sortBoards(boards, 'due');
    expect(boards).toEqual(copy);
  });

  it('lists the sort options', () => {
    expect(BOARD_SORTS.map((s) => s.value)).toEqual(['recent', 'due']);
  });
});
