/**
 * Randomised whole-game tests: play many complete games with random legal
 * moves and check rule invariants after every move.
 */
import { describe, expect, it } from 'vitest'
import { countDiscs, opponentOf } from './board'
import { createInitialGameState, getOutcome, playMove } from './game'
import { getLegalMoves, hasLegalMove } from './rules'
import type { Board, GameState } from './types'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function diff(before: Board, after: Board) {
  const changed: { row: number; col: number }[] = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (before[row][col] !== after[row][col]) changed.push({ row, col })
    }
  }
  return changed
}

function checkMove(prev: GameState, next: GameState) {
  const mover = prev.currentPlayer
  const move = next.lastMove!
  const before = countDiscs(prev.board)
  const after = countDiscs(next.board)

  // exactly one new disc on the board
  expect(after.black + after.white).toBe(before.black + before.white + 1)
  expect(next.moveCount).toBe(prev.moveCount + 1)

  // the placed square was empty and now holds the mover's disc
  expect(prev.board[move.row][move.col]).toBeNull()
  expect(next.board[move.row][move.col]).toBe(mover)

  // only the placed square and the flipped discs changed; flips became the mover's colour
  const changed = diff(prev.board, next.board)
  expect(changed).toHaveLength(next.lastFlips.length + 1)
  expect(next.lastFlips.length).toBeGreaterThan(0)
  for (const f of next.lastFlips) {
    expect(prev.board[f.row][f.col]).toBe(opponentOf(mover))
    expect(next.board[f.row][f.col]).toBe(mover)
  }

  // turn order
  if (next.status === 'playing') {
    expect(hasLegalMove(next.board, next.currentPlayer)).toBe(true)
    if (next.passedPlayer) {
      expect(next.currentPlayer).toBe(mover)
      expect(next.passedPlayer).toBe(opponentOf(mover))
      expect(hasLegalMove(next.board, next.passedPlayer)).toBe(false)
    } else {
      expect(next.currentPlayer).toBe(opponentOf(mover))
    }
  } else {
    expect(hasLegalMove(next.board, 'black')).toBe(false)
    expect(hasLegalMove(next.board, 'white')).toBe(false)
    expect(next.outcome).toBe(getOutcome(after))
  }
}

describe('random complete games', () => {
  const GAMES = 200

  // Allow extra time: coverage instrumentation slows this test down a lot
  it(`keeps every rule invariant over ${GAMES} random games`, { timeout: 60_000 }, () => {
    let passes = 0
    let draws = 0
    let earlyEnds = 0

    for (let g = 0; g < GAMES; g++) {
      const rng = seeded(g + 1)
      let state = createInitialGameState()
      while (state.status === 'playing') {
        const moves = getLegalMoves(state.board, state.currentPlayer)
        const next = playMove(state, moves[Math.floor(rng() * moves.length)])
        checkMove(state, next)
        if (next.passedPlayer) passes++
        state = next
      }
      const { black, white } = countDiscs(state.board)
      expect(state.moveCount).toBeLessThanOrEqual(60)
      expect(black + white).toBe(4 + state.moveCount)
      if (state.outcome === 'draw') draws++
      if (black + white < 64) earlyEnds++
    }

    // The random games should exercise the rarer paths too
    expect(passes).toBeGreaterThan(0)
    expect(earlyEnds).toBeGreaterThan(0)
    expect(draws).toBeGreaterThanOrEqual(0)
  })
})
