import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { answerRequest } from '../ai'
import type { AiMoveRequest, AiProvider } from '../ai'
import { getLegalMoves } from '../game'
import type { PlayerId, PlayerInfo, Position, SessionConfig } from '../game'
import { gameIdOf, initMatchView, matchReducer, useMatch } from './useMatch'
import type { MatchViewState } from './useMatch'

const players = {
  p1: { name: 'Ada', kind: 'human' as const },
  p2: { name: 'Ben', kind: 'human' as const },
}
const twoGames: SessionConfig = { players, length: 2 }

const at = (label: string): Position => ({
  row: Number(label[1]) - 1,
  col: label.charCodeAt(0) - 97,
})

/** 9-move game ending 13–0 to black. */
const SHORT_GAME = ['d3', 'c3', 'b3', 'd2', 'e1', 'd6', 'd7', 'e3', 'f4']

function playAll(moves: string[], config: SessionConfig = twoGames) {
  let state = initMatchView(config)
  for (const m of moves) state = matchReducer(state, { type: 'move', position: at(m) })
  return state
}

describe('matchReducer', () => {
  it('records the result automatically when a game ends', () => {
    const state = playAll(SHORT_GAME)
    expect(state.view.game.status).toBe('finished')
    expect(state.match.history).toHaveLength(1)
    expect(state.match.history[0]).toMatchObject({ winner: 'p1', score: { black: 13, white: 0 } })
  })

  it('does not record anything while the game is in progress', () => {
    expect(playAll(SHORT_GAME.slice(0, 4)).match.history).toEqual([])
  })

  it('returns the same match for an illegal move, with an error message', () => {
    const start = initMatchView(twoGames)
    const next = matchReducer(start, { type: 'move', position: at('a1') })
    expect(next.match).toBe(start.match)
    expect(next.view.game).toBe(start.view.game)
    expect(next.view.error).toMatch(/not a legal move/)
  })

  it('moves to the next game with colours swapped', () => {
    const next = matchReducer(playAll(SHORT_GAME), { type: 'nextGame' })
    expect(next.match.gameNumber).toBe(2)
    expect(next.view.game.moveCount).toBe(0)
    expect(next.match.history).toHaveLength(1)
  })

  it('does not allow skipping to the next game before the current one ends', () => {
    const midGame = playAll(SHORT_GAME.slice(0, 3))
    expect(matchReducer(midGame, { type: 'nextGame' })).toBe(midGame)
  })

  it('offers no game beyond the session length', () => {
    const done = playAll(SHORT_GAME, { players, length: 1 })
    expect(matchReducer(done, { type: 'nextGame' })).toBe(done)
  })

  it('ignores a repeated Next game (double activation cannot skip a game)', () => {
    const once = matchReducer(playAll(SHORT_GAME, { players, length: 4 }), { type: 'nextGame' })
    expect(matchReducer(once, { type: 'nextGame' })).toBe(once)
  })

  it('credits the right player when colours are swapped', () => {
    let state = matchReducer(playAll(SHORT_GAME), { type: 'nextGame' })
    for (const m of SHORT_GAME) state = matchReducer(state, { type: 'move', position: at(m) })
    // Black wins again, but in game 2 Ben has black
    expect(state.match.history.map((r) => r.winner)).toEqual(['p1', 'p2'])
  })

  it('records every forced pass with the player who passed', () => {
    // Seeded random games until several passes have happened
    let seed = 7
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed / 2 ** 31
    }
    let seen = 0
    let recorded = 0
    for (let g = 0; g < 40; g++) {
      let state = initMatchView({ players, length: 1 })
      while (state.view.game.status === 'playing') {
        const moves = getLegalMoves(state.view.game.board, state.view.game.currentPlayer)
        const before = state.view.game.currentPlayer
        state = matchReducer(state, {
          type: 'move',
          position: moves[Math.floor(rand() * moves.length)],
        })
        const { game } = state.view
        if (game.passedPlayer) {
          seen++
          expect(game.passedPlayer).not.toBe(before)
          const last = state.match.passes.at(-1)!
          expect(last).toMatchObject({ disc: game.passedPlayer, afterMove: game.moveCount })
          expect(last.player).toBe(game.passedPlayer === 'black' ? 'p1' : 'p2')
        }
      }
      recorded += state.match.passes.length
    }
    expect(seen).toBeGreaterThan(0)
    expect(recorded).toBe(seen)
  })
})

describe('matchReducer against the computer', () => {
  const vsComputer: SessionConfig = {
    players: {
      p1: { name: 'Ada', kind: 'human' },
      p2: { name: 'Computer (Easy)', kind: 'computer', difficulty: 'easy' },
    },
    length: 1,
  }

  function computerToMove(): MatchViewState {
    return matchReducer(initMatchView(vsComputer), { type: 'move', position: at('d3') })
  }

  it('rejects human moves on the computer turn', () => {
    const state = computerToMove()
    expect(matchReducer(state, { type: 'move', position: at('c3') })).toBe(state)
  })

  it('applies a current, legal AI move', () => {
    const state = computerToMove()
    const next = matchReducer(state, {
      type: 'aiMove',
      position: at('c3'),
      gameId: gameIdOf(state),
      revision: 1,
    })
    expect(next.view.game.moveCount).toBe(2)
  })

  it.each([
    ['an old revision', { revision: 0 }],
    ['a future revision', { revision: 2 }],
    ['another game', { gameId: 'other-g1' }],
    ['an illegal square', { position: at('a1') }],
  ])('ignores an AI move for %s', (_, override) => {
    const state = computerToMove()
    const action = {
      type: 'aiMove' as const,
      position: at('c3'),
      gameId: gameIdOf(state),
      revision: 1,
      ...override,
    }
    expect(matchReducer(state, action)).toBe(state)
  })

  it('ignores AI moves on a human turn', () => {
    const state = initMatchView(vsComputer)
    const action = { type: 'aiMove' as const, position: at('d3'), gameId: gameIdOf(state), revision: 0 }
    expect(matchReducer(state, action)).toBe(state)
  })

  it('gives each session its own game ids, so earlier replies never match', () => {
    expect(gameIdOf(initMatchView(vsComputer))).not.toBe(gameIdOf(initMatchView(vsComputer)))
  })
})

describe('useMatch', () => {
  it('exposes names by colour, tally and the current player', () => {
    const { result } = renderHook(() => useMatch(twoGames))
    expect(result.current.names).toEqual({ black: 'Ada', white: 'Ben' })
    expect(result.current.currentPlayerId).toBe('p1')
    expect(result.current.tally).toEqual({ p1: 0, p2: 0, draws: 0 })

    for (const m of SHORT_GAME) act(() => result.current.play(at(m)))
    expect(result.current.tally).toEqual({ p1: 1, p2: 0, draws: 0 })
    expect(result.current.canNextGame).toBe(true)
    expect(result.current.sessionComplete).toBe(false)

    act(() => result.current.nextGame())
    expect(result.current.names).toEqual({ black: 'Ben', white: 'Ada' })
    expect(result.current.currentPlayerId).toBe('p2')

    for (const m of SHORT_GAME) act(() => result.current.play(at(m)))
    expect(result.current.sessionComplete).toBe(true)
    expect(result.current.canNextGame).toBe(false)
  })
})

describe('useMatch against the computer', () => {
  const vsComputer = (length: SessionConfig['length'] = 1): SessionConfig => ({
    players: {
      p1: { name: 'Ada', kind: 'human' },
      p2: { name: 'Computer (Easy)', kind: 'computer', difficulty: 'easy' },
    } satisfies Record<PlayerId, PlayerInfo>,
    length,
  })

  it('lets the computer reply after the human moves', async () => {
    const config = vsComputer()
    const { result } = renderHook(() => useMatch(config, { aiDelayMs: 0 }))
    expect(result.current.isComputerTurn).toBe(false)

    act(() => result.current.play(at('d3')))
    await waitFor(() => expect(result.current.game.moveCount).toBe(2))
    expect(result.current.game.currentPlayer).toBe('black')
    expect(result.current.isComputerTurn).toBe(false)
  })

  it('sends a complete D3 request for the current snapshot', async () => {
    const seen: AiMoveRequest[] = []
    const provider: AiProvider = async (request) => {
      seen.push(request)
      return answerRequest(request)
    }
    const config = vsComputer()
    const { result } = renderHook(() => useMatch(config, { aiDelayMs: 0, aiProvider: provider }))
    act(() => result.current.play(at('d3')))
    await waitFor(() => expect(result.current.game.moveCount).toBe(2))

    expect(seen).toHaveLength(1)
    const request = seen[0]
    expect(request).toMatchObject({
      toMove: 'W',
      aiColour: 'W',
      difficulty: 'easy',
      revision: 1,
      timeBudgetMs: 3000,
    })
    expect(request.board).toHaveLength(64)
    expect(request.board[19]).toBe('B') // d3
    expect(request.legalMoves).toEqual([18, 20, 34]) // c3, e3, c5
    expect(request.requestId).toMatch(/^req-\d+$/)
    expect(request.gameId).toMatch(/-g1$/)
  })

  it('ignores human input while it is the computer’s turn', () => {
    const config = vsComputer()
    const { result } = renderHook(() => useMatch(config, { aiDelayMs: 60_000 }))
    act(() => result.current.play(at('d3')))
    expect(result.current.isComputerTurn).toBe(true)

    act(() => result.current.play(at('c3'))) // a legal white move
    expect(result.current.game.moveCount).toBe(1)
  })

  it('moves first when it has black in the second game', async () => {
    const config = vsComputer(2)
    const { result } = renderHook(() => useMatch(config, { aiDelayMs: 0 }))
    // Play game 1 to the end: the human takes the first legal move each turn.
    while (result.current.game.status === 'playing') {
      if (!result.current.isComputerTurn) {
        act(() => result.current.play(result.current.legalMoves[0]))
      } else {
        const before = result.current.game.moveCount
        await waitFor(() => expect(result.current.game.moveCount).toBeGreaterThan(before))
      }
    }
    expect(result.current.match.history).toHaveLength(1)

    act(() => result.current.nextGame())
    expect(result.current.names.black).toBe('Computer (Easy)')
    await waitFor(() => expect(result.current.game.moveCount).toBe(1))
    expect(result.current.game.currentPlayer).toBe('white')
  })

  it('reports a failed reply without changing the game, and retries with a fresh request', async () => {
    const ids: string[] = []
    let fail = true
    const provider: AiProvider = async (request) => {
      ids.push(request.requestId)
      return fail ? { requestId: request.requestId, cellIndex: 0 } : answerRequest(request)
    }
    const config = vsComputer()
    const { result } = renderHook(() => useMatch(config, { aiDelayMs: 0, aiProvider: provider }))
    act(() => result.current.play(at('d3')))
    await waitFor(() => expect(result.current.aiError).toBe('not a legal move'))
    const board = result.current.game.board
    expect(result.current.game.moveCount).toBe(1)
    expect(result.current.isComputerTurn).toBe(true)

    // No automatic re-request while the failure is shown
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(ids).toHaveLength(1)
    expect(result.current.game.board).toBe(board)

    fail = false
    act(() => result.current.retryAi())
    await waitFor(() => expect(result.current.game.moveCount).toBe(2))
    expect(result.current.aiError).toBeNull()
    expect(ids).toHaveLength(2)
    expect(ids[1]).not.toBe(ids[0])
  })

  it('reports a timeout when the provider never answers', async () => {
    vi.useFakeTimers()
    try {
      const silent: AiProvider = () => new Promise(() => {})
      const config = vsComputer()
      const { result } = renderHook(() =>
        useMatch(config, { aiDelayMs: 0, aiProvider: silent, aiTimeoutMs: 5000 }),
      )
      act(() => result.current.play(at('d3')))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4999)
      })
      expect(result.current.aiError).toBeNull()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(result.current.aiError).toBe('no reply in time')
      expect(result.current.game.moveCount).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('drops the computer move if the session ends while it thinks', async () => {
    let resolveReply: (r: unknown) => void = () => {}
    let pending: AiMoveRequest | undefined
    const provider: AiProvider = (request) => {
      pending = request
      return new Promise((resolve) => {
        resolveReply = resolve
      })
    }
    const config = vsComputer()
    const { result, unmount } = renderHook(() =>
      useMatch(config, { aiDelayMs: 0, aiProvider: provider }),
    )
    act(() => result.current.play(at('d3')))
    expect(pending).toBeDefined()
    unmount() // End session
    await act(async () => resolveReply(answerRequest(pending!)))
    expect(result.current.game.moveCount).toBe(1)
  })
})
