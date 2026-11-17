/**
 * @fileoverview An in-memory stand-in for the boards/stages/tasks API, so
 * UI tests can exercise real create → refetch cycles. It mirrors the
 * server's response shapes, not its every rule.
 */

const STEP = 1024;

/**
 * @return {{
 *   state: !Object,
 *   handle: function(string, string, *): (!Object|undefined),
 *   seedBoard: function(string, !Array<string>=): !Object,
 *   addTask: function(number, string, string=): !Object,
 *   failNext: function(string, number, string): void,
 * }}
 */
export function createFakeApi() {
  const state = {boards: [], stages: [], tasks: [], nextId: 100};
  const failures = new Map();
  const id = () => state.nextId++;
  const byPosition = (a, b) => a.position - b.position;

  const stagesOf = (boardId) =>
    state.stages.filter((s) => s.boardId === boardId).sort(byPosition);
  const tasksOf = (boardId) =>
    state.tasks.filter((t) => t.boardId === boardId).sort(byPosition);
  const fullBoard = (board) => ({
    ...board,
    canDelete: true,
    stages: stagesOf(board.id),
    tasks: tasksOf(board.id),
  });
  const notFound = {status: 404, body: {message: 'Not found.'}};

  function seedBoard(name, stageNames = ['To Do', 'In Progress', 'Done']) {
    const board = {
      id: id(),
      name,
      teamId: null,
      createdBy: 1,
      createdAt: '2026-11-17 10:00:00',
    };
    state.boards.unshift(board);
    stageNames.forEach((stageName, i) =>
      state.stages.push({
        id: id(),
        boardId: board.id,
        name: stageName,
        position: (i + 1) * STEP,
      }),
    );
    return fullBoard(board);
  }

  function addTask(stageId, title, description = '') {
    const stage = state.stages.find((s) => s.id === stageId);
    const last = state.tasks
      .filter((t) => t.stageId === stageId)
      .reduce((max, t) => Math.max(max, t.position), 0);
    const task = {
      id: id(),
      boardId: stage.boardId,
      stageId,
      title,
      description,
      position: last + STEP,
      assigneeIds: [],
    };
    state.tasks.push(task);
    return task;
  }

  /** Makes the next `METHOD /path-prefix` request fail. */
  function failNext(key, status, message) {
    failures.set(key, {status, body: {message}});
  }

  const routes = [
    [
      'GET',
      /^\/api\/boards$/,
      () => ({
        body: {
          boards: state.boards.map((b) => ({
            ...b,
            taskCount: tasksOf(b.id).length,
          })),
        },
      }),
    ],
    [
      'POST',
      /^\/api\/boards$/,
      (_m, body) => ({
        status: 201,
        body: {board: seedBoard(body.name)},
      }),
    ],
    [
      'GET',
      /^\/api\/boards\/(\d+)$/,
      ([boardId]) => {
        const board = state.boards.find((b) => b.id === boardId);
        return board ? {body: {board: fullBoard(board)}} : notFound;
      },
    ],
    [
      'PATCH',
      /^\/api\/boards\/(\d+)$/,
      ([boardId], body) => {
        const board = state.boards.find((b) => b.id === boardId);
        board.name = body.name;
        return {body: {board}};
      },
    ],
    [
      'DELETE',
      /^\/api\/boards\/(\d+)$/,
      ([boardId]) => {
        state.boards = state.boards.filter((b) => b.id !== boardId);
        return {status: 204};
      },
    ],
    [
      'POST',
      /^\/api\/boards\/(\d+)\/stages$/,
      ([boardId], body) => {
        const last = stagesOf(boardId).at(-1);
        const stage = {
          id: id(),
          boardId,
          name: body.name,
          position: (last?.position ?? 0) + STEP,
        };
        state.stages.push(stage);
        return {status: 201, body: {stage}};
      },
    ],
    [
      'PATCH',
      /^\/api\/stages\/(\d+)$/,
      ([stageId], body) => {
        const stage = state.stages.find((s) => s.id === stageId);
        if (body.name) {
          stage.name = body.name;
        }
        if ('prevId' in body || 'nextId' in body) {
          const pos = (sid) => state.stages.find((s) => s.id === sid)?.position;
          const prev = body.prevId == null ? null : pos(body.prevId);
          const next = body.nextId == null ? null : pos(body.nextId);
          stage.position =
            prev == null
              ? next / 2
              : next == null
                ? prev + STEP
                : (prev + next) / 2;
        }
        return {body: {stage}};
      },
    ],
    [
      'DELETE',
      /^\/api\/stages\/(\d+)$/,
      ([stageId]) => {
        state.stages = state.stages.filter((s) => s.id !== stageId);
        state.tasks = state.tasks.filter((t) => t.stageId !== stageId);
        return {status: 204};
      },
    ],
    [
      'POST',
      /^\/api\/boards\/(\d+)\/tasks$/,
      (_ids, body) => ({
        status: 201,
        body: {task: addTask(body.stageId, body.title, body.description)},
      }),
    ],
    [
      'PATCH',
      /^\/api\/tasks\/(\d+)$/,
      ([taskId], body) => {
        const task = state.tasks.find((t) => t.id === taskId);
        Object.assign(task, body);
        return {body: {task}};
      },
    ],
    [
      'DELETE',
      /^\/api\/tasks\/(\d+)$/,
      ([taskId]) => {
        state.tasks = state.tasks.filter((t) => t.id !== taskId);
        return {status: 204};
      },
    ],
  ];

  function handle(method, url, body) {
    for (const [key, failure] of failures) {
      if (`${method} ${url}`.startsWith(key)) {
        failures.delete(key);
        return failure;
      }
    }
    for (const [routeMethod, pattern, fn] of routes) {
      const match = method === routeMethod && url.match(pattern);
      if (match) {
        return fn(match.slice(1).map(Number), body);
      }
    }
    return undefined;
  }

  return {state, handle, seedBoard, addTask, failNext};
}
