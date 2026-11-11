# Technology and tools

What Digital Reversi is built with, and what each piece does in this game.
Versions are the ones locked in `package-lock.json`.

## Application

| Technology | Version | What it does in this game |
| --- | --- | --- |
| **React** | 19.3 | Builds the user interface from components: `Board`, `GameStatus`, `SetupScreen`, `MatchScreen`, `ResultsPanel`, `HelpDialog`. React re-renders the board whenever the game state changes. |
| **React DOM** | 19.3 | Renders those components into the web page (`src/main.tsx`). |
| **TypeScript** | 7.0 | Adds types to all the code. The game's data (`Board`, `Disc`, `GameState`, `MatchState` …) is typed, so mistakes such as a wrong colour string or a missing field are caught before the game runs. `npm run build` type-checks everything first. |
| **CSS** (plain, per component) | – | Styles each component (e.g. `Board.css`). Colour tokens in `src/index.css` (taken from the Lovable design: cream background, forest green, gold hints; Georgia serif headings) and respect *reduced motion*. |
| **Web Workers** (browser API) | – | Runs the computer player's search in a background thread (`src/ai/ai.worker.ts`) so the page never freezes while the AI "thinks". Falls back to the main thread if workers are unavailable. |

## Build and development

| Tool | Version | What it does in this game |
| --- | --- | --- |
| **Vite** | 8.3 | Development server with instant reload (`npm run dev`) and the production build (`npm run build` → `dist/`). It also bundles the AI Web Worker as its own file. Configured in `vite.config.ts` (`base: './'` so the site works on GitHub Pages). |
| **@vitejs/plugin-react** | 6.3 | Lets Vite compile React's JSX and enables fast refresh while editing. |
| **Node.js + npm** | Node 22.22+ / 24.15+ / 26+ | Runs the tooling and installs packages. `package-lock.json` pins exact versions so every install is identical. |

## Code quality and testing

| Tool | Version | What it does in this game |
| --- | --- | --- |
| **Vitest** | 5.1 | Runs the automated tests (`npm test`): rules, AI, React hooks and components. 254 tests across 18 files. |
| **@vitest/coverage-v8** | 5.1 | Measures which lines the tests exercise (`npm run test:coverage`). CI fails if coverage drops below 95% (90% for branches). |
| **jsdom** | 31.0 | A simulated browser inside Node so component tests can render the board and click squares without a real browser. |
| **React Testing Library** | 16.3 | Renders components in tests and finds elements the way users do — by role and accessible name (e.g. the button "d3, empty, legal move"). This also checks the game is usable with a screen reader. |
| **@testing-library/user-event** | 14.6 | Simulates real clicks, typing and key presses (Tab, arrow keys, Enter, Escape) in tests. |
| **@testing-library/jest-dom** | 7.0 | Extra test assertions such as `toBeInTheDocument`, `toHaveFocus`, `toHaveAccessibleName`. |
| **Chrome DevTools Protocol** (Chrome/Edge, headless) | – | Used by `e2e/browser-check.mjs` (`npm run test:e2e`) to play the real game in a real browser: clicks, key presses, a full game against Hard, phone-size layouts, console errors. No extra npm packages; uses Node's built-in `fetch` and `WebSocket`. |
| **oxlint** | 1.93 | Fast linter (`npm run lint`) that flags likely bugs and React mistakes (e.g. rules of hooks). |

## Collaboration, CI and hosting

| Tool | What it does in this project |
| --- | --- |
| **Git** | Version control. Each Jira story is a feature branch; history shows every change. |
| **GitHub** | Hosts the repository and Pull Requests. Every change is reviewed in a PR before it reaches `main`. |
| **GitHub CLI (`gh`)** | Used to open Pull Requests from the terminal. |
| **GitHub Actions — CI** (`.github/workflows/ci.yml`) | On every PR and push to `main`: install, lint, test with coverage, build — on Node 22 and 24. |
| **GitHub Actions — Deploy** (`.github/workflows/deploy.yml`) | On every push to `main`: test, build and publish the game to GitHub Pages. |
| **GitHub Pages** | Hosts the playable game as a static website. |
| **Jira** (Kanban board, project BOAR) | Tracks epics, user stories, subtasks and bugs across the four sprints. See [JIRA_PLAN.md](JIRA_PLAN.md). |

## How the code is organised

```
src/
  game/        Pure TypeScript rules — no React. Board, legal moves, captures,
               turns, passes, game end, matches and results.
  ai/          Computer player: evaluation, search (easy/medium/hard),
               Web Worker and its client.
  hooks/       React state: gameReducer (one game) and useMatch (a series of
               games, colour alternation, computer turns).
  components/  UI: Board, GameStatus, SetupScreen, MatchScreen,
               ResultsPanel, HelpDialog.
  test/        Shared test setup.
```

Keeping the rules in `src/game` separate from React means they can be tested
quickly and thoroughly on their own (including 200 random full games), and the
same code runs inside the AI worker.

## How the computer player works

| Level | Method |
| --- | --- |
| Easy | Picks a random legal move. |
| Medium | Looks one move ahead and picks the best position by a score made of square weights (corners good, squares beside an empty corner bad) and mobility (how many moves each side has). |
| Hard | Looks four moves ahead using *negamax with alpha-beta pruning*, searching the most promising moves first. Measured worst case ≈ 221 ms per move, run in a Web Worker. |
