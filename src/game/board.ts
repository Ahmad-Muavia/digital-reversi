import type { Board, Cell, Disc, Position, Score } from './types'

export const BOARD_SIZE = 8

/** Standard Reversi opening: white on d4/e5, black on e4/d5. */
const INITIAL_DISCS: readonly (Position & { disc: Disc })[] = [
  { row: 3, col: 3, disc: 'white' },
  { row: 3, col: 4, disc: 'black' },
  { row: 4, col: 3, disc: 'black' },
  { row: 4, col: 4, disc: 'white' },
]

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): Cell => null),
  )
}

export function createInitialBoard(): Board {
  const board = createEmptyBoard().map((row) => [...row])
  for (const { row, col, disc } of INITIAL_DISCS) {
    board[row][col] = disc
  }
  return board
}

export function isOnBoard({ row, col }: Position): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE
  )
}

export function getCell(board: Board, position: Position): Cell {
  if (!isOnBoard(position)) {
    throw new RangeError(
      `Position (${position.row}, ${position.col}) is outside the board`,
    )
  }
  return board[position.row][position.col]
}

export function opponentOf(disc: Disc): Disc {
  return disc === 'black' ? 'white' : 'black'
}

export function countDiscs(board: Board): Score {
  let black = 0
  let white = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell === 'black') black++
      else if (cell === 'white') white++
    }
  }
  return { black, white }
}

/** Algebraic label for a square, e.g. row 0 col 0 → "a1". */
export function positionLabel({ row, col }: Position): string {
  return `${String.fromCharCode(97 + col)}${row + 1}`
}
