import { positionLabel } from '../../game'
import type { Disc, GameState } from '../../game'

/** Sentence describing the last move, for screen readers. */
export function describeLastMove(game: GameState, names: Record<Disc, string>): string {
  if (!game.lastMove) return ''
  const mover = game.board[game.lastMove.row][game.lastMove.col]
  if (!mover) return ''
  const flips = game.lastFlips.length
  return `${names[mover]} played ${positionLabel(game.lastMove)} and flipped ${flips} ${
    flips === 1 ? 'disc' : 'discs'
  }.`
}
