import { countDiscs, createInitialBoard, opponentOf, positionLabel } from './board'
import { getFlips, hasLegalMove } from './rules'
import type { Board, Disc, GameOutcome, GameState, Position, Score } from './types'

export class IllegalMoveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IllegalMoveError'
  }
}

/** Black always moves first in Reversi. */
export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: 'black',
    status: 'playing',
    outcome: null,
    lastMove: null,
    lastFlips: [],
    passedPlayer: null,
    moveCount: 0,
  }
}

/**
 * Places `player`'s disc at `position` and flips the captured discs.
 * Returns a new board; the input is not modified.
 * Throws `IllegalMoveError` if the move captures nothing.
 */
export function applyMove(board: Board, position: Position, player: Disc): Board {
  const flips = getFlips(board, position, player)
  if (flips.length === 0) {
    throw new IllegalMoveError(`${positionLabel(position)} is not a legal move for ${player}`)
  }
  const next = board.map((row) => [...row])
  next[position.row][position.col] = player
  for (const { row, col } of flips) {
    next[row][col] = player
  }
  return next
}

export function getOutcome(score: Score): GameOutcome {
  if (score.black > score.white) return 'black'
  if (score.white > score.black) return 'white'
  return 'draw'
}

/**
 * Plays a move for the current player and works out whose turn is next:
 * - the opponent, if they have a legal move;
 * - otherwise the same player again (the opponent passes);
 * - otherwise nobody — the game is finished.
 */
export function playMove(state: GameState, position: Position): GameState {
  if (state.status === 'finished') {
    throw new IllegalMoveError('The game is already finished')
  }

  const player = state.currentPlayer
  const flips = getFlips(state.board, position, player)
  if (flips.length === 0) {
    throw new IllegalMoveError(`${positionLabel(position)} is not a legal move for ${player}`)
  }

  const board = applyMove(state.board, position, player)
  const opponent = opponentOf(player)
  const base = {
    board,
    lastMove: position,
    lastFlips: flips,
    moveCount: state.moveCount + 1,
  }

  if (hasLegalMove(board, opponent)) {
    return { ...base, currentPlayer: opponent, status: 'playing', outcome: null, passedPlayer: null }
  }

  if (hasLegalMove(board, player)) {
    return { ...base, currentPlayer: player, status: 'playing', outcome: null, passedPlayer: opponent }
  }

  return {
    ...base,
    currentPlayer: player,
    status: 'finished',
    outcome: getOutcome(countDiscs(board)),
    passedPlayer: null,
  }
}
