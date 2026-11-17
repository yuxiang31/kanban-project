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
 *   seedBoard: function(string, !Array<string>=, !Object=): !Object,
 *   seedTeam: function(string, !Object=): !Object,
 *   addTask: function(number, string, string=): !Object,
 *   failNext: function(string, number, string): void,
 * }}
 */
export const users = {
  alice: {id: 1, username: 'alice', displayName: 'Alice'},
  bob: {id: 2, username: 'bob', displayName: 'Bob'},
  carol: {id: 3, username: 'carol', displayName: 'Carol'},
};

/**
 * @param {{me?: !Object}=} options `me` is the logged-in user (alice).
 */
export function createFakeApi({me = users.alice} = {}) {
  const state = {boards: [], stages: [], tasks: [], teams: [], nextId: 100};
  const failures = new Map();
  const id = () => state.nextId++;
  const byPosition = (a, b) => a.position - b.position;

  const stagesOf = (boardId) =>
    state.stages.filter((s) => s.boardId === boardId).sort(byPosition);
  const tasksOf = (boardId) =>
    state.tasks.filter((t) => t.boardId === boardId).sort(byPosition);
  const fullBoard = (board) => ({
    ...board,
    canDelete: board.canDeleteOverride ?? true,
    members: board.teamId
      ? state.teams.find((t) => t.id === board.teamId).memberIds.map(userById)
      : [me],
    stages: stagesOf(board.id),
    tasks: tasksOf(board.id),
  });
  const notFound = {status: 404, body: {message: 'Not found.'}};

  const teamSummary = (teamId) => {
    const team = state.teams.find((t) => t.id === teamId);
    return team ? {id: team.id, name: team.name} : null;
  };

  /**
   * @param {string} name
   * @param {{ownerId?: number, memberIds?: !Array<number>}=} options
   */
  function seedTeam(name, {ownerId = me.id, memberIds = []} = {}) {
    const team = {id: id(), name, ownerId, memberIds: [ownerId, ...memberIds]};
    state.teams.push(team);
    return team;
  }

  const userById = (uid) => Object.values(users).find((u) => u.id === uid);
  const teamDetail = (team) => ({
    id: team.id,
    name: team.name,
    ownerId: team.ownerId,
    isOwner: team.ownerId === me.id,
    boardCount: state.boards.filter((b) => b.teamId === team.id).length,
    members: team.memberIds.map(userById),
  });
  const myTeam = (teamId) =>
    state.teams.find((t) => t.id === teamId && t.memberIds.includes(me.id));

  function seedBoard(
    name,
    stageNames = ['To Do', 'In Progress', 'Done'],
    {teamId = null, color = null, description = '', dueDate = null} = {},
  ) {
    const board = {
      id: id(),
      name,
      teamId,
      color,
      description,
      dueDate,
      team: teamSummary(teamId),
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
      color: null,
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
            memberCount: b.teamId
              ? state.teams.find((t) => t.id === b.teamId).memberIds.length
              : 1,
          })),
        },
      }),
    ],
    [
      'POST',
      /^\/api\/boards$/,
      (_m, body) => ({
        status: 201,
        body: {
          board: seedBoard(body.name, undefined, {
            teamId: body.teamId ?? null,
            color: body.color ?? null,
            description: body.description ?? '',
            dueDate: body.dueDate ?? null,
          }),
        },
      }),
    ],
    [
      'GET',
      /^\/api\/teams$/,
      () => ({
        body: {
          teams: state.teams
            .filter((t) => t.memberIds.includes(me.id))
            .map((t) => ({
              id: t.id,
              name: t.name,
              ownerId: t.ownerId,
              isOwner: t.ownerId === me.id,
              memberCount: t.memberIds.length,
            })),
        },
      }),
    ],
    [
      'POST',
      /^\/api\/teams$/,
      (_m, body) => ({
        status: 201,
        body: {team: teamDetail(seedTeam(body.name))},
      }),
    ],
    [
      'GET',
      /^\/api\/teams\/(\d+)$/,
      ([teamId]) => {
        const team = myTeam(teamId);
        return team ? {body: {team: teamDetail(team)}} : notFound;
      },
    ],
    [
      'PATCH',
      /^\/api\/teams\/(\d+)$/,
      ([teamId], body) => {
        const team = myTeam(teamId);
        team.name = body.name;
        return {body: {team: teamDetail(team)}};
      },
    ],
    [
      'DELETE',
      /^\/api\/teams\/(\d+)$/,
      ([teamId]) => {
        state.teams = state.teams.filter((t) => t.id !== teamId);
        state.boards = state.boards.filter((b) => b.teamId !== teamId);
        return {status: 204};
      },
    ],
    [
      'POST',
      /^\/api\/teams\/(\d+)\/members$/,
      ([teamId], body) => {
        const team = myTeam(teamId);
        const user = users[body.username.toLowerCase()];
        if (!user) {
          return {
            status: 404,
            body: {message: `No user named "${body.username}".`},
          };
        }
        team.memberIds.push(user.id);
        return {status: 201, body: {member: user}};
      },
    ],
    [
      'DELETE',
      /^\/api\/teams\/(\d+)\/members\/(\d+)$/,
      ([teamId, userId]) => {
        const team = myTeam(teamId);
        team.memberIds = team.memberIds.filter((m) => m !== userId);
        return {status: 204};
      },
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
        Object.assign(board, body);
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
        if ('color' in body) {
          stage.color = body.color;
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
      'PUT',
      /^\/api\/tasks\/(\d+)\/assignees$/,
      ([taskId], body) => {
        const task = state.tasks.find((t) => t.id === taskId);
        task.assigneeIds = [...new Set(body.userIds)].sort((a, b) => a - b);
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

  return {state, handle, seedBoard, seedTeam, addTask, failNext};
}
