import type { Board, Cell } from './types'

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
