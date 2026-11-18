# Kanban

A web kanban for tracking work on your own or with a team. Each board has
its own workflow (stages you can add, rename, reorder, colour and delete),
tasks move between stages by drag and drop or keyboard, and boards shared
with a team update live for everyone viewing them.

**Stack:** Fastify · React 19 (Vite) · SQLite (better-sqlite3) · WebSocket ·
Docker · ESLint (Google JS style) + Biome (formatting) · Vitest

## Features

- **Accounts:** register and log in; JWT in an httpOnly cookie, bcrypt
  passwords, rate-limited auth routes. Logged-out visitors get a landing
  page.
- **Boards:** start with To Do / In Progress / Done; optional description,
  colour and due date. The board list shows member and task counts and can
  be sorted by nearest due date.
- **Stages:** add, rename, reorder, colour and delete (with confirmation).
- **Tasks:** title, description, colour and several assignees. A new task
  opens straight away for its details. Each card has an optional drop-down
  checklist.
- **Moving:** drag and drop, or keyboard (Space to pick up, arrow keys to
  move, Space to drop), with screen-reader announcements.
- **Teams:** the owner adds and removes members by username, renames or
  deletes the team. Team boards are shared with every member.
- **Live updates:** changes, deletions and lost access reach everyone on a
  board over WebSocket.
- **People filter:** show only tasks handled by chosen people (or
  unassigned ones).
- Light and dark themes; one change at a time on a board so edits don't
  collide.

## Quick start (development)

Requires Node.js 22 or newer (CI uses 26).

```bash
npm install
cp .env.example .env    # optional in development
npm run dev             # API on :3000, web app on http://localhost:5173
```

The Vite dev server proxies `/api` and `/ws` to the API. The SQLite
database is created at `apps/server/data/kanban.db`, and migrations run on
start.

## Run with Docker

```bash
cp .env.example .env    # set JWT_SECRET (e.g. openssl rand -hex 32)
docker compose up --build
```

The app is served on http://localhost:3000 (API, WebSocket and web app on
one port). Data is kept in the `kanban-data` volume. Without Compose:

```bash
docker build -t kanban .
docker run -p 3000:3000 -e JWT_SECRET=... -v kanban-data:/data kanban
```

The image runs as the unprivileged `node` user and reports its health from
`GET /api/health`, which also checks the database. Set `COOKIE_SECURE=true`
when it is served over HTTPS.

## Configuration

| Variable        | Default                                                    | Purpose                                                       |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `JWT_SECRET`    | dev-only secret                                            | Signs login cookies. **Required** when `NODE_ENV=production`. |
| `COOKIE_SECURE` | `false`                                                    | `true` sends the login cookie over HTTPS only.                |
| `PORT`          | `3000`                                                     | Port the server listens on.                                   |
| `HOST`          | `127.0.0.1` (`0.0.0.0` in Docker)                          | Interface to listen on.                                       |
| `DB_PATH`       | `apps/server/data/kanban.db` (`/data/kanban.db` in Docker) | SQLite file; its folder is created if missing.                |
| `WEB_DIST_DIR`  | none (`/app/apps/web/dist` in Docker)                      | Built web app to serve, with a fallback to `index.html`.      |
| `NODE_ENV`      | none (`production` in Docker)                              | `production` makes `JWT_SECRET` required.                     |

## Scripts

| Command                 | Does                                                  |
| ----------------------- | ----------------------------------------------------- |
| `npm run dev`           | API (watch mode) and web dev server together          |
| `npm run build`         | Builds the web app into `apps/web/dist`               |
| `npm start`             | Starts the API (serves the web app if `WEB_DIST_DIR`) |
| `npm test`              | Server and web tests                                  |
| `npm run test:coverage` | Tests with coverage; fails below 80% on either app    |
| `npm run lint`          | ESLint (Google style)                                 |
| `npm run format`        | Formats with Biome (`format:check` only checks)       |

## Architecture

```
apps/
  server/                 Fastify API + WebSocket (Node, ES modules)
    src/
      app.js              buildApp(): plugins, /api routes, static web app
      config.js           environment → config
      db/                 connection, migrate.js, migrations/NNN_*.sql
      plugins/            db, auth (JWT cookie), realtime (board rooms)
      modules/<area>/     routes (JSON schema) → service (rules) → repository (SQL)
      utils/              errors, fractional positions, schemas, events
    test/                 Vitest; app.inject against an in-memory database
  web/                    React app (Vite)
    src/
      api/                fetch client and API calls
      features/           auth, boards, stages, tasks, teams, landing
      hooks/              useBoardSocket (live updates with reconnect)
      styles/global.css   design tokens (light/dark) and components
    test/                 Vitest + Testing Library, with an in-memory fake API
design/                   design contract and review evidence
```

- **Writes go through REST only.** After each change the server broadcasts
  an event (`task.updated`, `board.deleted`, …) to the board's room on
  `/ws/boards/:id`, and other viewers refetch. Tabs skip their own events
  using an `X-Client-Id` header.
- **Access:** a board belongs to one user or one team. Anyone without
  access gets 404, so board ids can't be discovered. Removing a member
  closes their open sockets for that team's boards.
- **Ordering:** stages, tasks and checklist items use fractional
  positions, so a move updates one row. Positions are renumbered when the
  gap gets too small.
- **Moves are optimistic:** the web app shows a move straight away and
  rolls it back if the server refuses it.

## API

All routes are under `/api`, take and return JSON, and need the login
cookie (except register, login and health).

| Area      | Routes                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Health    | `GET /health`                                                                                                                                                |
| Auth      | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`                                                                            |
| Boards    | `GET /boards` · `POST /boards` · `GET /boards/:id` · `PATCH /boards/:id` · `DELETE /boards/:id`                                                              |
| Stages    | `POST /boards/:id/stages` · `PATCH /stages/:id` (rename, colour, move) · `DELETE /stages/:id`                                                                |
| Tasks     | `POST /boards/:id/tasks` · `PATCH /tasks/:id` (edit or move) · `DELETE /tasks/:id` · `PUT /tasks/:id/assignees`                                              |
| Checklist | `POST /tasks/:id/checklist` · `PATCH /checklist/:id` · `DELETE /checklist/:id`                                                                               |
| Teams     | `GET /teams` · `POST /teams` · `GET /teams/:id` · `PATCH /teams/:id` · `DELETE /teams/:id` · `POST /teams/:id/members` · `DELETE /teams/:id/members/:userId` |
| Live      | WebSocket `/ws/boards/:id` (same-origin, login cookie)                                                                                                       |

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main` or `master`, on pull
requests, and by hand from the Actions tab (Run workflow):

1. **Checks:** lint, format check, tests with the 80% coverage gate, and
   the web build.
2. **Docker:** builds the image, waits for its health check, and runs a
   smoke test: the page, a client-side route, register and session, and
   that data survives a container restart.
