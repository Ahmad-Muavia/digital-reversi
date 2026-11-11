import { describe, expect, it } from 'vitest'
import { createEmptyBoard, createInitialBoard, positionLabel } from './board'
import { getFlips, getLegalMoves, hasLegalMove, isLegalMove } from './rules'
import { boardFromRows } from './testUtils'

const labels = (positions: { row: number; col: number }[]) =>
  positions.map(positionLabel).sort()

describe('getLegalMoves', () => {
  it('gives black the four standard opening moves', () => {
    expect(labels(getLegalMoves(createInitialBoard(), 'black'))).toEqual([
      'c4',
      'd3',
      'e6',
      'f5',
    ])
  })

  it('gives white the four mirrored opening moves', () => {
    expect(labels(getLegalMoves(createInitialBoard(), 'white'))).toEqual([
      'c5',
      'd6',
      'e3',
      'f4',
    ])
  })

  it('returns no moves on an empty board', () => {
    expect(getLegalMoves(createEmptyBoard(), 'black')).toEqual([])
  })

  it('returns no moves on a full board', () => {
    const full = boardFromRows(Array(8).fill('BBBBWWWW'))
    expect(getLegalMoves(full, 'black')).toEqual([])
    expect(getLegalMoves(full, 'white')).toEqual([])
  })

  it('returns no moves when the player has no discs left', () => {
    const board = boardFromRows([
      '........',
      '........',
      '........',
      '...WW...',
      '...WW...',
      '........',
      '........',
      '........',
    ])
    expect(getLegalMoves(board, 'black')).toEqual([])
  })
})

describe('getFlips', () => {
  it('captures a single disc in one direction', () => {
    const flips = getFlips(createInitialBoard(), { row: 2, col: 3 }, 'black') // d3
    expect(labels(flips)).toEqual(['d4'])
  })

  it('captures in several directions at once', () => {
    const board = boardFromRows([
      'B.B.B...',
      '.WWW....',
      'BW.WB...',
      '.WWW....',
      'B.B.B...',
      '........',
      '........',
      '........',
    ])
    const flips = getFlips(board, { row: 2, col: 2 }, 'black') // c3
    expect(flips).toHaveLength(8)
  })

  it('captures a long line of discs', () => {
    const board = boardFromRows([
      '.WWWWWWB',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    expect(getFlips(board, { row: 0, col: 0 }, 'black')).toHaveLength(6)
  })

  it('does not capture a line that reaches the edge without a bracketing disc', () => {
    const board = boardFromRows([
      '.WWWWWWW',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    expect(getFlips(board, { row: 0, col: 0 }, 'black')).toEqual([])
  })

  it('does not capture across an empty gap', () => {
    const board = boardFromRows([
      '.W.B....',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    expect(getFlips(board, { row: 0, col: 0 }, 'black')).toEqual([])
  })

  it('does not capture when the adjacent disc is the player’s own', () => {
    const board = boardFromRows([
      '.BWB....',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    expect(getFlips(board, { row: 0, col: 0 }, 'black')).toEqual([])
  })

  it('returns no flips for an occupied square', () => {
    expect(getFlips(createInitialBoard(), { row: 3, col: 3 }, 'black')).toEqual([])
  })

  it.each([
    { row: -1, col: 0 },
    { row: 0, col: 8 },
    { row: 2.5, col: 3 },
  ])('returns no flips for an off-board position %o', (position) => {
    expect(getFlips(createInitialBoard(), position, 'black')).toEqual([])
  })
})

describe('isLegalMove', () => {
  it('accepts a capturing move', () => {
    expect(isLegalMove(createInitialBoard(), { row: 2, col: 3 }, 'black')).toBe(true)
  })

  it('rejects a move that captures nothing', () => {
    expect(isLegalMove(createInitialBoard(), { row: 0, col: 0 }, 'black')).toBe(false)
  })

  it('rejects a move adjacent to opponents but not bracketing them', () => {
    // c3 touches d4 (white) diagonally but e5 is also white, so nothing is bracketed
    expect(isLegalMove(createInitialBoard(), { row: 2, col: 2 }, 'black')).toBe(false)
  })
})

describe('hasLegalMove', () => {
  it('agrees with getLegalMoves', () => {
    expect(hasLegalMove(createInitialBoard(), 'black')).toBe(true)
    expect(hasLegalMove(createEmptyBoard(), 'white')).toBe(false)
  })
})
