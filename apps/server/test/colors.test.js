import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {COLORS} from '../src/utils/palette.js';
import {createTeamWith, createTestApp, signUp} from './helpers.js';

describe('colours for boards and tasks', () => {
  let app;
  let alice;
  let board;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    board = (await alice.request('POST', '/api/boards', {name: 'B'})).json()
      .board;
  });
  afterEach(() => app.close());

  it('offers a small named palette', () => {
    expect(COLORS).toEqual([
      'sage',
      'sky',
      'lilac',
      'rose',
      'sand',
      'peach',
      'slate',
    ]);
  });

  describe('boards', () => {
    it('start without a colour', () => {
      expect(board.color).toBeNull();
    });

    it('can be created with a colour', async () => {
      const res = await alice.request('POST', '/api/boards', {
        name: 'Coloured',
        color: 'sky',
      });
      expect(res.json().board.color).toBe('sky');
    });

    it('change colour without renaming, and clear it with null', async () => {
      const set = await alice.request('PATCH', `/api/boards/${board.id}`, {
        color: 'rose',
      });
      expect(set.statusCode).toBe(200);
      expect(set.json().board).toMatchObject({name: 'B', color: 'rose'});
      const {boards} = (await alice.request('GET', '/api/boards')).json();
      expect(boards[0].color).toBe('rose');
      const cleared = await alice.request('PATCH', `/api/boards/${board.id}`, {
        color: null,
      });
      expect(cleared.json().board.color).toBeNull();
    });

    it('still renames without touching the colour', async () => {
      await alice.request('PATCH', `/api/boards/${board.id}`, {color: 'sage'});
      const res = await alice.request('PATCH', `/api/boards/${board.id}`, {
        name: 'Renamed',
      });
      expect(res.json().board).toMatchObject({name: 'Renamed', color: 'sage'});
    });

    it('rejects colours outside the palette and empty updates', async () => {
      for (const body of [{color: 'red'}, {color: '#ff0000'}, {}]) {
        const res = await alice.request(
          'PATCH',
          `/api/boards/${board.id}`,
          body,
        );
        expect(res.statusCode, JSON.stringify(body)).toBe(400);
      }
      expect(
        (await alice.request('POST', '/api/boards', {name: 'X', color: 'red'}))
          .statusCode,
      ).toBe(400);
    });

    it('pushes the new colour to people watching the board', async () => {
      const bob = await signUp(app, 'bob');
      const team = await createTeamWith(alice, 'Core', [bob]);
      const shared = (
        await alice.request('POST', '/api/boards', {name: 'S', teamId: team.id})
      ).json().board;
      const ws = await app.injectWS(`/ws/boards/${shared.id}`, {
        headers: {cookie: bob.cookie},
      });
      const received = new Promise((resolve) =>
        ws.on('message', (data) => resolve(JSON.parse(data.toString()))),
      );
      await alice.request('PATCH', `/api/boards/${shared.id}`, {
        color: 'lilac',
      });
      expect(await received).toMatchObject({
        type: 'board.updated',
        payload: {board: {color: 'lilac'}},
      });
      ws.terminate();
    });
  });

  describe('tasks', () => {
    const addTask = (body) =>
      alice.request('POST', `/api/boards/${board.id}/tasks`, {
        stageId: board.stages[0].id,
        title: 'T',
        ...body,
      });

    it('start without a colour, or with the one given', async () => {
      expect((await addTask()).json().task.color).toBeNull();
      expect((await addTask({color: 'peach'})).json().task.color).toBe('peach');
    });

    it('change and clear colour, keeping it through moves', async () => {
      const {task} = (await addTask()).json();
      const set = await alice.request('PATCH', `/api/tasks/${task.id}`, {
        color: 'sand',
      });
      expect(set.json().task.color).toBe('sand');
      const moved = await alice.request('PATCH', `/api/tasks/${task.id}`, {
        stageId: board.stages[1].id,
      });
      expect(moved.json().task.color).toBe('sand');
      const {tasks} = (
        await alice.request('GET', `/api/boards/${board.id}`)
      ).json().board;
      expect(tasks[0].color).toBe('sand');
      const cleared = await alice.request('PATCH', `/api/tasks/${task.id}`, {
        color: null,
      });
      expect(cleared.json().task.color).toBeNull();
    });

    it('rejects colours outside the palette', async () => {
      expect((await addTask({color: 'blue'})).statusCode).toBe(400);
      const {task} = (await addTask()).json();
      expect(
        (await alice.request('PATCH', `/api/tasks/${task.id}`, {color: 'blue'}))
          .statusCode,
      ).toBe(400);
    });

    it('is enforced by the database too', async () => {
      await addTask();
      expect(() =>
        app.db.prepare("UPDATE tasks SET color = 'neon'").run(),
      ).toThrow(/CHECK/);
      expect(() =>
        app.db.prepare("UPDATE boards SET color = 'neon'").run(),
      ).toThrow(/CHECK/);
    });
  });
});
