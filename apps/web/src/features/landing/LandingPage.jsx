/**
 * @fileoverview The public home page for logged-out visitors: what the
 * product does, with ways to create an account or log in.
 *
 * The product fragments in the hero are illustrations built from the app's
 * own card styles; they are hidden from screen readers, and the headline,
 * lede and feature cards carry the same information in text.
 */

import {Link} from 'react-router';
import {CalendarIcon, PeopleIcon} from '../../components/Icons.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';

const FEATURES = [
  {
    tag: 'Workflow',
    title: 'Your stages, your workflow',
    body:
      'Every board starts with To Do, In Progress and Done. Add, rename, ' +
      'reorder and colour stages until they match how your work really ' +
      'moves.',
  },
  {
    tag: 'Teams',
    title: 'Live for the whole team',
    body:
      'Share a board with a team and everyone sees the same thing. When ' +
      'someone moves a task, it moves on your screen too, no refresh needed.',
  },
  {
    tag: 'Ownership',
    title: "Who's on it, and when it's due",
    body:
      'Put several people on a task and filter the board by person. Give ' +
      'boards a due date and sort by the nearest one, so deadlines never ' +
      'sneak up.',
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="brand" aria-label="Kanban home">
          Kanban
        </Link>
        <nav aria-label="Site" className="landing-nav">
          <ThemeToggle />
          <Link to="/login" className="text-link">
            Log in
          </Link>
          <Link to="/register" className="button primary">
            Get started
          </Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <h1 id="landing-title">
            Work that moves, <em>together.</em>
          </h1>
          <p className="landing-lede">
            Boards with your own stages, tasks you drag between them, and
            changes your team sees the moment they happen.
          </p>
          <div className="cta-row">
            <Link to="/register" className="button primary large">
              Create an account
            </Link>
            <Link to="/login" className="button large">
              Log in
            </Link>
          </div>
          <HeroCollage />
        </section>

        <section
          className="landing-features"
          aria-labelledby="landing-features-title"
        >
          <div className="landing-inner">
            <h2 id="landing-features-title">
              Everything a board needs, <em>nothing it doesn’t.</em>
            </h2>
            <p className="landing-lede">
              Built for the work you do every day, alone or with a team.
            </p>
            <ul className="feature-grid">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="feature-card">
                  <span className="feature-tag">{feature.tag}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-inner landing-accent-wrap">
          <div className="accent-card">
            <h2>Drag, or don’t.</h2>
            <p>
              Every move works from the keyboard too. Press <kbd>Space</kbd> to
              pick up a task or stage, the <kbd>arrow keys</kbd> to carry it,
              and <kbd>Space</kbd> again to drop it. Screen readers hear where
              it went.
            </p>
          </div>
        </section>

        <section
          className="landing-close"
          aria-labelledby="landing-close-title"
        >
          <h2 id="landing-close-title">Start your first board.</h2>
          <p className="landing-lede">
            It takes a name. Stages, tasks and teammates can come later.
          </p>
          <div className="cta-row">
            <Link to="/register" className="button primary large">
              Create an account
            </Link>
            <Link to="/login" className="button large">
              Log in
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="brand">Kanban</span>
        <span className="muted small">
          Boards, stages and tasks, live for your team.
        </span>
      </footer>
    </div>
  );
}

const PEOPLE = {
  am: {initials: 'AM', tint: '#d6ecd9'},
  bc: {initials: 'BC', tint: '#fbe1d1'},
  cd: {initials: 'CD', tint: '#e3dcf3'},
};

/** @param {{who: string}} props A PEOPLE key. */
function Face({who}) {
  const person = PEOPLE[who];
  return (
    <span className="avatar" style={{background: person.tint}}>
      {person.initials}
    </span>
  );
}

const PREVIEW = [
  {
    name: 'To Do',
    color: 'slate',
    tasks: [
      {
        title: 'Write the launch post',
        desc: 'Needs final pricing',
        color: 'peach',
        who: ['am'],
      },
      {title: 'Pricing page copy', who: ['bc', 'cd']},
    ],
  },
  {
    name: 'In Progress',
    color: 'sand',
    tasks: [
      {
        title: 'Onboarding checklist',
        desc: 'Five steps, each under a minute',
        color: 'lilac',
        who: ['cd'],
      },
    ],
  },
  {
    name: 'Done',
    color: 'sage',
    tasks: [{title: 'Set up staging', who: ['am']}],
  },
];

/** Floating product fragments around the hero (decorative). */
function HeroCollage() {
  return (
    <div className="hero-collage" aria-hidden="true">
      <div className="artifact artifact-board">
        <div className="artifact-board-head">
          <span className="board-color-dot" data-color="sky" />
          <span className="artifact-title">Q3 launch</span>
          <span className="artifact-live">Live</span>
        </div>
        <div className="mini-stages">
          {PREVIEW.map((stage) => (
            <div
              key={stage.name}
              className="mini-stage"
              data-color={stage.color}
            >
              <span className="mini-stage-name">
                {stage.name} <span className="count">{stage.tasks.length}</span>
              </span>
              {stage.tasks.map((task) => (
                <div
                  key={task.title}
                  className="mini-task"
                  data-color={task.color}
                >
                  <span className="mini-task-title">{task.title}</span>
                  {task.desc && (
                    <span className="mini-task-desc">{task.desc}</span>
                  )}
                  <span className="avatar-stack">
                    {task.who.map((who) => (
                      <Face key={who} who={who} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="artifact artifact-due">
        <span className="artifact-title">Hiring</span>
        <span className="board-card-stats muted small">
          <PeopleIcon />3 members · 8 tasks
        </span>
        <span className="due-badge" data-tone="soon">
          <CalendarIcon />
          Due in 4 days
        </span>
      </div>

      <div className="artifact artifact-presence">
        <span className="presence-face">
          <Face who="bc" />
          <svg
            className="presence-cursor"
            viewBox="0 0 12 12"
            width="12"
            height="12"
          >
            <path d="M1 1l10 4-4.2 1.4L5 11z" fill="currentColor" />
          </svg>
        </span>
        <span>
          <strong>Bob</strong> moved <em>Set up staging</em> to Done
        </span>
      </div>
    </div>
  );
}
