import { useEffect, useMemo, useReducer, useState } from 'react'
import { buildRequest, builtInProvider, requestAiMove } from '../ai'
import type { AiProvider } from '../ai'
import {
  canStartNextGame,
  countDiscs,
  createMatch,
  getLegalMoves,
  getTally,
  isCurrentGameRecorded,
  isLegalMove,
  isSessionComplete,
  namesByDisc,
  playerForDisc,
  recordPass,
  recordResult,
  startNextGame,
} from '../game'
import type { MatchState, Position, SessionConfig } from '../game'
import { gameReducer, initGameView } from './gameReducer'
import type { GameViewState } from './gameReducer'

export interface MatchViewState {
  /** Identifies this session, so replies from an earlier session never match. */
  sessionId: string
  match: MatchState
  view: GameViewState
}

export type MatchAction =
  /** A human placement. Ignored on the computer's turn. */
  | { type: 'move'; position: Position }
  /** A validated AI reply. Applied only if it is still for the current game and revision. */
  | { type: 'aiMove'; position: Position; gameId: string; revision: number }
  | { type: 'nextGame' }

let sessionCounter = 0

export function initMatchView(config: SessionConfig): MatchViewState {
  sessionCounter++
  return {
    sessionId: `s${sessionCounter}`,
    match: createMatch(config.players, config.length),
    view: initGameView(),
  }
}

export function gameIdOf(state: MatchViewState): string {
  return `${state.sessionId}-g${state.match.gameNumber}`
}

function isComputerToMove(state: MatchViewState): boolean {
  const { match, view } = state
  return (
    view.game.status === 'playing' &&
    match.players[playerForDisc(match, view.game.currentPlayer)].kind === 'computer'
  )
}

/** Applies a placement through the rules engine and records passes and results. */
function applyPlacement(state: MatchViewState, position: Position): MatchViewState {
  const view = gameReducer(state.view, { type: 'move', position })
  if (view === state.view) return state
  if (view.game === state.view.game) return { ...state, view } // rejected: only the message changes

  let match = state.match
  if (view.game.passedPlayer) {
    match = recordPass(match, view.game.passedPlayer, view.game.moveCount)
  }
  if (view.game.status === 'finished' && !isCurrentGameRecorded(match)) {
    match = recordResult(match, view.game)
  }
  return { ...state, match, view }
}

export function matchReducer(state: MatchViewState, action: MatchAction): MatchViewState {
  switch (action.type) {
    case 'move':
      // Humans cannot move for the computer (D3 REQ-TURN-01)
      if (isComputerToMove(state)) return state
      return applyPlacement(state, action.position)
    case 'aiMove': {
      // Stale, out-of-turn or illegal replies never change anything (D3 R08, REQ-AI-02)
      const { game } = state.view
      if (
        !isComputerToMove(state) ||
        action.gameId !== gameIdOf(state) ||
        action.revision !== game.moveCount ||
        !isLegalMove(game.board, action.position, game.currentPlayer)
      ) {
        return state
      }
      return applyPlacement(state, action.position)
    }
    case 'nextGame':
      if (!canStartNextGame(state.match)) return state
      return { ...state, match: startNextGame(state.match), view: initGameView() }
  }
}

export interface UseMatchOptions {
  /** Pause before the computer's move is shown, so it is visible. */
  aiDelayMs?: number
  /** Who chooses the computer's moves; the built-in engine by default. Keep it stable between renders. */
  aiProvider?: AiProvider
  /** How long to wait for a reply before reporting a failure. */
  aiTimeoutMs?: number
}

export const DEFAULT_AI_DELAY_MS = 600

interface AiFailure {
  /** The game and revision the failed request was for. */
  key: string
  reason: string
}

let requestCounter = 0

export function useMatch(
  config: SessionConfig,
  { aiDelayMs = DEFAULT_AI_DELAY_MS, aiProvider = builtInProvider, aiTimeoutMs }: UseMatchOptions = {},
) {
  const [state, dispatch] = useReducer(matchReducer, config, initMatchView)
  const [failure, setFailure] = useState<AiFailure | null>(null)
  const [attempt, setAttempt] = useState(0)

  const { match, view } = state
  const { game } = view
  const gameId = gameIdOf(state)
  const revision = game.moveCount
  const turnKey = `${gameId}:${revision}`

  const currentPlayerId = playerForDisc(match, game.currentPlayer)
  const currentPlayer = match.players[currentPlayerId]
  const isComputerTurn = game.status === 'playing' && currentPlayer.kind === 'computer'
  const difficulty = currentPlayer.difficulty ?? 'medium'
  const aiError = isComputerTurn && failure?.key === turnKey ? failure.reason : null

  useEffect(() => {
    if (!isComputerTurn || aiError) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const started = Date.now()

    requestCounter++
    const request = buildRequest({
      board: game.board,
      player: game.currentPlayer,
      difficulty,
      requestId: `req-${requestCounter}`,
      gameId,
      revision,
    })

    // The search starts immediately (in a Web Worker by default); the move is
    // shown once at least `aiDelayMs` has passed so it doesn't appear instantly.
    void requestAiMove(aiProvider, request, aiTimeoutMs).then((result) => {
      if (cancelled) return // the game moved on or the session ended
      if (!result.ok) {
        setFailure({ key: turnKey, reason: result.reason })
        return
      }
      const remaining = Math.max(0, aiDelayMs - (Date.now() - started))
      timer = setTimeout(() => {
        if (!cancelled) dispatch({ type: 'aiMove', position: result.position, gameId, revision })
      }, remaining)
    })

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // `attempt` re-sends the request with a fresh id when the player retries
  }, [
    isComputerTurn,
    aiError,
    game,
    difficulty,
    gameId,
    revision,
    turnKey,
    aiDelayMs,
    aiProvider,
    aiTimeoutMs,
    attempt,
  ])

  const legalMoves = useMemo(
    () => (game.status === 'playing' ? getLegalMoves(game.board, game.currentPlayer) : []),
    [game],
  )
  const score = useMemo(() => countDiscs(game.board), [game.board])
  const names = useMemo(() => namesByDisc(match), [match])
  const tally = useMemo(() => getTally(match), [match])

  return {
    match,
    game,
    error: view.error,
    legalMoves,
    score,
    names,
    tally,
    currentPlayerId,
    isComputerTurn,
    /** Why the last computer request failed, while that turn is still current. */
    aiError,
    sessionComplete: isSessionComplete(match),
    canNextGame: canStartNextGame(match),
    play: (position: Position) => dispatch({ type: 'move', position }),
    nextGame: () => dispatch({ type: 'nextGame' }),
    /** Sends a fresh request for the current computer turn. */
    retryAi: () => {
      setFailure(null)
      setAttempt((n) => n + 1)
    },
  }
}
