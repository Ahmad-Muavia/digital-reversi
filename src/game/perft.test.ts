/**
 * Perft: count every possible move sequence from the opening position to a
 * given depth and compare with the published Othello values. Matching them
 * exactly shows move generation and captures are correct, independently of
 * our own expectations.
 */
import { describe, expect, it } from 'vitest'
import { createInitialGameState, playMove } from './game'
import { getLegalMoves } from './rules'
import type { GameState } from './types'

function perft(state: GameState, depth: number): number {
  if (depth === 0) return 1
  if (state.status === 'finished') return 0
  let total = 0
  for (const move of getLegalMoves(state.board, state.currentPlayer)) {
    total += perft(playMove(state, move), depth - 1)
  }
  return total
}

// Published Othello perft counts for depths 1-6 from the standard start
const EXPECTED = [4, 12, 56, 244, 1396, 8200]

describe('perft', () => {
  it.each(EXPECTED.map((count, i) => [i + 1, count]))(
    'depth %i has %i move sequences',
    { timeout: 60_000 },
    (depth, count) => {
      expect(perft(createInitialGameState(), depth)).toBe(count)
    },
  )
})
