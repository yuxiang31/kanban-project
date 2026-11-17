import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTeamWith, createTestApp, signUp} from './helpers.js';

describe('board descriptions', () => {
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

  const patch = (body) =>
    alice.request('PATCH', `/api/boards/${board.id}`, body);

  it('start empty, or with the description given', async () => {
    expect(board.description).toBe('');
    const res = await alice.request('POST', '/api/boards', {
      name: 'Launch',
      description: '  Everything needed to ship v2 by March.  ',
    });
    expect(res.json().board.description).toBe(
      'Everything needed to ship v2 by March.',
    );
  });

  it('can be added, changed and cleared', async () => {
    expect(
      (await patch({description: 'Tracks hiring'})).json().board,
    ).toMatchObject({name: 'B', description: 'Tracks hiring'});
    const {boards} = (await alice.request('GET', '/api/boards')).json();
    expect(boards[0].description).toBe('Tracks hiring');
    expect((await patch({description: ''})).json().board.description).toBe('');
  });

  it('survive renames and colour changes', async () => {
    await patch({description: 'Keep me'});
    await patch({name: 'Renamed'});
    await patch({color: 'sky'});
    const {board: full} = (
      await alice.request('GET', `/api/boards/${board.id}`)
    ).json();
    expect(full).toMatchObject({
      name: 'Renamed',
      color: 'sky',
      description: 'Keep me',
    });
  });

  it('are limited to 1000 characters', async () => {
    expect((await patch({description: 'x'.repeat(1001)})).statusCode).toBe(400);
    expect((await patch({description: 'x'.repeat(1000)})).statusCode).toBe(200);
  });
});

describe('stage colours', () => {
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

  const patchStage = (stage, body) =>
    alice.request('PATCH', `/api/stages/${stage.id}`, body);

  it('start without a colour', () => {
    expect(board.stages.map((s) => s.color)).toEqual([null, null, null]);
  });

  it('can be set and cleared without renaming or moving', async () => {
    const [todo] = board.stages;
    const set = await patchStage(todo, {color: 'sage'});
    expect(set.statusCode).toBe(200);
    expect(set.json().stage).toMatchObject({name: 'To Do', color: 'sage'});
    const {board: full} = (
      await alice.request('GET', `/api/boards/${board.id}`)
    ).json();
    expect(full.stages.map((s) => s.name)).toEqual([
      'To Do',
      'In Progress',
      'Done',
    ]);
    expect(full.stages[0].color).toBe('sage');
    expect(
      (await patchStage(todo, {color: null})).json().stage.color,
    ).toBeNull();
  });

  it('keeps the colour through a rename', async () => {
    const [todo] = board.stages;
    await patchStage(todo, {color: 'rose'});
    expect(
      (await patchStage(todo, {name: 'Backlog'})).json().stage,
    ).toMatchObject({name: 'Backlog', color: 'rose'});
  });

  it('rejects colours outside the palette', async () => {
    expect(
      (await patchStage(board.stages[0], {color: 'teal'})).statusCode,
    ).toBe(400);
    expect(() =>
      app.db.prepare("UPDATE stages SET color = 'teal'").run(),
    ).toThrow(/CHECK/);
  });

  it('pushes the change to people watching the board', async () => {
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
    await patchStage(shared.stages[1], {color: 'lilac'});
    expect(await received).toMatchObject({
      type: 'stage.updated',
      payload: {stage: {color: 'lilac'}},
    });
    ws.terminate();
  });
});
