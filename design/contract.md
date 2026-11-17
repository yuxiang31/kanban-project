# Design contract — Kanban in the "Steep" style

Source style: [`Design.md`](../Design.md) (serif on warm paper, achromatic,
one peach accent). Steep is a marketing site; this app is a tool people open
every day. We keep its **tokens, type pairing, radii and restraint** and drop
its **landing-page composition** (no 90px hero, no floating collage, no 80px
section gaps on working screens).

## Product surfaces and jobs

| Surface                  | User's job           | Primary action          | Scanned first                                       |
| ------------------------ | -------------------- | ----------------------- | --------------------------------------------------- |
| Log in / Register        | Get in               | Log in / Create account | The form                                            |
| Boards list              | Pick a board         | New board               | Board names, task counts, section (Personal / team) |
| **Board** (main surface) | See and move work    | Add task, drag a task   | Stage names + counts, task titles, who handles each |
| Task dialog              | Change a task        | Save                    | Title, description, assignees                       |
| Teams list               | Find or start a team | Create team             | Team names, member counts, "Owner"                  |
| Team page                | Manage people        | Add member (owner)      | Member list, roles                                  |

Target viewports: **390x844** (phone) and **1440x900** (desktop).

## Decisions (each checkable)

| #   | Decision                                                                                                                                                                                                                                                                                                                             | Why (reference)                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Page titles in the serif (Source Serif 4 for Signifier) at weight 400, tight tracking: 40px lists, 30px board title, 26px on phones. Display size (56px) only on the auth screens.                                                                                                                                                   | Design.md: serif H1/H2 at 400 is the signature; a board needs its height for stages, so no 90px.                                        |
| D2  | All UI text in Inter (Söhne substitute) using half-step weights: 430 body, 450 task titles, 480 stage names, 500 only for counts.                                                                                                                                                                                                    | Design.md half-step weights; fine hierarchy without bold.                                                                               |
| D3  | Surfaces: page = Fog `#fafafb`; stage columns = Mist `#f2f2f3`, 24px radius, no shadow; **task cards are the only elevated objects** (white, 16px radius, subtle-3 shadow).                                                                                                                                                          | Design.md: neutral cards flat, only "floating product artifacts" earn elevation — on a board those are the movable tasks.               |
| D4  | Buttons are pills (9999px). Primary = filled ink; secondary = ghost ink outline; quiet actions = text buttons. Icon buttons are 32px circles with inline SVG icons (no emoji).                                                                                                                                                       | Design.md pill pair; familiar icons for tool actions.                                                                                   |
| D5  | Inputs: white, hairline `#ececec`, 16px radius; focus ring 2px ink, offset 2px.                                                                                                                                                                                                                                                      | Design.md input/composer.                                                                                                               |
| D6  | **Memorable detail:** the task you are dragging lifts as a peach card (`#fbe1d1` with sienna `#5d2a1a` text) — the only peach on the board, and only while moving. Peach elsewhere is limited to one notice per page.                                                                                                                | Design.md: peach at most once per page, for emphasis.                                                                                   |
| D7  | Functional colour, muted and rare: destructive actions in `#a8322a`; Live dot green `#2f7d4f`, reconnecting amber `#b7791f`; avatars in soft pastel tints with ink initials.                                                                                                                                                         | User decision (keep a few functional colours); Design.md's own avatars are tinted.                                                      |
| D8  | Dark mode follows the OS: warm near-black paper, off-white ink, muted peach. Same structure and radii.                                                                                                                                                                                                                               | User decision.                                                                                                                          |
| D9  | Motion: 120–160ms ease-out on hover/press and drop; all of it off under `prefers-reduced-motion`.                                                                                                                                                                                                                                    | Clarifies state; must not mask slowness.                                                                                                |
| D11 | Muted text is `#63666f`, not Design.md's slate `#777b86`; ash `#979799` is never used for text.                                                                                                                                                                                                                                      | Measured: slate is 4.23:1 on white and 3.78:1 on Mist (fails WCAG AA 4.5:1); `#63666f` is 5.13:1 on Mist, 5.50:1 on Fog. Ash is 2.92:1. |
| D12 | A sun/moon toggle in the header (and on the auth screens) switches light/dark. It follows the OS until used, remembers the choice in `localStorage`, and is applied before first paint. Every colour token is written once with `light-dark()`.                                                                                      | User request; one source of truth for both themes.                                                                                      |
| D13 | Boards and tasks can carry one of seven named colours (sage, sky, lilac, rose, sand, peach, slate) or none: a 4px stripe on the task card's left edge, a band across the top of the board card, a dot before the board title. Each tone is ≥3:1 on its surface in both themes, and the colour name is in the task's accessible name. | User request; stripes keep cards white and the board quiet (Design.md restraint).                                                       |
| D10 | Layout: content max-width 1200px; header is quiet (no background band, hairline only). Board stages scroll horizontally; on phones stages are 85vw so the next one peeks in.                                                                                                                                                         | Design.md layout; phone usability.                                                                                                      |

## Content states

| State      | Trigger                                                                    | Feedback                                                                                        | Safe next action                                                         |
| ---------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Loading    | Boards / board / teams / team fetch                                        | Skeleton in the final layout (cards, stage columns), `role=status` text for screen readers      | — (fast)                                                                 |
| Empty      | No boards; no teams; stage without tasks                                   | Short sentence saying why it is empty, in place of the content                                  | "New board" / "Create team" / "Add task" right there                     |
| Error      | A list or board fails to load; a save fails                                | Specific server message (`role=alert`) next to what failed                                      | "Try again" (refetch) or "Back to boards"; failed forms keep their input |
| Partial    | Person filter active; live connection dropped                              | "Showing N of M tasks" + Clear filter; "Reconnecting…" pill (data may be stale)                 | Clear filter; reconnect is automatic                                     |
| Success    | Board/team/task created; board deleted                                     | New item appears / you land on it; after deleting, a notice on the board list                   | Keep working; dismiss notice                                             |
| Permission | Not the board deleter; not the team owner; access lost; unknown board/team | Controls hidden; a muted line says who can act; access-lost notice; "not found" with a way back | Leave team / back to boards / ask the owner                              |

## Finish gate

Rendered screenshots at both target viewports of: auth, boards list (empty
and filled), board (with tasks, filter active), task dialog, teams list, team
page (owner and member), plus dark mode on the board. Checks: keyboard focus
visible, labels, contrast (text ≥ 4.5:1), reduced motion, 24px+ targets,
long names wrapping. Evidence record: `design/review/report.json`, checked
with the skill's `check-evidence.js`.
