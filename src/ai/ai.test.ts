import { describe, expect, it } from 'vitest'
import {
  countDiscs,
  createInitialBoard,
  createInitialGameState,
  getLegalMoves,
  isLegalMove,
  playMove,
  positionLabel,
} from '../game'
import type { Difficulty, Disc, GameState } from '../game'
import { boardFromRows } from '../game/testUtils'
import { chooseMove, evaluate } from './ai'

/** Small deterministic PRNG so tests are repeatable. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function playGame(
  black: (state: GameState) => ReturnType<typeof chooseMove>,
  white: (state: GameState) => ReturnType<typeof chooseMove>,
): GameState {
  let state = createInitialGameState()
  while (state.status === 'playing') {
    const move = (state.currentPlayer === 'black' ? black : white)(state)
    expect(move).not.toBeNull()
    state = playMove(state, move!)
  }
  return state
}

const ai = (difficulty: Difficulty, rng: () => number) => (s: GameState) =>
  chooseMove(s.board, s.currentPlayer, difficulty, rng)

describe('chooseMove', () => {
  it.each<Difficulty>(['easy', 'medium', 'hard'])('returns a legal move on %s', (difficulty) => {
    const board = createInitialBoard()
    const move = chooseMove(board, 'black', difficulty, seeded(1))
    expect(move).not.toBeNull()
    expect(isLegalMove(board, move!, 'black')).toBe(true)
  })

  it('returns null when there is no legal move', () => {
    const board = boardFromRows(Array(8).fill('BBBBBBBB'))
    for (const d of ['easy', 'medium', 'hard'] as const) {
      expect(chooseMove(board, 'white', d)).toBeNull()
    }
  })

  it('plays the only legal move without searching', () => {
    const board = boardFromRows([
      'BW......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    expect(chooseMove(board, 'black', 'hard')).toEqual({ row: 0, col: 2 })
  })

  it('easy picks different moves depending on chance', () => {
    const board = createInitialBoard()
    const picks = new Set(
      [0, 0.3, 0.6, 0.99].map((r) => positionLabel(chooseMove(board, 'black', 'easy', () => r)!)),
    )
    expect(picks.size).toBe(4)
  })

  it('hard takes a corner the opponent could otherwise take next move', () => {
    // Both colours can play a1: black captures b2, white captures a2.
    const board = boardFromRows([
      '..W.....',
      'BW......',
      'W.B.....',
      '...WB...',
      '...BW...',
      '........',
      '........',
      '........',
    ])
    expect(getLegalMoves(board, 'white').map(positionLabel)).toContain('a1')
    expect(positionLabel(chooseMove(board, 'black', 'hard', seeded(7))!)).toBe('a1')
  })

  it.each<Difficulty>(['medium'])('%s takes an available corner', (difficulty) => {
    // Black can take the a1 corner (capturing b2) among other moves.
    const board = boardFromRows([
      '..W.....',
      '.W......',
      '..B.....',
      '...WB...',
      '...BW...',
      '........',
      '........',
      '........',
    ])
    const moves = getLegalMoves(board, 'black').map(positionLabel)
    expect(moves).toContain('a1')
    expect(positionLabel(chooseMove(board, 'black', difficulty, seeded(7))!)).toBe('a1')
  })

  it('hard avoids giving away a corner when a safe move exists', () => {
    // b2 (next to the empty a1 corner) is legal but lets white take a1.
    const board = boardFromRows([
      '........',
      '..W.....',
      '..WB....',
      '...WB...',
      '...BW...',
      '........',
      '........',
      '........',
    ])
    const choice = positionLabel(chooseMove(board, 'black', 'hard', seeded(3))!)
    expect(choice).not.toBe('b2')
  })
})

describe('evaluate', () => {
  it('is symmetric between the players', () => {
    const board = boardFromRows([
      'B.......',
      '.W......',
      '..WB....',
      '...WB...',
      '...BW...',
      '........',
      '........',
      '.......W',
    ])
    expect(evaluate(board, 'black') + evaluate(board, 'white')).toBe(0)
    expect(evaluate(board, 'black')).not.toBe(0)
  })

  it('scores a won finished position very highly', () => {
    const board = boardFromRows(Array(8).fill('BBBBBBBB'))
    expect(evaluate(board, 'black')).toBeGreaterThan(50_000)
    expect(evaluate(board, 'white')).toBeLessThan(-50_000)
  })

  it('scores a drawn finished position as zero', () => {
    expect(evaluate(boardFromRows(Array(8).fill('BBBBWWWW')), 'black')).toBe(0)
  })
})

describe('strength', () => {
  function winsOutOf(
    strong: Difficulty,
    weak: Difficulty,
    games: number,
  ): { wins: number; results: string[] } {
    let wins = 0
    const results: string[] = []
    for (let i = 0; i < games; i++) {
      const strongColour: Disc = i % 2 === 0 ? 'black' : 'white'
      const rng = seeded(100 + i)
      const strongAi = ai(strong, rng)
      const weakAi = ai(weak, rng)
      const final = strongColour === 'black' ? playGame(strongAi, weakAi) : playGame(weakAi, strongAi)
      const score = countDiscs(final.board)
      if (final.outcome === strongColour) wins++
      results.push(`${strongColour} ${score.black}-${score.white}`)
    }
    return { wins, results }
  }

  it('medium beats easy in most games', () => {
    const { wins, results } = winsOutOf('medium', 'easy', 10)
    expect(wins, results.join(', ')).toBeGreaterThanOrEqual(7)
  })

  // Four seeded games (two as each colour). Hard currently wins all four by wide
  // margins; the generous timeout covers slow CI machines running with coverage.
  it('hard beats medium in most games', { timeout: 120_000 }, () => {
    const { wins, results } = winsOutOf('hard', 'medium', 4)
    expect(wins, results.join(', ')).toBeGreaterThanOrEqual(3)
  })

  it('hard chooses a move quickly from the opening', () => {
    const start = performance.now()
    chooseMove(createInitialBoard(), 'black', 'hard', seeded(5))
    expect(performance.now() - start).toBeLessThan(1000)
  })
})
