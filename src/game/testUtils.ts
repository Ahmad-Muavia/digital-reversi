import type { Board, Cell } from './types'

/**
 * Small deterministic random-number generator so randomised tests repeat
 * exactly. Returns numbers in [0, 1). The arithmetic stays below 2^53, so it
 * is exact in JavaScript numbers.
 */
export function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/**
 * Builds a board from 8 strings of 8 characters for readable tests:
 * `B` = black, `W` = white, `.` = empty.
 */
export function boardFromRows(rows: readonly string[]): Board {
  if (rows.length !== 8 || rows.some((r) => r.length !== 8)) {
    throw new Error('boardFromRows expects 8 rows of 8 characters')
  }
  return rows.map((row) =>
    [...row].map((ch): Cell => {
      if (ch === 'B') return 'black'
      if (ch === 'W') return 'white'
      if (ch === '.') return null
      throw new Error(`Unexpected board character "${ch}"`)
    }),
  )
}

export function boardToRows(board: Board): string[] {
  return board.map((row) =>
    row.map((cell) => (cell === 'black' ? 'B' : cell === 'white' ? 'W' : '.')).join(''),
  )
}
