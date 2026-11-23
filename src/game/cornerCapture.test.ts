/**
 * Additional deterministic regression cases for D3 REQ-RULE-02 / NFR05.
 * These check corner captures and guard against accidental row wrapping.
 */
import { describe, expect, it } from 'vitest'
import { applyMove } from './game'
import { getFlips, isLegalMove } from './rules'
import { boardFromRows, boardToRows } from './testUtils'

const cornerBoard = () => boardFromRows([
  '.WWB....',
  'WW......',
  'W.W.....',
  'B..B....',
  '........',
  '........',
  '........',
  '........',
])

const sortedPositions = (positions: readonly { row: number; col: number }[]) =>
  positions.map(({ row, col }) => `${row},${col}`).sort()

describe('corner and boundary capture regression cases', () => {
  it('captures horizontal, vertical and diagonal lines from a1 in one move', () => {
    const board = cornerBoard()
    const snapshot = boardToRows(board)
    const position = { row: 0, col: 0 }
    expect(sortedPositions(getFlips(board, position, 'black'))).toEqual(
      ['0,1', '0,2', '1,0', '1,1', '2,0', '2,2'],
    )

    const next = applyMove(board, position, 'black')
    expect(next[0][0]).toBe('black')
    for (const [row, col] of [[0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 2]]) {
      expect(next[row][col]).toBe('black')
    }
    expect(boardToRows(board)).toEqual(snapshot) // input board is immutable
  })

  it('handles the mirrored bottom-right corner in the same way', () => {
    const mirrored = boardFromRows(boardToRows(cornerBoard()).map((s) => s.split('').reverse().join('')).reverse())
    const position = { row: 7, col: 7 }
    expect(getFlips(mirrored, position, 'black')).toHaveLength(6)
    const next = applyMove(mirrored, position, 'black')
    expect(next[7][7]).toBe('black')
    expect(next[7][6]).toBe('black')
    expect(next[6][6]).toBe('black')
  })

  it('does not wrap a horizontal capture from h1 into the next row', () => {
    const board = boardFromRows([
      '........',
      'WB......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    expect(getFlips(board, { row: 0, col: 7 }, 'black')).toEqual([])
    expect(isLegalMove(board, { row: 0, col: 7 }, 'black')).toBe(false)
  })

  it('does not invent diagonal captures through an empty gap', () => {
  const board = boardFromRows([
    '........',
    '.W......',
    '........',
    '...B....',
    '........',
    '........',
    '........',
    '........',
  ])
  expect(getFlips(board, { row: 0, col: 0 }, 'black')).toEqual([])
  expect(isLegalMove(board, { row: 0, col: 0 }, 'black')).toBe(false)
})
})
