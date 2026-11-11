# Testing

How Digital Reversi is tested, and the results recorded for each sprint.

## Running the tests

```bash
npm test               # all tests once
npm run test:watch     # re-run on change
npm run test:coverage  # with coverage report and thresholds
npm run lint
npm run build          # includes a full TypeScript type-check
```

## Test layers

| Layer | Where | What is checked |
| --- | --- | --- |
| Perft (independent check) | `src/game/perft.test.ts` | Counts every move sequence from the opening to depths 1–6 and matches the published Othello values exactly: 4, 12, 56, 244, 1396, 8200. (Depth 7, 55 092, also matched in a one-off run.) This checks move generation and captures against an outside reference rather than our own expectations. |
| Rules (unit) | `src/game/*.test.ts` | Opening position, bounds, legal moves in all 8 directions, edges and gaps, captures, turn order, passes, game end, winner/draw, match colour alternation and results. |
| Randomised whole games | `src/game/properties.test.ts` | 200 complete random games; after **every** move: one disc added, only the placed and flipped squares changed, flips were the opponent's, turn and pass logic correct, game ends only when nobody can move. |
| AI | `src/ai/*.test.ts` | Always legal, `null` with no move, corner play, avoids giving corners, evaluation symmetry, strength (medium > easy, hard > medium on seeded games), speed, Web Worker provider. |
| AI contract (D3) | `src/ai/contract.test.ts` | Board encoding (A1 = 0 … H8 = 63), the D3 example request and reply, timeout, **NFR09** (30 injected bad replies / stale moves, none change the game) and **NFR08** (two providers interchangeable through the same adapter). |
| State (hooks) | `src/hooks/*.test.ts` | Reducers for moves, illegal moves, next game and session length; automatic result and pass recording; stale AI moves ignored; computer turns, blocking human input, AI failure, timeout and retry, cancellation when the session ends. |
| Components | `src/components/**/*.test.tsx` | Board labels, hints, keyboard navigation; status messages; players panel and turn pill; setup form and name validation; End session confirmation (sidebar and top bar); session summary; AI failure and retry; results table with passes; Help dialog focus handling. |
| End-to-end in jsdom | `src/App.test.tsx` | Full user flows: landing page and How to play page, set up a session (rejecting invalid names), play and reject moves, finish games, colours swap, session result, Help mid-game, playing the computer, End session, markup-like names shown as text. |
| **Real browser** | `e2e/browser-check.mjs` (`npm run test:e2e -- <url>`) | Headless Chrome/Edge via the DevTools Protocol: landing page with board preview, blank names rejected, two-player game to a known result, illegal move, colour swap, arrow keys + Enter, How to play + Esc, End session confirmation, a **full game against Hard** (computer replies every turn, AI loaded in the Web Worker, session summary), no horizontal scroll at 390 px and 320 px, and no console errors, exceptions or failed requests. Optional screenshots. |

Tests find elements by **role and accessible name** (as a screen reader would),
so they also check basic accessibility.

## Results by sprint

All numbers are from actual runs of `npm test` on each branch before its PR was opened.

| Sprint | PR | Tests passing |
| --- | --- | --- |
| 1 | #1 Foundation | 1 |
| 1 | #2 Game model | 29 |
| 1 | #3 Board UI | 43 |
| 1 | #4 Ignore coverage | 43 |
| 2 | #5 Legal moves | 62 |
| 2 | #6 Captures and turns | 80 |
| 2 | #7 Human vs Human | 98 |
| 3 | #8 Matches and results | 125 |
| 3 | #9 Help | 133 |
| 3 | #10 Human vs AI | 155 |
| 4 | #11 CI and testing | 156 |
| 4 | #12 Accessibility | 165 |
| 4 | #13 Performance | 172 |
| 4 | #14 Deployment | 172 |
| 4 | #16 Release-verification fixes | 179 |
| 4 | #17 Browser check + final docs | 179 |
| 4 | #18 D3 alignment | 249 |
| 4 | #19 New design (Lovable) | 254 |

Coverage at #11: statements 98.86%, branches 98.22%, functions 98.83%, lines 99.33%.
Coverage at #16: statements 97.73%, branches 97.77%, functions 97.08%, lines 98.16% (the worker client and timeout fallback added a few defensive lines).
Coverage at #18: statements 98.14%, branches 97.46%, functions 97.85%, lines 98.44%.
Coverage at #19: statements 98.41%, branches 97.66%, functions 98.70%, lines 98.72%.

CI on GitHub (Node 22 and 24) passed for every PR from #11 on, and on `main` after merging.
At #16, `npm run test:coverage` was run three times in a row and passed 179/179 each time.

## Defects found by testing

| Defect | How it was found | Fix |
| --- | --- | --- |
| `coverage/` left untracked | Sprint 1 review | Added to `.gitignore` (#4) |
| Assumed "shortest game" sequence was wrong | UI test failed | Replaced with a sequence found by searching the real rules engine (#7) |
| AI ignored available corners | AI unit test | Corner-aware square weights (#10) |
| Hard AI blocked the page up to ~868 ms | Timing measurement | Move ordering → ~221 ms (#10); Web Worker (#13) |
| README stated wrong Node version | Checking package engine requirements for CI | Corrected; `engines` added (#11) |
| Random-games test timed out under coverage | Coverage run | Explicit 60 s timeout (#11) |
| **Release verification (fresh clone + real browser):** | | |
| Flaky: full-game UI test ~5 s under coverage vs 5 s limit | Failed once on a fresh-clone coverage run | Global `testTimeout` 20 s (#16) |
| Flaky: hard-vs-medium strength test up to 65 s vs 60 s limit | Failed on the 3rd of 3 back-to-back coverage runs | 4 seeded games (hard wins all), 120 s limit (#16) |
| Page scrolled sideways 22 px on a 320 px phone | Real-browser check + screenshot (results table too wide) | Table scrolls inside its panel; compact under 400 px (#16) |
| Large empty gap between board and buttons | Desktop screenshot | Messages share one fixed slot (#16) |
| A worker that never answered would hang the game | Code review | Fall back to the main thread after 5 s (#16); replaced in #18 by the D3 behaviour: report the failure and offer Retry |
| **D3 alignment (#18):** | | |
| Game did not follow D3 for session length, name rules, End session confirmation, the AI contract, AI failure handling and pass records | Line-by-line comparison with D3 | Implemented; see [D3_TRACEABILITY.md](D3_TRACEABILITY.md) |
| An AI reply was not checked against the legal list; an illegal reply would have left the game stuck | D3 comparison (REQ-AI-02) | Adapter validates every reply; failures show Retry (#18) |
| Real-browser check left headless Edge processes and its profile behind | Process check after running it in Edge | Close the browser through the DevTools Protocol, with a process-tree kill as a fallback (#18) |

## Real-browser results

At #19 (new design), build served locally with `vite preview`, 11 November 2026:

| Browser | Result |
| --- | --- |
| Chrome 157.0.8103.50 (Windows 11) | **28/28** |
| Edge 157.0.4341.42 (Windows 11) | **28/28** |

At #18 (D3 alignment): 27/27 in both browsers.

Earlier results:

Run with `npm run test:e2e` (headless Chrome, 10 November 2026):

| Target | Result |
| --- | --- |
| Live site before #16 | 23/24 (failed: 22 px horizontal scroll at 320 px) |
| Build with #16, served under `/digital-reversi/` | **24/24** |

In the full game against Hard the computer replied 30 times, each within
1.25 s including the deliberate 600 ms pause, and the AI ran in the Web Worker.

## Manual checks

- [x] Play in a real browser, desktop and phone widths: automated by the real-browser check, screenshots reviewed
- [x] Play against Hard and check for Web Worker errors: automated (no console errors; worker loaded)
- [x] GitHub Pages site loads and is playable: real-browser check run against the live URL
- [ ] Try the board with a screen reader (NVDA on Windows / VoiceOver on macOS): needs a person
