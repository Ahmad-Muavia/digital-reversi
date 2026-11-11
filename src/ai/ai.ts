import { BOARD_SIZE, applyMove, countDiscs, getLegalMoves, opponentOf } from '../game'
import type { Board, Difficulty, Disc, Position } from '../game'

/**
 * Classic positional weights: corners are valuable, squares next to
 * corners are dangerous because they give the opponent the corner.
 */
export const POSITION_WEIGHTS: readonly (readonly number[])[] = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
]

export const SEARCH_DEPTH: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 4 }

const WIN_SCORE = 100_000

export type Rng = () => number

const LAST = BOARD_SIZE - 1
const CORNERS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, LAST],
  [LAST, 0],
  [LAST, LAST],
]
/** Weight for corner-adjacent squares once that corner is occupied. */
const SAFE_NEIGHBOUR_WEIGHT = 5

/**
 * Squares next to a corner are only dangerous while the corner is empty.
 * Once it is taken, they are treated as ordinary edge squares.
 */
function weightsFor(board: Board): number[][] {
  const weights = POSITION_WEIGHTS.map((row) => [...row])
  for (const [r, c] of CORNERS) {
    if (board[r][c] === null) continue
    const dr = r === 0 ? 1 : -1
    const dc = c === 0 ? 1 : -1
    weights[r + dr][c] = SAFE_NEIGHBOUR_WEIGHT
    weights[r][c + dc] = SAFE_NEIGHBOUR_WEIGHT
    weights[r + dr][c + dc] = SAFE_NEIGHBOUR_WEIGHT
  }
  return weights
}

function positionalScore(board: Board, player: Disc): number {
  const opponent = opponentOf(player)
  const weights = weightsFor(board)
  let score = 0
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = board[row][col]
      if (cell === player) score += weights[row][col]
      else if (cell === opponent) score -= weights[row][col]
    }
  }
  return score
}

/**
 * Heuristic value of `board` from `player`'s point of view.
 * Finished positions score ±WIN_SCORE plus the disc margin.
 */
export function evaluate(board: Board, player: Disc): number {
  const opponent = opponentOf(player)
  const myMoves = getLegalMoves(board, player).length
  const theirMoves = getLegalMoves(board, opponent).length
  const discs = countDiscs(board)
  const margin = discs[player] - discs[opponent]

  if (myMoves === 0 && theirMoves === 0) {
    if (margin > 0) return WIN_SCORE + margin
    if (margin < 0) return -WIN_SCORE + margin
    return 0
  }

  const mobility = 5 * (myMoves - theirMoves)
  return positionalScore(board, player) + mobility
}

/**
 * Orders moves best-first by positional weight so alpha-beta pruning
 * cuts off more of the search tree.
 */
function orderMoves(moves: Position[]): Position[] {
  return moves.sort(
    (a, b) => POSITION_WEIGHTS[b.row][b.col] - POSITION_WEIGHTS[a.row][a.col],
  )
}

/** Negamax search with alpha-beta pruning. Handles passes. */
function negamax(
  board: Board,
  player: Disc,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const moves = getLegalMoves(board, player)
  const opponent = opponentOf(player)

  if (depth === 0) return evaluate(board, player)

  if (moves.length === 0) {
    if (getLegalMoves(board, opponent).length === 0) return evaluate(board, player)
    // Pass: opponent moves on the same board
    return -negamax(board, opponent, depth - 1, -beta, -alpha)
  }

  let best = -Infinity
  for (const move of orderMoves(moves)) {
    const value = -negamax(applyMove(board, move, player), opponent, depth - 1, -beta, -alpha)
    if (value > best) best = value
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

function pickRandom<T>(items: readonly T[], rng: Rng): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
}

/**
 * Chooses a move for `player`, or `null` if there is no legal move.
 * - easy: a random legal move
 * - medium: the best move one move ahead (position and mobility)
 * - hard: four-move lookahead with alpha-beta pruning
 * Ties are broken randomly so games vary.
 */
export function chooseMove(
  board: Board,
  player: Disc,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): Position | null {
  const moves = getLegalMoves(board, player)
  if (moves.length === 0) return null
  if (moves.length === 1) return moves[0]

  const depth = SEARCH_DEPTH[difficulty]
  if (depth === 0) return pickRandom(moves, rng)

  const opponent = opponentOf(player)
  let bestValue = -Infinity
  let best: Position[] = []
  for (const move of orderMoves(moves)) {
    const next = applyMove(board, move, player)
    // Search each root move with a window just below the best value so far;
    // moves that tie the best are still found, so random tie-breaking works.
    const value =
      depth === 1
        ? evaluate(next, player)
        : -negamax(next, opponent, depth - 1, -Infinity, -(bestValue - 1))
    if (value > bestValue) {
      bestValue = value
      best = [move]
    } else if (value === bestValue) {
      best.push(move)
    }
  }
  return pickRandom(best, rng)
}
