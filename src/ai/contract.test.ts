import { describe, expect, it, vi } from 'vitest'
import { createInitialBoard, getLegalMoves } from '../game'
import type { SessionConfig } from '../game'
import { gameIdOf, initMatchView, matchReducer } from '../hooks/useMatch'
import type { MatchViewState } from '../hooks/useMatch'
import { answerRequest } from './aiClient'
import {
  AI_TIMEOUT_MS,
  buildRequest,
  decodeBoard,
  encodeBoard,
  fromIndex,
  requestAiMove,
  toIndex,
  validateReply,
} from './contract'
import type { AiMoveRequest, AiProvider } from './contract'

const opening = () =>
  buildRequest({
    board: createInitialBoard(),
    player: 'black',
    difficulty: 'easy',
    requestId: 'req-001',
    gameId: 'g-001',
    revision: 0,
  })

describe('board encoding (D3 §2.1, §3.4)', () => {
  it('maps A1 to 0 and H8 to 63, row-major', () => {
    expect(toIndex({ row: 0, col: 0 })).toBe(0)
    expect(toIndex({ row: 7, col: 7 })).toBe(63)
    expect(toIndex({ row: 2, col: 3 })).toBe(19) // d3
    for (let i = 0; i < 64; i++) expect(toIndex(fromIndex(i))).toBe(i)
  })

  it('encodes the opening as 64 B/W/. entries', () => {
    const cells = encodeBoard(createInitialBoard())
    expect(cells).toHaveLength(64)
    expect([cells[27], cells[28], cells[35], cells[36]]).toEqual(['W', 'B', 'B', 'W']) // d4 e4 d5 e5
    expect(cells.filter((c) => c === '.')).toHaveLength(60)
    expect(decodeBoard(cells)).toEqual(createInitialBoard())
  })

  it('builds the opening request from the D3 example', () => {
    expect(opening()).toEqual({
      board: encodeBoard(createInitialBoard()),
      toMove: 'B',
      aiColour: 'B',
      legalMoves: [19, 26, 37, 44], // D3, C4, F5, E6
      difficulty: 'easy',
      requestId: 'req-001',
      gameId: 'g-001',
      revision: 0,
      timeBudgetMs: 3000,
    })
  })

  it('accepts the D3 example reply', () => {
    expect(validateReply(opening(), { requestId: 'req-001', cellIndex: 19 })).toEqual({
      ok: true,
      position: { row: 2, col: 3 },
      requestId: 'req-001',
    })
  })
})

describe('requestAiMove', () => {
  it('fails when the provider throws', async () => {
    const result = await requestAiMove(() => Promise.reject(new Error('boom')), opening())
    expect(result).toEqual({ ok: false, reason: 'provider failed', requestId: 'req-001' })
  })

  it('fails after the timeout (D3: 5 s)', async () => {
    vi.useFakeTimers()
    try {
      const promise = requestAiMove(() => new Promise(() => {}), opening())
      await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS)
      expect(await promise).toMatchObject({ ok: false, reason: 'no reply in time' })
    } finally {
      vi.useRealTimers()
    }
  })
})

/**
 * NFR09: 30 injected stale, malformed, illegal or out-of-range replies must all
 * be rejected without changing the board, side to move, revision or results.
 */
describe('NFR09: thirty bad AI replies are rejected without any change', () => {
  const vsComputer: SessionConfig = {
    players: {
      p1: { name: 'Ada', kind: 'human' },
      p2: { name: 'Computer (Easy)', kind: 'computer', difficulty: 'easy' },
    },
    length: 2,
  }

  /** Human has played d3; the computer (white) is to move at revision 1. */
  function computerTurn(): { state: MatchViewState; request: AiMoveRequest } {
    const state = matchReducer(initMatchView(vsComputer), {
      type: 'move',
      position: { row: 2, col: 3 },
    })
    const request = buildRequest({
      board: state.view.game.board,
      player: 'white',
      difficulty: 'easy',
      requestId: 'req-live',
      gameId: gameIdOf(state),
      revision: 1,
    })
    return { state, request }
  }

  const id = 'req-live'
  // Replies checked by the adapter (I-AI-REPLY)
  const badReplies: [string, unknown][] = [
    ['wrong id', { requestId: 'req-other', cellIndex: 18 }],
    ['old id', { requestId: 'req-0', cellIndex: 18 }],
    ['empty id', { requestId: '', cellIndex: 18 }],
    ['numeric id', { requestId: 1, cellIndex: 18 }],
    ['missing id', { cellIndex: 18 }],
    ['null', null],
    ['string', 'c3'],
    ['number', 18],
    ['array', [18]],
    ['no cell index', { requestId: id }],
    ['cell index as text', { requestId: id, cellIndex: '18' }],
    ['fractional index', { requestId: id, cellIndex: 18.5 }],
    ['NaN index', { requestId: id, cellIndex: Number.NaN }],
    ['negative index', { requestId: id, cellIndex: -1 }],
    ['index 64', { requestId: id, cellIndex: 64 }],
    ['index 1000', { requestId: id, cellIndex: 1000 }],
    ['occupied d4', { requestId: id, cellIndex: 27 }],
    ['occupied d3', { requestId: id, cellIndex: 19 }],
    ['empty non-capturing a1', { requestId: id, cellIndex: 0 }],
    ['empty non-capturing h8', { requestId: id, cellIndex: 63 }],
    ['provider error', { requestId: id, error: 'internal_error' }],
    ['claimed outcome', { requestId: id, winner: 'W' }],
    ['pass while moves exist', { requestId: id, pass: true }],
  ]

  it.each(badReplies)('rejects a reply: %s', async (_, reply) => {
    const { state, request } = computerTurn()
    const result = await requestAiMove(async () => reply, request)
    expect(result.ok).toBe(false)
    // Nothing reaches the rules engine, so the game is unchanged
    expect(state.view.game.moveCount).toBe(1)
  })

  // Moves that passed the adapter but are no longer current (checked by the platform)
  const staleActions: [string, (s: MatchViewState) => Parameters<typeof matchReducer>[1]][] = [
    ['old revision', (s) => ({ type: 'aiMove', position: { row: 2, col: 2 }, gameId: gameIdOf(s), revision: 0 })],
    ['future revision', (s) => ({ type: 'aiMove', position: { row: 2, col: 2 }, gameId: gameIdOf(s), revision: 2 })],
    ['earlier session', () => ({ type: 'aiMove', position: { row: 2, col: 2 }, gameId: 's0-g1', revision: 1 })],
    ['other game', (s) => ({ type: 'aiMove', position: { row: 2, col: 2 }, gameId: gameIdOf(s).replace(/g1$/, 'g2'), revision: 1 })],
    ['illegal square', (s) => ({ type: 'aiMove', position: { row: 0, col: 0 }, gameId: gameIdOf(s), revision: 1 })],
  ]

  it.each(staleActions)('ignores a stale AI move: %s', (_, make) => {
    const { state } = computerTurn()
    expect(matchReducer(state, make(state))).toBe(state)
  })

  it('ignores a duplicate of an applied reply', () => {
    const { state } = computerTurn()
    const action = {
      type: 'aiMove' as const,
      position: { row: 2, col: 2 },
      gameId: gameIdOf(state),
      revision: 1,
    }
    const once = matchReducer(state, action)
    expect(once.view.game.moveCount).toBe(2)
    expect(matchReducer(once, action)).toBe(once)
  })

  it('ignores an AI move on the human turn', () => {
    const state = initMatchView(vsComputer)
    const action = {
      type: 'aiMove' as const,
      position: { row: 2, col: 3 },
      gameId: gameIdOf(state),
      revision: 0,
    }
    expect(matchReducer(state, action)).toBe(state)
  })

  it('covers exactly thirty injected cases', () => {
    expect(badReplies.length + staleActions.length + 2).toBe(30)
  })
})

/**
 * NFR08: two compatible providers are interchangeable through the same
 * adapter, with no change to rules, board UI or outcome code.
 */
describe('NFR08: interchangeable AI providers', () => {
  const firstLegal: AiProvider = async (r) => ({ requestId: r.requestId, cellIndex: r.legalMoves[0] })
  const builtIn: AiProvider = async (r) => answerRequest(r)

  async function playFullGame(provider: AiProvider) {
    const config: SessionConfig = {
      players: {
        p1: { name: 'Ada', kind: 'human' },
        p2: { name: 'Computer (Easy)', kind: 'computer', difficulty: 'easy' },
      },
      length: 1,
    }
    let state = initMatchView(config)
    let requests = 0
    while (state.view.game.status === 'playing') {
      const { game } = state.view
      if (game.currentPlayer === 'black') {
        const [move] = getLegalMoves(game.board, 'black')
        state = matchReducer(state, { type: 'move', position: move })
        continue
      }
      requests++
      const request = buildRequest({
        board: game.board,
        player: 'white',
        difficulty: 'easy',
        requestId: `req-${requests}`,
        gameId: gameIdOf(state),
        revision: game.moveCount,
      })
      const result = await requestAiMove(provider, request)
      expect(result.ok).toBe(true)
      if (!result.ok) return state
      state = matchReducer(state, {
        type: 'aiMove',
        position: result.position,
        gameId: request.gameId,
        revision: request.revision,
      })
    }
    return state
  }

  it.each([
    ['first-legal test double', firstLegal],
    ['built-in engine', builtIn],
  ])('completes a game with the %s', async (_, provider) => {
    const state = await playFullGame(provider)
    expect(state.view.game.status).toBe('finished')
    expect(state.match.history).toHaveLength(1)
    const { black, white } = state.match.history[0].score
    expect(black + white).toBeLessThanOrEqual(64)
  })

  it.each([
    ['first-legal test double', firstLegal],
    ['built-in engine', builtIn],
  ])('passes the shared opening fixture with the %s', async (_, provider) => {
    const result = await requestAiMove(provider, opening())
    expect(result.ok).toBe(true)
    if (result.ok) expect([19, 26, 37, 44]).toContain(toIndex(result.position))
  })
})
