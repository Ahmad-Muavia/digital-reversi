# D3 traceability

How the game meets each requirement in **Deliverable 3 (Component Specification
and Architectural Design, v1.0)**, with the code that implements it and the
evidence. Status values:

- **Met**: implemented, with an automated test or recorded run as evidence
- **Partly evidenced**: implemented, but the exact D3 measurement has not been run yet
- **Needs people**: can only be verified with real participants

Results below are from actual runs on 11 November 2026 (after the new design,
#19): `npm test` 254/254, lint clean, build clean, real-browser check 28/28 in
Chrome 157.0.8103.50 and 28/28 in Edge 157.0.4341.42.

## Rules (D3 §2.2)

| Rule | Code | Evidence | Status |
| --- | --- | --- | --- |
| R01 Opening board, Black first | `src/game/board.ts`, `game.ts` | `board.test.ts`, `game.test.ts`; perft | Met |
| R02 Legal placement (8 directions) | `src/game/rules.ts` | `rules.test.ts`; perft depths 1–6 match published Othello counts | Met |
| R03 All direct flips at once, no chains | `rules.ts`, `game.ts` | `rules.test.ts`, `properties.test.ts` (200 games, every move checked) | Met |
| R04 Turn order, forced pass, no voluntary pass | `game.ts` (`playMove`) | `game.test.ts`, `properties.test.ts`; no pass control exists | Met |
| R05 Game ends when neither side can move | `game.ts` | `game.test.ts`, `properties.test.ts` | Met |
| R06 Winner by disc count, draw on equal | `game.ts` (`getOutcome`) | `game.test.ts` | Met |
| R07 Sessions of 1, 2, 4; A black in odd games | `src/game/match.ts` | `match.test.ts` (session length, colour alternation) | Met |
| R08 Invalid input never changes state | `useMatch.ts` (`matchReducer`), `gameReducer.ts` | `useMatch.test.ts`, `contract.test.ts` (NFR09) | Met |
| R09 Names trimmed, 1–30 chars, distinct ignoring case | `match.ts` (`validateNames`), `SetupScreen.tsx` | `match.test.ts`, `SetupScreen.test.tsx`, `App.test.tsx` | Met |

## Components and interfaces (D3 §3)

| D3 component / interface | Code |
| --- | --- |
| C01 Setup Controller, I-SETUP | `src/components/SetupScreen`, `createMatch` / `validateNames` in `src/game/match.ts` |
| C02 Board Presentation | `src/components/Board`, `GameStatus` (turn pill and players panel) |
| C03 Rules Engine, I-MOVE | `src/game/rules.ts`, `src/game/game.ts` (the only code that changes the board) |
| C04 Turn and Result Controller | `playMove` in `src/game/game.ts`; result recording in `src/hooks/useMatch.ts` |
| C05 Session Manager, I-SESSION | `src/game/match.ts`, `src/hooks/useMatch.ts`, `MatchScreen` (End session / New session) |
| C06 In-memory event/result store | `MatchState.history` and `MatchState.passes` (memory only) |
| C07 AI Adapter / Request Guard | `src/ai/contract.ts` (`buildRequest`, `validateReply`, `requestAiMove`); stale checks in `matchReducer` (`aiMove`) |
| C08 AI Provider, I-AI-REQUEST / I-AI-REPLY | `src/ai/aiClient.ts` (`builtInProvider` in a Web Worker, `inPageProvider`), `src/ai/ai.worker.ts` |
| C09 Help and Result Viewer | `src/components/HowToPage` (page), `HelpDialog` (during a game), `ResultsPanel`, session summary in `MatchScreen` |
| Revision, requestId, gameId | revision = `GameState.moveCount`; `requestId` = `req-N`; `gameId` = `<session>-g<game>` |

The AI request is exactly the D3 §3.4 shape: `board` (64 × `B`/`W`/`.`, A1 = 0,
H8 = 63), `toMove`, `aiColour`, `legalMoves`, `difficulty`, `requestId`,
`gameId`, `revision`, `timeBudgetMs: 3000`. A test checks the D3 example:
opening legal moves `[19, 26, 37, 44]`, reply `{ requestId, cellIndex: 19 }`.

## Functional requirements (D3 §4)

| Requirement | Code | Evidence | Status |
| --- | --- | --- | --- |
| REQ-SET-01 Configure and validate a session | `SetupScreen.tsx`, `match.ts` | `SetupScreen.test.tsx` (blank, duplicate, length 1/2/4), `match.test.ts` (`createMatch` refuses invalid setup) | Met |
| REQ-SET-02 Lock configuration, End Session with confirmation, fresh session | `MatchScreen.tsx`, `App.tsx` | `MatchScreen.test.tsx` (confirm, decline, Esc), `App.test.tsx` (nothing carries over); unmount cancels pending AI work (`useMatch.test.ts`) | Met |
| REQ-RULE-01 Initialise board and turn | `game.ts`, `match.ts` | `game.test.ts`, `App.test.tsx` | Met |
| REQ-RULE-02 Legal placements and captures | `rules.ts`, `game.ts` | rules tests, perft, 200 random games | Met |
| REQ-TURN-01 Show turn, block unauthorised placement | `Board`, `GameStatus`, `matchReducer` | `useMatch.test.ts` (human move on computer turn rejected), `Board.test.tsx` | Met |
| REQ-TURN-02 Automatic pass and outcome | `game.ts`, `recordPass` in `match.ts` | `useMatch.test.ts` (every pass recorded with the right player), `game.test.ts` | Met |
| REQ-AI-01 Request through the stable contract | `buildRequest`, `useMatch.ts` | `contract.test.ts`, `useMatch.test.ts` (complete request for the snapshot) | Met |
| REQ-AI-02 Validate reply, retry, isolate errors | `validateReply`, `requestAiMove`, `MatchScreen.tsx` | `contract.test.ts` (NFR09), `useMatch.test.ts` (failure, timeout at 5 s, retry with a fresh id), `MatchScreen.test.tsx` | Met |
| REQ-SESS-01 Alternate colours, progress between games | `match.ts`, `useMatch.ts` | `match.test.ts`, `useMatch.test.ts` (no game beyond the length; double Next game ignored) | Met |
| REQ-UI-01 Help and session results | `HelpDialog.tsx`, `ResultsPanel.tsx`, `MatchScreen.tsx` | `HelpDialog.test.tsx`, `ResultsPanel.test.tsx` (passes column), `MatchScreen.test.tsx` (summary) | Met |
| REQ-INT-01 Reusable contract and fixtures | `src/ai/contract.ts` (`CONTRACT_VERSION = '1.0'`) | `contract.test.ts` (opening, invalid, stale fixtures; two providers) | Met |
| REQ-QA-01 Testable invariants and events | state is plain data; `passes`, `history`, `moveCount` | `properties.test.ts`, `contract.test.ts`, real-browser check | Met |

## Non-functional requirements (D3 §5)

| Requirement | Evidence so far | Status |
| --- | --- | --- |
| NFR01 95/100 human actions within 500 ms | The real-browser check plays moves with 30 ms gaps and every move shows up, but no per-action timing has been recorded. The 100-action timing log is still to do. | Partly evidenced |
| NFR02 AI within 3 s; timeout failure by 5.5 s | Real browser, Hard: 29 replies, slowest 1.32 s including the deliberate 0.6 s pause. Timeout reported at exactly 5 s (`useMatch.test.ts`). The 100-request log per level has not been recorded. | Partly evidenced |
| NFR03 4 of 5 first-time users succeed within 3 min | Needs five participants | Needs people |
| NFR04 20 games, both modes, no exceptions or duplicate results | 200 random complete games (rules); full games through the session reducer with two AI providers; double recording throws by design. A 20-game UI run is not recorded. | Partly evidenced |
| NFR05 Rule fixtures match | Rules unit tests, perft, 200 random games | Met |
| NFR06 Chrome and Edge | Real-browser check 28/28 in Chrome 157.0.8103.50 and Edge 157.0.4341.42 (Windows 11) | Met |
| NFR07 Keyboard-only operation, labelled cells | `Board.test.tsx` (labels, arrows, Enter/Space), `MatchScreen.test.tsx` (keyboard game), real-browser check | Met (screen-reader check still needs a person) |
| NFR08 Replaceable AI provider | `contract.test.ts`: a first-legal test double and the built-in engine both complete games through the same adapter; no rules, board or outcome code changes | Met |
| NFR09 30 bad AI replies rejected without change | `contract.test.ts`: 23 bad replies + 5 stale moves + duplicate + wrong-turn = 30 cases | Met |
| NFR10 Local data only, names as plain text | `App.test.tsx` (markup-like names shown as text); no account fields; nothing saved; real-browser check sees no failed requests | Met |

## Deliberate differences from D3

- **Difficulty levels.** D3 allows optional Easy / Medium / Hard "only after
  capability verification". They are kept: `ai.test.ts` checks that every
  level plays only legal moves and that Hard beats Medium and Medium beats
  Easy on seeded games.
- **The AI is in-house.** D3 describes an external partner component. The
  built-in engine sits behind the same contract and adapter, so a partner's
  engine can replace it by supplying another `AiProvider`.
- **Side names.** The setup screen labels the players **Player A** and **Player B**, matching D3 §2.1.
- **Restart game was removed.** D3 does not include it, and it conflicted with
  the locked-configuration rule. Use End session instead.
