# Jira and sprint plan

What to enter in Jira (project **BOAR**) for each sprint, and which GitHub
branch, Pull Request and files deliver each issue.

## How to use this document

- Create the **epics** first, then each **story** under its epic, then its
  **subtasks**. Jira assigns the keys (`BOAR-1`, `BOAR-2`, …); write each key
  next to the story here so the two stay linked.
- Paste the *Summary*, *Description* and *Acceptance criteria* blocks as they
  are. The *Testing evidence* block goes in a comment when the story moves to
  Done.
- Link each story to its Pull Request (in the issue: **Development → Link
  pull request**, or paste the PR URL).
- Move a story to **Done** only when its PR has been reviewed and merged to
  `main`, and CI passed.

### About dates

Jira and GitHub record real timestamps, so let them show when each step
actually happened. All of the code below was written on **10 November 2026**,
one PR per story, in sprint order, and PRs #1–#15 were merged the same day (the
GitHub history shows this). Release verification (#16, #17) followed.
Do not backdate Jira issues or Git commits to make the work look spread out.
Assessors can see creation and merge times, and your project rules require an
accurate history. If you want the sprints to be visible over time, create and
move each sprint's issues as you review and merge that sprint's PRs. The order
below is the order to do that in.

## Workflow for every story

1. Story → **In Progress**.
2. Branch from the previous story's branch (they are stacked) or from `main`.
3. Implement with tests; run `npm test`, `npm run build`, `npm run lint`.
4. Commit, push, open a PR, paste the testing summary.
5. Review → merge (tick *Delete branch* so the next stacked PR retargets to `main`).
6. CI green on `main` → story **Done**.

## Epics

| Epic | Summary | Sprints |
| --- | --- | --- |
| E1 | Project Foundation | 1 |
| E2 | Board and Game Rules | 1, 2 |
| E3 | Human vs Human Gameplay | 2 |
| E4 | Matches and Results | 3 |
| E5 | Player Help | 3 |
| E6 | Computer Opponent | 3 |
| E7 | Quality and Release | 4 |

---

## Sprint 1: Foundation, setup, board and basic rules

**Sprint goal:** a runnable React + TypeScript app that shows a Reversi board
in the correct opening position, backed by a tested game model.

### Story 1.1: Project setup and tooling  (Epic E1)

- **Summary:** Set up project foundation and test tooling
- **Description:** As a developer, I want a clean React + TypeScript + Vite
  project with automated testing, so that every feature can be built and tested
  consistently.
- **Acceptance criteria:**
  - Template demo content removed; app shows the title "Digital Reversi"
  - `npm test`, `npm run build`, `npm run lint` all work
  - Folder structure: `src/game`, `src/components`, `src/test`
  - README explains setup and scripts
- **Subtasks:** Install Vitest / Testing Library / jsdom · Add test scripts ·
  Remove template content · Create folder structure · Write README
- **Branch / PR:** `feature/project-foundation` → **#1**
- **Files:** `.gitattributes`, `README.md`, `index.html`, `package.json`,
  `package-lock.json`, `vite.config.ts`, `src/App.tsx`, `src/App.css`,
  `src/App.test.tsx`, `src/index.css`, `src/test/setup.ts` (template assets deleted)
- **Testing evidence:** 1 test passed; build passed; lint exit 0.

### Story 1.2: Game model and basic rules  (Epic E2)

- **Summary:** Create the Reversi game model and opening position
- **Description:** As a player, I want the game to start from the standard
  Reversi position with black to move, so that games follow the official rules.
- **Acceptance criteria:**
  - 8×8 board; white on d4 and e5, black on e4 and d5
  - Black moves first
  - Disc counting for both players
  - Off-board positions are rejected
- **Subtasks:** Define types · Initial board · Initial game state · Board helpers · Unit tests
- **Branch / PR:** `feature/game-model` → **#2**
- **Files:** `src/game/types.ts`, `src/game/board.ts`, `src/game/game.ts`,
  `src/game/index.ts`, `src/game/board.test.ts`, `src/game/game.test.ts`
- **Testing evidence:** 29 tests passed (bounds incl. negative, fractional,
  NaN, Infinity; empty and full boards); build passed; lint exit 0.

### Story 1.3: Board interface  (Epic E2)

- **Summary:** Display the board and game status
- **Description:** As a player, I want to see the board with coordinates, the
  discs, the score and whose turn it is, so that I can follow the game.
- **Acceptance criteria:**
  - 8×8 grid with a–h / 1–8 labels
  - Discs shown in the correct squares
  - Score for both colours and current player shown
  - Every square has an accessible label (e.g. "e4, black disc")
- **Subtasks:** Board component · GameStatus component · Wire into App · Component tests
- **Branch / PR:** `feature/board-ui` → **#3**
- **Files:** `src/components/Board/*`, `src/components/GameStatus/*`,
  `src/App.tsx`, `src/App.test.tsx`
- **Testing evidence:** 43 tests passed; build passed; lint exit 0; production
  build served with HTTP 200.

### Bug 1.4: Coverage output not ignored  (Epic E1)

- **Summary:** `coverage/` folder shows as untracked after running coverage
- **Found:** Sprint 1 review
- **Fix:** add `coverage` to `.gitignore`
- **Branch / PR:** `fix/ignore-coverage` → **#4**
- **Files:** `.gitignore`

**Sprint 1 review checklist:** PRs #1–#4 merged; 43 tests
pass on `main`; coverage 100%; app runs.

---

## Sprint 2: Legal moves, captures, turns and Human vs Human

**Sprint goal:** two people can play a complete game on one device.

### Story 2.1: Legal move detection and validation  (Epic E2)

- **Summary:** Detect legal moves and reject illegal ones
- **Description:** As a player, I want only legal moves to be allowed, so that
  the game enforces the rules for me.
- **Acceptance criteria:**
  - A move is legal only if it captures at least one disc in any of 8 directions
  - Occupied and off-board squares are illegal
  - Lines reaching the edge or a gap capture nothing
  - Black's opening moves are d3, c4, f5, e6
- **Subtasks:** Direction scanning (`getFlips`) · `isLegalMove` / `getLegalMoves` / `hasLegalMove` · Board fixture helper · Tests
- **Branch / PR:** `feature/legal-moves` → **#5**
- **Files:** `src/game/rules.ts`, `src/game/rules.test.ts`,
  `src/game/testUtils.ts`, `src/game/index.ts`
- **Testing evidence:** all tests passed (62 total); build and lint passed.

### Story 2.2: Disc capturing and turn management  (Epic E2)

- **Summary:** Flip captured discs and manage turns, passes and game end
- **Description:** As a player, I want captured discs to flip and turns to
  pass correctly (including when someone has no move), so that the game
  progresses by the rules.
- **Acceptance criteria:**
  - Placing a disc flips every bracketed opponent disc
  - Turn passes to the opponent; if they have no legal move they pass
  - Game ends when neither player can move; winner or draw by disc count
  - Illegal moves and moves after the end are rejected
- **Subtasks:** `applyMove` · `playMove` with pass/end logic · Outcome · Tests incl. full game
- **Branch / PR:** `feature/capture-and-turns` → **#6**
- **Files:** `src/game/game.ts`, `src/game/types.ts`, `src/game/game.test.ts`
- **Testing evidence:** 80 tests passed (incl. complete game to the end, pass,
  draw on full board); build and lint passed.

### Story 2.3: Complete Human vs Human gameplay  (Epic E3)

- **Summary:** Play a full two-player game in the browser
- **Description:** As two players sharing a device, we want to click squares
  to play, see legal moves, and get told about passes and the result, so that
  we can play a complete game.
- **Acceptance criteria:**
  - Clicking a legal square plays the move; illegal clicks show a message
  - Legal moves are marked; last move highlighted
  - Pass and game-over messages (winner/draw with score)
  - Board locks when the game ends; New game restarts
- **Subtasks:** Game reducer/hook · Board hints and lock · Status messages · New game button · UI tests
- **Branch / PR:** `feature/hvh-gameplay` → **#7**
- **Files:** `src/hooks/useGame.ts` (later renamed `gameReducer.ts`),
  `src/components/Board/*`, `src/components/GameStatus/*`, `src/App.*`
- **Testing evidence:** 98 tests passed (incl. a full 9-move game clicked
  through to "Black wins, 13–0"); build and lint passed.

**Sprint 2 review checklist:** #5–#7 merged; complete HvH game playable;
regression suite green.

---

## Sprint 3: Matches, colour alternation, results, Help and Human vs AI

**Sprint goal:** play a series of games with results, get help, and play
against the computer.

### Story 3.1: Multi-game sessions, colour alternation and results  (Epic E4)

- **Summary:** Play a match of several games with alternating colours and a results table
- **Description:** As players, we want to enter our names, play several games
  with colours swapping each game, and see the results, so that a session is
  fair and we know who is winning.
- **Acceptance criteria:**
  - Setup screen for names (defaults "Player 1"/"Player 2", max 20 characters) (changed to D3 rules in Story 4.7)
  - Player 1 is black in odd games, white in even games
  - Results credited to the player (not the colour); recorded once per game
  - Results panel: tally and history table; Next game / Restart game / New match (Restart removed in Story 4.7)
- **Subtasks:** Match model · `useMatch` hook · SetupScreen · MatchScreen · ResultsPanel · Tests
- **Branch / PR:** `feature/match-session` → **#8**
- **Files:** `src/game/match.ts`, `src/game/match.test.ts`,
  `src/hooks/useMatch.ts`, `src/hooks/gameReducer.ts`,
  `src/components/SetupScreen/*`, `src/components/MatchScreen/*`,
  `src/components/ResultsPanel/*`, `src/App.*`, `src/index.css`
- **Testing evidence:** 125 tests passed (two full games via UI, colours swap,
  tally 1–1–0); build and lint passed.

### Story 3.2: Help  (Epic E5)

- **Summary:** In-game Help explaining rules and controls
- **Description:** As a new player, I want a Help screen explaining the rules
  and controls, so that I can learn the game without leaving it.
- **Acceptance criteria:**
  - Help button available on every screen
  - Covers goal, setup, moves, passing, end of game, matches, controls
  - Accessible modal: focus moves in, is trapped, returns on close; Esc closes
  - Game progress unchanged after closing Help
- **Subtasks:** HelpDialog component · Header button · Focus management · Tests
- **Branch / PR:** `feature/help-dialog` → **#9**
- **Files:** `src/components/HelpDialog/*`, `src/App.*`
- **Testing evidence:** 133 tests passed; build and lint passed.

### Story 3.3: Human vs AI  (Epic E6)

- **Summary:** Play against the computer at three difficulty levels
- **Description:** As a single player, I want to play against the computer at
  a difficulty I choose, so that I can play alone.
- **Acceptance criteria:**
  - Setup offers "Two players" or "Against the computer" with Easy/Medium/Hard
  - Computer always plays a legal move and moves automatically
  - Human cannot move during the computer's turn
  - Colour alternation applies (computer moves first in even games)
  - Harder levels beat easier ones in most games
- **Subtasks:** Evaluation + search · Difficulty levels · Integrate in `useMatch` · Setup options · Tests incl. strength
- **Branch / PR:** `feature/ai-opponent` → **#10**
- **Files:** `src/ai/ai.ts`, `src/ai/ai.test.ts`, `src/ai/index.ts`,
  `src/game/match.ts`, `src/hooks/useMatch.*`,
  `src/components/SetupScreen/*`, `src/components/MatchScreen/*`,
  `src/components/HelpDialog/HelpDialog.tsx`, `src/App.test.tsx`
- **Testing evidence:** 155 tests passed; medium beat easy ≥7/10, hard beat
  medium in all 6 seeded games (reduced to 4 games in #16 to avoid timeouts);
  build and lint passed.

### Bugs found and fixed during Story 3.3 (log as Bugs linked to 3.3)

- **AI undervalued corners:** after taking a corner the adjacent squares were
  still penalised, so taking a corner scored ~0. Fixed with corner-aware
  weights. Caught by a test before the PR opened.
- **Hard AI could freeze the page (~868 ms per move):** fixed by searching
  promising moves first (worst case now ~221 ms). Moved fully off the main
  thread in Story 4.3.

**Sprint 3 review checklist:** #8–#10 merged; match, Help and AI working
together; regression suite green.

---

## Sprint 4: Testing, bug fixing, accessibility, performance, deployment, documentation

**Sprint goal:** a tested, accessible, fast, deployed and documented release.

### Story 4.1: CI and complete testing  (Epic E7)

- **Summary:** Automated CI and randomised whole-game tests
- **Description:** As the team, we want every change checked automatically and
  the rules tested across many full games, so that regressions are caught.
- **Acceptance criteria:**
  - CI runs lint, tests with coverage, build on every PR and push to `main` (Node 22 and 24)
  - Coverage thresholds enforced (95%, branches 90%)
  - 200 random full games checked for rule invariants after every move
- **Branch / PR:** `feature/ci-and-test-hardening` → **#11**
- **Files:** `.github/workflows/ci.yml`, `src/game/properties.test.ts`,
  `vite.config.ts`, `package.json`, `README.md`
- **Testing evidence:** 156 tests passed; coverage 98.86% statements /
  98.22% branches; CI on GitHub passed.
- **Bug fixed here:** README said Node 20+, but jsdom needs Node 22.22+ —
  corrected and `engines` added.

### Story 4.2: Accessibility  (Epic E7)

- **Summary:** Full keyboard play and screen-reader announcements
- **Description:** As a keyboard or screen-reader user, I want to move around
  the board with arrow keys and hear each move, so that I can play without a mouse.
- **Acceptance criteria:**
  - Board is one Tab stop; arrows, Home/End, Ctrl+Home/End, PageUp/PageDown move focus
  - Enter/Space places a disc
  - Each move announced ("Ada played d3 and flipped 1 disc.")
  - Reduced-motion preference respected
- **Branch / PR:** `feature/accessibility` → **#12**
- **Files:** `src/components/Board/*`, `src/components/MatchScreen/*`
  (incl. `describeLastMove.ts`), `src/components/HelpDialog/HelpDialog.tsx`,
  `src/index.css`, `index.html`
- **Testing evidence:** 165 tests passed (incl. a game played only by
  keyboard); CI passed. Arrow keys and Enter also confirmed in a real browser
  (#17). Manual screen-reader check still recommended.

### Story 4.3: Performance  (Epic E7)

- **Summary:** Run the computer player in a Web Worker
- **Description:** As a player, I want the page to stay responsive while the
  computer thinks.
- **Acceptance criteria:**
  - AI search runs off the main thread
  - Falls back safely if workers are unavailable or crash
  - Stale computer moves are discarded after Restart / Next game
- **Branch / PR:** `feature/performance` → **#13**
- **Files:** `src/ai/ai.worker.ts`, `src/ai/aiClient.ts`,
  `src/ai/aiClient.test.ts`, `src/ai/protocol.ts`, `src/ai/index.ts`,
  `src/hooks/useMatch.*`
- **Testing evidence:** 172 tests passed; worker bundled as a separate file.
  Confirmed in a real browser during release verification: a full game
  against Hard ran with the AI in the worker and no console errors.

### Story 4.4: Deployment  (Epic E7)

- **Summary:** Deploy the game to GitHub Pages
- **Acceptance criteria:**
  - Push to `main` tests, builds and publishes automatically
  - Game loads correctly under `/digital-reversi/`
- **Branch / PR:** `feature/deployment` → **#14**
- **Files:** `.github/workflows/deploy.yml`, `vite.config.ts`, `README.md`
- **Testing evidence:** build served from a `/digital-reversi/` sub-path
  locally — all assets HTTP 200. Requires Settings → Pages → Source:
  GitHub Actions.

### Story 4.5: Documentation  (Epic E7)

- **Summary:** Final project documentation
- **Acceptance criteria:**
  - README: features, setup, how to play, scripts, structure, testing, deployment
  - Tech stack, testing report and this Jira plan in `docs/`
- **Branch / PR:** `feature/documentation` → **#15**
- **Files:** `README.md`, `docs/TECH_STACK.md`, `docs/TESTING.md`,
  `docs/JIRA_PLAN.md`

### Story 4.6: Release verification  (Epic E7)

- **Summary:** Verify the release from a fresh clone and in a real browser, and fix what is found
- **Description:** As the team, we want to confirm the deployed game works for
  real users before sign-off, so that no defect reaches the final release.
- **Acceptance criteria:**
  - Fresh clone: install, type-check, lint, tests (coverage, repeated runs) and build all pass
  - Rules checked against published perft counts
  - Game played in a real browser: two-player, keyboard, Help, full game vs Hard, phone widths, no console errors
  - Every defect found is logged and fixed
- **Bugs found (log each as a Bug linked to this story):**
  - Flaky full-game UI test under coverage (~5 s vs 5 s limit)
  - Flaky hard-vs-medium strength test under coverage (up to 65 s vs 60 s limit)
  - Page scrolled sideways 22 px on a 320 px phone (results table)
  - Large empty gap between the board and the buttons
  - Game could hang if the AI worker never answered
- **Branch / PR:** `fix/release-verification` → **#16** (fixes);
  `feature/browser-e2e-and-final-docs` → **#17** (real-browser check + final docs)
- **Files (#16):** `vite.config.ts`, `src/ai/aiClient.ts`, `src/ai/aiClient.test.ts`,
  `src/ai/ai.test.ts`, `src/game/perft.test.ts`, `src/components/MatchScreen/*`,
  `src/components/ResultsPanel/*`, `src/App.css`, `public/favicon.svg`, `package.json`
- **Files (#17):** `e2e/browser-check.mjs`, `package.json`, `README.md`, `docs/*.md`
- **Testing evidence:** 179/179 tests in 3 consecutive coverage runs; perft
  depths 1–6 match; real-browser check 24/24 on the fixed build.

### Story 4.7: Align the game with Deliverable 3  (Epic E7)

- **Summary:** Make the game follow the D3 component specification
- **Description:** As the team, we want the delivered game to match our D3
  specification, so that the design document and the product agree.
- **Acceptance criteria:**
  - Sessions of 1, 2 or 4 games; no Next game after the last; session result shown (R07, REQ-SESS-01)
  - Names trimmed, 1–30 characters, required and distinct ignoring case, with a message per field (R09, REQ-SET-01)
  - End session asks for confirmation; a game in progress is not counted; a new session starts clean (REQ-SET-02)
  - AI requests use the D3 contract (64-cell `B`/`W`/`.` board, `legalMoves`, `requestId`, `gameId`, `revision`, `timeBudgetMs` 3000) (REQ-AI-01)
  - Every AI reply is validated; wrong id, stale, malformed, illegal or late (5 s) replies change nothing and show Retry / End session (REQ-AI-02)
  - Forced passes stored and shown in the results (REQ-TURN-02)
  - NFR08 (two interchangeable providers) and NFR09 (30 injected bad replies) tests
  - Help covers sessions, name rules, no undo / no voluntary pass, reload clears the session
  - Restart game removed (not in D3)
- **Bugs found (log as Bugs linked to this story):**
  - AI reply not validated against the legal list (an illegal reply would stall the game)
  - Real-browser check left headless Edge running
- **Branch / PR:** `feature/d3-alignment` → **#18**
- **Files:** `src/game/match.ts`, `src/ai/contract.ts`, `src/ai/aiClient.ts`,
  `src/ai/ai.worker.ts`, `src/hooks/useMatch.ts`, `src/components/SetupScreen/*`,
  `src/components/MatchScreen/*`, `src/components/ResultsPanel/*`,
  `src/components/HelpDialog/*`, `src/App.tsx`, `src/App.css`, `src/index.css`,
  tests for each, `e2e/browser-check.mjs`, `README.md`, `docs/*.md`
- **Testing evidence:** 249/249 tests; real-browser check 27/27 in Chrome and in
  Edge; see [D3_TRACEABILITY.md](D3_TRACEABILITY.md).

### Story 4.8: Apply the new visual design  (Epic E7)

- **Summary:** Restyle the game to match the team’s Lovable design mock-up
- **Description:** As a player, I want a clear, attractive interface, so that the
  game is pleasant to use. The Lovable project is a visual mock-up only (its board
  is not playable), so the design is applied to our working game.
- **Acceptance criteria:**
  - Colours, fonts and spacing from the design (cream background, forest green, gold hints, Georgia headings)
  - Landing page with Start game, How to play and an opening-board preview
  - How to play page (numbered rules) and the same content as a dialog during a game
  - Setup: mode cards, Player A / Player B names, segmented difficulty and session length
  - Game: top bar, “Game N of M” heading, turn pill, coordinate-labelled board, Players panel
  - All D3 behaviour, keyboard use and screen-reader announcements unchanged; no horizontal scroll at 390 px or 320 px
- **Branch / PR:** `feature/lovable-design` → **#19**
- **Files:** `src/index.css`, `src/App.tsx`, `src/App.css`, `src/components/Icon.tsx`,
  `src/components/LandingScreen/*`, `src/components/HowToPage/*`,
  `src/components/HelpDialog/*`, `src/components/SetupScreen/*`,
  `src/components/MatchScreen/*`, `src/components/GameStatus/*`,
  `src/components/Board/*`, `src/components/ResultsPanel/*`, tests for each,
  `e2e/browser-check.mjs`, `README.md`, `docs/*.md`
- **Testing evidence:** 254/254 tests; real-browser check 28/28 in Chrome and in
  Edge; screenshots of every screen at desktop and phone widths reviewed.

**Sprint 4 / release checklist:** #11–#19 merged in order; CI green on `main`;
deploy workflow succeeded; real-browser check passes 28/28 against the live
URL; screen-reader check done (see [TESTING.md](TESTING.md#manual-checks)).

---

## Pull Request merge order

PRs #4–#15 were stacked (each built on the previous branch) and were merged
in this order, retargeting each next PR to `main` first:

`#4 → #5 → #6 → #7 → #8 → #9 → #10 → #11 → #12 → #13 → #14 → #15`

Release verification: `#16 → #17` (#17 is stacked on #16).

D3 alignment: `#18` (based on `main` after #17).

New design: `#19` (based on `main` after #18).
