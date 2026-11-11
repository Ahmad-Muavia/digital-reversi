import { BOARD_SIZE, isOnBoard, opponentOf } from './board'
import type { Board, Disc, Position } from './types'

/** The eight compass directions as [rowStep, colStep]. */
export const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

/**
 * Opponent discs that `player` would capture by placing a disc at `position`.
 * Returns an empty array when the move is illegal (off board, occupied, or
 * no line of opponent discs bracketed by one of the player's own discs).
 */
export function getFlips(board: Board, position: Position, player: Disc): Position[] {
  if (!isOnBoard(position) || board[position.row][position.col] !== null) {
    return []
  }

  const opponent = opponentOf(player)
  const flips: Position[] = []

  for (const [dr, dc] of DIRECTIONS) {
    const line: Position[] = []
    let row = position.row + dr
    let col = position.col + dc

    while (isOnBoard({ row, col }) && board[row][col] === opponent) {
      line.push({ row, col })
      row += dr
      col += dc
    }

    if (line.length > 0 && isOnBoard({ row, col }) && board[row][col] === player) {
      flips.push(...line)
    }
  }

  return flips
}

export function isLegalMove(board: Board, position: Position, player: Disc): boolean {
  return getFlips(board, position, player).length > 0
}

/** Every legal move for `player`, in row-major order. */
export function getLegalMoves(board: Board, player: Disc): Position[] {
  const moves: Position[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isLegalMove(board, { row, col }, player)) {
        moves.push({ row, col })
      }
    }
  }
  return moves
}

export function hasLegalMove(board: Board, player: Disc): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isLegalMove(board, { row, col }, player)) return true
    }
  }
  return false
}
