# Kanban

A web kanban for tracking work on your own or with a team. Each board has its
own workflow (stages you can add, rename, reorder and delete), tasks move
between stages by drag and drop, and boards shared with a group update live
for everyone viewing them.

**Stack:** Fastify · React (Vite) · SQLite (better-sqlite3) · WebSocket ·
Docker · ESLint (Google JS style) + Biome (formatting) · Vitest

## Features

| #   | Feature                                                           |
| --- | ----------------------------------------------------------------- |
| 1   | Register / log in (JWT in an httpOnly cookie, bcrypt passwords)   |
| 2   | Create a board (starts with To Do / In Progress / Done)           |
| 3   | Create tasks                                                      |
| 4   | Edit tasks, move them by drag and drop or keyboard                |
| 5   | View boards: your own and those shared with your groups           |
| 6   | Teams: the owner adds and removes members by username             |
| 7   | Many users editing a shared board, with live updates              |
| 8   | See who handles a task (several people allowed), filter by person |

Also included: custom workflow stages, deleting boards, stages and tasks
behind confirmation dialogs, and live updates when a board is deleted.
