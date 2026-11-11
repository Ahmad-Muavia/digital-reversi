import { describe, expect, it } from 'vitest'
import { gameReducer, initGameView } from './gameReducer'

describe('gameReducer', () => {
  it('applies a legal move and clears any error', () => {
    const withError = { ...initGameView(), error: 'old error' }
    const next = gameReducer(withError, { type: 'move', position: { row: 2, col: 3 } })
    expect(next.game.currentPlayer).toBe('white')
    expect(next.error).toBeNull()
  })

  it('keeps the game unchanged and reports an illegal move', () => {
    const start = initGameView()
    const next = gameReducer(start, { type: 'move', position: { row: 0, col: 0 } })
    expect(next.game).toBe(start.game)
    expect(next.error).toBe('a1 is not a legal move. Choose a highlighted square.')
  })

  it('ignores moves once the game is finished', () => {
    const finished = {
      ...initGameView(),
      game: { ...initGameView().game, status: 'finished' as const, outcome: 'draw' as const },
    }
    expect(gameReducer(finished, { type: 'move', position: { row: 2, col: 3 } })).toBe(finished)
  })

  it('resets to a new game', () => {
    const played = gameReducer(initGameView(), { type: 'move', position: { row: 2, col: 3 } })
    expect(gameReducer(played, { type: 'reset' })).toEqual(initGameView())
  })
})
