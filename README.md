# Digital Reversi

A browser-based Reversi game built with React, TypeScript and Vite.

**Play online:** https://ahmad-muavia.github.io/digital-reversi/

## Features

- **Two players on one device**, or **play against the computer** (Easy, Medium, Hard)
- Full Reversi rules: legal-move hints, automatic captures, passes, game end, winner or draw
- **Sessions of 1, 2 or 4 games:** colours swap each game; results table with passes, running tally and a session result
- **Validated setup:** names are required, 1–30 characters and must differ; ending a session asks for confirmation
- **How to play** page, also available as a dialog during a game
- A calm design: cream paper, a forest-green board, gold move hints, serif headings, and a landing page with an opening-board preview
- **Accessible:** play entirely by keyboard (arrow keys, Enter); moves, turns and results are announced to screen readers; clear focus outlines; respects reduced motion
- The computer thinks in a **Web Worker**, so the page never freezes. It talks to the game through the D3 AI contract; if it fails or takes longer than 5 s, the board stays unchanged and you can retry

## Requirements

- Node.js 22.22+, 24.15+ or 26+ (required by jsdom; developed on Node 26)
- npm

## Setup

```bash
git clone https://github.com/Ahmad-Muavia/digital-reversi.git
cd digital-reversi
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## How to play

1. On the landing page press **Start game**. Choose **Human vs Human** or **Human vs AI**, enter names for Player A and Player B, choose 1, 2 or 4 games, and press **Start game**.
2. Black moves first. Click a square marked with a dot to place a disc. Every line of your opponent's discs between your new disc and another of your discs is flipped.
3. If you have no legal move, your turn is passed automatically. The game ends when neither player can move; the player with more discs wins.
4. Press **Next game** to play the next game with colours swapped. Results are kept in the **Results** table, and after the last game you see the session result. **End session** (after confirming) returns to setup.

Keyboard: <kbd>Tab</kbd> to the board, arrow keys to move, <kbd>Enter</kbd> or
<kbd>Space</kbd> to place a disc. Press **How to play** at any time for full rules.

## Scripts

| Command                 | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | Start the development server              |
| `npm run build`         | Type-check and build for production       |
| `npm run preview`       | Serve the production build locally        |
| `npm test`              | Run the test suite once                   |
| `npm run test:watch`    | Run tests in watch mode                   |
| `npm run test:coverage` | Run tests with coverage and thresholds    |
| `npm run lint`          | Lint the source with oxlint               |
| `npm run test:e2e -- <url>` | Play the game in headless Chrome/Edge and check it (see below) |

## Project structure

```
src/
  game/        Pure rules: board, legal moves, captures, turns, matches (no React)
  ai/          Computer player: evaluation, search, Web Worker and client
  hooks/       React state: gameReducer and useMatch
  components/  Board, GameStatus, SetupScreen, MatchScreen, ResultsPanel, HelpDialog
  test/        Shared test setup
  App.tsx      Application shell
e2e/           Real-browser check (headless Chrome/Edge)
docs/          Tech stack, testing report, Jira and sprint plan
.github/       CI and deployment workflows
```

## Testing

254 automated tests (Vitest, React Testing Library, jsdom) cover the rules
(including perft counts matching the published Othello values and 200 random
complete games), the AI and its contract (30 injected bad replies, two
interchangeable providers), state management, components and full user flows.
Coverage is about 98%, and CI enforces thresholds.

A separate real-browser check plays the game in headless Chrome or Edge:
the landing page, setup validation, a two-player game, keyboard play, How to play, End session, a full
game against Hard with the AI in a Web Worker, phone-width layout, and no
console errors (28 checks; passes in both Chrome and Edge):

```bash
npm run build && npm run preview                         # http://localhost:4173
npm run test:e2e -- http://localhost:4173/               # in a second terminal
npm run test:e2e -- https://ahmad-muavia.github.io/digital-reversi/   # live site
# To use Edge, set CHROME_PATH to msedge.exe first, e.g. in PowerShell:
# $env:CHROME_PATH = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

See [docs/TESTING.md](docs/TESTING.md) for the test strategy, results per
sprint and defects found.

## Deployment

The app is deployed to GitHub Pages by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push
to `main` (and can be run manually from the Actions tab). The workflow runs
the tests, builds the site and publishes `dist/`.

One-time setup: in the repository's **Settings → Pages**, set **Source** to
**GitHub Actions**.

The build uses relative asset paths (`base: './'` in `vite.config.ts`), so the
same `dist/` folder also works on any static host or sub-path.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, the test
suite with coverage thresholds, and the production build on Node 22 and 24
for every pull request and push to `main`.

## Documentation

- [docs/TECH_STACK.md](docs/TECH_STACK.md): technologies and tools, and what each does in this game
- [docs/TESTING.md](docs/TESTING.md): test strategy, results and defects
- [docs/JIRA_PLAN.md](docs/JIRA_PLAN.md): epics, stories, acceptance criteria and the PR for each sprint
- [docs/D3_TRACEABILITY.md](docs/D3_TRACEABILITY.md): every D3 rule and requirement, where it is implemented, and the evidence

## Development process

Built in four sprints using a Kanban workflow: Jira for issues, and a feature
branch plus Pull Request for every story. The sprints were (1) foundation and
board, (2) rules and Human vs Human, (3) matches, Help and AI, and
(4) testing, accessibility, performance, deployment and documentation.
